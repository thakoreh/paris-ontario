#!/usr/bin/env python3
"""Brant Events discovery and held drafts only. Standard library; dry-run by default."""
import argparse
import datetime as dt
import fcntl
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

try:
    from scripts import editorial_rules as rules
    from scripts.official_publisher import NoRedirect, Supabase, clean
except ModuleNotFoundError:
    import editorial_rules as rules
    from official_publisher import NoRedirect, Supabase, clean

UTC = dt.timezone.utc
ROBOTS_URL = 'https://brantevents.org/robots.txt'
USER_AGENT = 'ParisPulseBot/1.0 (+https://parispulse.ca)'
UA_TOKEN = 'ParisPulseBot'
ROBOTS_MAX_BYTES = 64 * 1024
FEED_URL = 'https://brantevents.org/events.rss'
BRANT_EVENTS_SOURCE_ID = 'cbaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
COMMUNITY_ID = '00000000-0000-4000-8000-000000000001'
MAX_PAGES = 40
MAX_BYTES = 2 * 1024 * 1024
STATE_DIR = Path(os.environ.get('PARIS_PULSE_STATE_DIR') or Path.home() / '.hermes' / 'paris-pulse-publisher') / 'events'
ATTRIBUTION = ' Details and changes: Brant Events.'


def redact_url_details(value):
    """Remove query/fragment contents from URLs and exception text before recording."""
    return re.sub(r"([?#])[^\s'\"<>]*", r"\1[redacted]", value)


def event_slug(url):
    if not isinstance(url, str):
        return None
    match = re.fullmatch(r'https://brantevents\.org/events/([a-z0-9-]+)/', url)
    return match.group(1) if match else None


def allowed(url):
    return url == FEED_URL or event_slug(url) is not None


def fetch(url):
    if url != ROBOTS_URL and not allowed(url):
        raise ValueError('Source URL outside fixed allowlist')
    req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
    with urllib.request.build_opener(NoRedirect()).open(req, timeout=12) as response:
        if response.status != 200 or response.geturl() != url:
            raise ValueError('Source non-200 or redirect rejected')
        limit = ROBOTS_MAX_BYTES if url == ROBOTS_URL else MAX_BYTES
        if url == ROBOTS_URL:
            media_type = response.headers.get_content_type()
            if media_type != 'text/plain':
                raise ValueError('Robots must be text/plain')
        content = response.read(limit + 1)
        if len(content) > limit:
            raise ValueError('Source too large')
        return content.decode('utf-8', 'strict')


def normalize_robots_path(value):
    """Normalize RFC 9309 path octets while preserving wildcard operators."""
    unreserved = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'

    def normalize_token(match):
        token = match.group()
        if token.startswith('%'):
            char = chr(int(token[1:], 16))
            return char if char in unreserved else token.upper()
        return ''.join(f'%{byte:02X}' for byte in token.encode('utf-8'))

    return re.sub(r'%[0-9A-Fa-f]{2}|[^\x21-\x7e]', normalize_token, value)


class RobotsPolicy:
    """Match normalized path/query rules in selected RFC 9309 agent groups."""

    def __init__(self, groups):
        self.groups = groups

    def selected_groups(self, agent):
        token = agent.split('/', 1)[0].lower()
        specific = [group for group in self.groups if token in group['agents']]
        return specific or [group for group in self.groups if '*' in group['agents']]

    def can_fetch(self, agent, url):
        parts = urllib.parse.urlsplit(url)
        target = (parts.path or '/') + ('?' + parts.query if parts.query else '')
        target = normalize_robots_path(target)
        matches = []
        for group in self.selected_groups(agent):
            for allow, rule in group['rules']:
                if not rule:
                    continue
                rule = normalize_robots_path(rule)
                anchored = rule.endswith('$')
                pattern = rule[:-1] if anchored else rule
                expression = '.*'.join(re.escape(part) for part in pattern.split('*'))
                if re.match(expression + (r'\Z' if anchored else ''), target):
                    specificity = len(pattern.replace('*', '').encode('utf-8'))
                    matches.append((specificity, allow))
        return max(matches)[1] if matches else True

    def crawl_delay(self, agent):
        return max((group['delay'] for group in self.selected_groups(agent)), default=0)


