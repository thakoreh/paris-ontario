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
FEED_URL = 'https://brantevents.org/events.rss'
BRANT_EVENTS_SOURCE_ID = 'cbaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
COMMUNITY_ID = '00000000-0000-4000-8000-000000000001'
MAX_PAGES = 40
MAX_BYTES = 2 * 1024 * 1024
STATE_DIR = Path(__file__).resolve().parents[1] / '.events-ingest-state'
ATTRIBUTION = ' Details and changes: Brant Events.'


def event_slug(url):
    if not isinstance(url, str):
        return None
    match = re.fullmatch(r'https://brantevents\.org/events/([a-z0-9-]+)/', url)
    return match.group(1) if match else None


def allowed(url):
    return url == FEED_URL or event_slug(url) is not None


def fetch(url):
    if not allowed(url):
        raise ValueError('Source URL outside fixed allowlist')
    req = urllib.request.Request(url, headers={'User-Agent': 'ParisPulseBot/1.0 (+https://parispulse.ca)'})
    with urllib.request.build_opener(NoRedirect()).open(req, timeout=12) as response:
        if response.status != 200 or response.geturl() != url:
            raise ValueError('Source non-200 or redirect rejected')
        content = response.read(MAX_BYTES + 1)
        if len(content) > MAX_BYTES:
            raise ValueError('Source too large')
        return content.decode('utf-8', 'strict')


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
    return row, {'url': url, 'title': title, 'starts_at': row['start_at'],
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
        state_dir=STATE_DIR, max_pages=MAX_PAGES):
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
            db = None
            if write_held_drafts:
                db = HeldDraftStore(os.environ.get('NEXT_PUBLIC_SUPABASE_URL', ''),
                                    os.environ.get('SUPABASE_SERVICE_ROLE_KEY', ''))
            root = ET.fromstring(fetcher(FEED_URL))
            items = root.findall('./channel/item')
            if root.tag != 'rss' or not items:
                raise ValueError('Expected nonempty RSS discovery feed')
            urls = []
            for item in items:
                url = (item.findtext('link') or '').strip()
                if event_slug(url) is None:
                    outcome['errors'].append({'url': url, 'error': 'URL outside fixed allowlist'})
                elif url not in urls:
                    urls.append(url)
            outcome['found'] = len(urls)
            for url in urls[:max_pages]:
                try:
                    sleep(1.0)  # Includes RSS -> first page, and failed requests.
                    row, candidate = review(url, fetcher(url), now)
                    outcome['candidates'].append(candidate)
                    if db:
                        outcome['created'] += int(db.write_held(row))
                except Exception as error:
                    outcome['errors'].append({'url': url, 'error': type(error).__name__ + ': ' + str(error)[:180]})
            if db:
                db.request('ingestion_runs', method='POST', payload={
                    'source_id': BRANT_EVENTS_SOURCE_ID, 'started_at': outcome['at'],
                    'completed_at': dt.datetime.now(UTC).isoformat(),
                    'status': 'partial' if outcome['errors'] else 'success',
                    'records_found': outcome['found'], 'records_created': outcome['created'],
                    'records_failed': len(outcome['errors'])})
            with (state_dir / 'audit.jsonl').open('a') as audit:
                audit.write(json.dumps(outcome, sort_keys=True) + '\n')
    except Exception as error:
        outcome['errors'].append({'error': type(error).__name__ + ': ' + str(error)[:180]})
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