def robots_policy(text):
    """Validate strictly and parse groups without normalising rule strings."""
    if (not isinstance(text, str) or len(text.encode('utf-8')) > ROBOTS_MAX_BYTES
            or any(ord(c) < 32 and c not in '\t\r\n' for c in text)
            or any(c in text for c in '<>') or '\x7f' in text):
        raise ValueError('Invalid robots text')
    groups = []
    group = None
    has_rule = False
    group_started = False
    for raw in text.splitlines():
        line = raw.split('#', 1)[0].strip()
        if not line:
            continue
        key, separator, value = line.partition(':')
        key, value = key.strip().lower(), value.strip()
        if not separator or not re.fullmatch(r'[a-z-]+', key):
            raise ValueError('Invalid robots directive')
        if key == 'user-agent':
            if not re.fullmatch(r'[A-Za-z0-9_*.-]+', value):
                raise ValueError('Invalid robots agent')
            if group is None or group_started:
                group = {'agents': [], 'rules': [], 'delay': 0}
                groups.append(group)
                group_started = False
            group['agents'].append(value.lower())
        elif key in ('allow', 'disallow', 'crawl-delay'):
            if group is None:
                raise ValueError('Robots rule without agent')
            group_started = True
            if key == 'crawl-delay':
                if not re.fullmatch(r'[0-9]+', value):
                    raise ValueError('Invalid crawl delay')
                group['delay'] = max(group['delay'], int(value))
            else:
                if value and not value.startswith('/'):
                    raise ValueError('Invalid robots path')
                group['rules'].append((key == 'allow', value))
                has_rule = True
    if not groups or not has_rule:
        raise ValueError('No parsable robots rules')
    policy = RobotsPolicy(groups)
    delay = max(1, policy.crawl_delay(UA_TOKEN))
    if delay > 30:
        raise ValueError('Crawl delay exceeds bounded run')
    return policy, delay


class JsonLD(HTMLParser):
    def __init__(self):
        super().__init__()
        self.active = False
        self.parts = []
        self.blocks = []

    def handle_starttag(self, tag, attrs):
        if tag == 'script':
            self.active = dict(attrs).get('type', '').lower() == 'application/ld+json'
            self.parts = []

    def handle_data(self, data):
        if self.active:
            self.parts.append(data)

    def handle_endtag(self, tag):
        if tag == 'script' and self.active:
            self.blocks.append(''.join(self.parts))
            self.active = False


def parse_event(page):
    parser = JsonLD()
    parser.feed(page)
    def events(value):
        if isinstance(value, list):
            for child in value:
                yield from events(child)
        elif isinstance(value, dict):
            types = value.get('@type', [])
            if isinstance(types, str):
                types = [types]
            if any(t in ('Event', 'https://schema.org/Event', 'http://schema.org/Event') for t in types):
                yield value
            if '@graph' in value:
                yield from events(value['@graph'])
    found = [event for block in parser.blocks for event in events(json.loads(block))]
    if len(found) != 1:
        raise ValueError('Expected exactly one schema.org Event')
    return found[0]


def source_text(value):
    if isinstance(value, str):
        return clean(value)
    if isinstance(value, dict):
        return ', '.join(source_text(value.get(k)) for k in
                         ('name', 'streetAddress', 'addressLocality', 'addressRegion', 'postalCode', 'addressCountry')
                         if source_text(value.get(k)))
    return ''


def timestamp(value):
    if not isinstance(value, str) or not value.strip():
        raise ValueError('Missing/invalid date')
    result = dt.datetime.fromisoformat(value)
    # Do not guess a timezone for ambiguous source timestamps.
    if result.tzinfo is None:
        raise ValueError('Date lacks timezone')
    return result.astimezone(UTC)


def review(url, page, now):
    slug = event_slug(url)
    if slug is None:
        raise ValueError('Event URL outside fixed allowlist')
    event = parse_event(page)
    title = source_text(event.get('name'))
    description = source_text(event.get('description'))[:400]
    location = event.get('location', {})
    if not isinstance(location, dict):
        location = {}
    address = source_text(location.get('address'))
    locality = address + ' ' + source_text(location.get('name'))
    extra = []
    start = end = None
    try:
        start = timestamp(event.get('startDate'))
    except (ValueError, TypeError, OverflowError):
        extra.append('missing_date' if not event.get('startDate') else 'parse_failure')
    if event.get('endDate'):
        try:
            end = timestamp(event['endDate'])
        except (ValueError, TypeError, OverflowError):
            extra.append('parse_failure')
    if start:
        if (end or start) < now:
            extra.append('event_ended')
        if start > now + dt.timedelta(days=120):
            extra.append('stale_or_future')
        if end and end < start:
            extra.append('parse_failure')
    decision = rules.decide({
        'kind': 'event', 'authority_level': 'community_signal', 'category_text': 'event',
        'locality_text': locality, 'sensitive_text': title + ' ' + description,
        'parse_ok': bool(title) and 'parse_failure' not in extra,
        'starts_at': start.isoformat() if start else event.get('startDate'),
        'now': now, 'excerpt': description,
    })
    reasons = list(dict.fromkeys([*decision.reasons, *extra]))
    row = {
        'community_id': COMMUNITY_ID, 'source_id': BRANT_EVENTS_SOURCE_ID,
        'external_id': 'brant-events:' + slug, 'slug': 'brant-events-' + slug,
        'title': title, 'summary': description + ATTRIBUTION, 'category': 'event',
        'severity': 'info', 'official_url': url, 'is_sample': False,
        'verification_status': 'draft', 'verified_at': None,
        'start_at': start.isoformat() if start else None,
        'end_at': end.isoformat() if end else None,
        'address_text': address, 'city': 'Paris' if rules.mentions_paris(locality) else '',
        'tags_json': ['brant-events', 'source-attribution:brantevents.org', 'held-for-review', *reasons],
        # Retain parsed source fields without inventing organizer or source URLs.
        'body': json.dumps({'location': location, 'organizer': event.get('organizer'),
                            'url': event.get('url'), 'source': url}, ensure_ascii=False),
    }
    return row, {'url': redact_url_details(url), 'title': title, 'starts_at': row['start_at'],
                 'decision': 'hold', 'reasons': reasons}


class HeldDraftStore(Supabase):
    def source_ready(self):
        rows = self.request('official_sources', urllib.parse.urlencode({
            'select': 'id,authority_level,active,url', 'id': 'eq.' + BRANT_EVENTS_SOURCE_ID}))
        return (len(rows) == 1 and rows[0].get('active') is True
                and rows[0].get('authority_level') == 'community_signal'
                and rows[0].get('url') == 'https://brantevents.org/')

    def write_held(self, row):
        slug = event_slug(row.get('official_url'))
        if (not slug or row.get('external_id') != 'brant-events:' + slug
                or row.get('source_id') != BRANT_EVENTS_SOURCE_ID
                or row.get('verification_status') != 'draft' or row.get('verified_at') is not None
                or row.get('is_sample') is not False
                or 'untrusted_source' not in row.get('tags_json', [])):
            raise ValueError('Held draft gate failed')
        if not self.source_ready():
            raise ValueError('Source registry mismatch')
        query = urllib.parse.urlencode({'select': 'id', 'source_id': 'eq.' + BRANT_EVENTS_SOURCE_ID,
                                       'external_id': 'eq.' + row['external_id'], 'limit': 1})
        if self.request('notices', query):
            return False
        created = self.create(row)
        actual = self.request('notices', urllib.parse.urlencode({'select': '*', 'id': 'eq.' + created['id']}))
        if len(actual) != 1 or any(actual[0].get(k) != v for k, v in row.items()):
            raise RuntimeError('Draft readback failed')
        return True


def run(write_held_drafts=False, *, fetcher=fetch, sleep=time.sleep, now=None,
        state_dir=STATE_DIR, max_pages=MAX_PAGES, record_checks=True):
    now = now or dt.datetime.now(UTC)
    outcome = {'found': 0, 'candidates': [], 'errors': [], 'created': 0,
               'at': now.isoformat(), 'mode': 'held-drafts' if write_held_drafts else 'dry-run'}
    state_dir = Path(state_dir)
    state_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
    try:
        with (state_dir / 'lock').open('a') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            if not isinstance(max_pages, int) or not 1 <= max_pages <= MAX_PAGES:
                raise ValueError('Page cap must be between 1 and 40')
            try:
                policy, delay = robots_policy(fetcher(ROBOTS_URL))
            except Exception as error:
                raise ValueError('robots.txt unavailable or malformed') from error
            if not policy.can_fetch(UA_TOKEN, FEED_URL):
                raise ValueError('robots.txt disallowed: ' + FEED_URL)
            db = None
            if write_held_drafts:
                db = HeldDraftStore(os.environ.get('NEXT_PUBLIC_SUPABASE_URL', ''),
                                    os.environ.get('SUPABASE_SERVICE_ROLE_KEY', ''))
            sleep(delay)  # Robots -> RSS also honours the selected crawl delay.
            feed = fetcher(FEED_URL)
            outcome['fetched'] = True
            root = ET.fromstring(feed)
            items = root.findall('./channel/item')
            if root.tag != 'rss' or not items:
                raise ValueError('Expected nonempty RSS discovery feed')
            urls = []
            for item in items:
                url = (item.findtext('link') or '').strip()
                if event_slug(url) is None:
                    outcome['errors'].append({'url': redact_url_details(url), 'error': 'URL outside fixed allowlist'})
                elif url not in urls:
                    urls.append(url)
            outcome['found'] = len(urls)
            for url in urls[:max_pages]:
                if not policy.can_fetch(UA_TOKEN, url):
                    outcome['errors'].append({'url': redact_url_details(url), 'error': 'robots.txt disallowed'})
                    continue
                try:
                    sleep(delay)  # Includes failed requests.
                    row, candidate = review(url, fetcher(url), now)
                    outcome['candidates'].append(candidate)
                    if db:
                        outcome['created'] += int(db.write_held(row))
                except Exception as error:
                    outcome['errors'].append({'url': redact_url_details(url), 'error': type(error).__name__ + ': ' + redact_url_details(str(error))[:180]})
            if db and record_checks:
                db.request('ingestion_runs', method='POST', payload={
                    'source_id': BRANT_EVENTS_SOURCE_ID, 'started_at': outcome['at'],
                    'completed_at': dt.datetime.now(UTC).isoformat(),
                    'status': 'partial' if outcome['errors'] else 'success',
                    'records_found': outcome['found'], 'records_created': outcome['created'],
                    'records_failed': len(outcome['errors'])})
            with (state_dir / 'audit.jsonl').open('a') as audit:
                audit.write(json.dumps(outcome, sort_keys=True) + '\n')
    except Exception as error:
        outcome['errors'].append({'error': type(error).__name__ + ': ' + redact_url_details(str(error))[:180]})
        with (state_dir / 'audit.jsonl').open('a') as audit:
            audit.write(json.dumps(outcome, sort_keys=True) + '\n')
    return outcome


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write-held-drafts', action='store_true')
    args = parser.parse_args()
    result = run(args.write_held_drafts)
    print(json.dumps(result, indent=2))
    raise SystemExit(1 if result['errors'] else 0)
