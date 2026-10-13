#!/usr/bin/env python3
"""Conservative County of Brant -> Paris Pulse publisher. Standard library only.

This is deliberately narrow: only recent Paris-specific Road Construction news,
source excerpts rather than AI-generated claims, short TTL, and no safety alerts.
The independent review pass re-fetches each article. Fail closed on uncertainty.
"""
import argparse
import datetime as dt
import fcntl
import html
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime

UTC = dt.timezone.utc
LIST_URL = 'https://www.brant.ca/news/'
CANONICAL_LIST_URL = 'https://www.brant.ca/news-and-notices/'
LEGACY_FEED_URL = 'https://www.brant.ca/news/rss'
FEED_URL = 'https://www.brant.ca/news-and-notices/rss/'
FEED_URLS = (LEGACY_FEED_URL, FEED_URL)
LIST_URLS = (LIST_URL, CANONICAL_LIST_URL)
HOST = 'www.brant.ca'
SOURCE_ID = 'cb111111-1111-4111-8111-111111111111'
COMMUNITY_ID = '00000000-0000-4000-8000-000000000001'
STATE_DIR = Path.home() / '.hermes' / 'paris-pulse-publisher'
MAX_PER_DAY = 2
BLOCK = re.compile(r'\b(emergency|evacuat\w*|flood\w*|election\w*|vot\w*|fatal\w*|death|fire|boil.water|drinking.water|school|medical|health|outage|ignore previous instructions|system prompt)\b', re.I)
SPACE = re.compile(r'\s+')
ARTICLE_PATH = re.compile(r'/news(?:-and-notices)?/posts/([a-z0-9-]+)/')


class EditorialHold(ValueError):
    """A successfully read source is outside the conservative publishing policy."""


def clean(text):
    return SPACE.sub(' ', html.unescape(re.sub(r'<[^>]+>', ' ', text))).strip()


def mentions_paris(text):
    # Singular Road/Rd/Rd. denotes a street only when the next word is not
    # road activity. Plural roads is generic; area/town/downtown/local/county
    # anywhere among the 1-3 intervening words also makes the phrase generic.
    activities = set(('construction work works repair repairs closure closures closed '
                      'resurfacing paving maintenance improvements upgrades project projects '
                      'safety conditions').split())
    generic = {'area', 'town', 'downtown', 'local', 'county'}
    remaining = re.sub(r'\bparis(?:\s*,?\s*france\b|\s*\(france\))',
                       ' ', text, flags=re.I)

    def street_name(match):
        intervening = (match.group('words') or '').lower().split()
        following = re.match(r'\s+(\w+)', remaining[match.end():])
        if generic.intersection(intervening) or (
                following and following.group(1).lower() in activities):
            return match.group()
        return ' '

    remaining = re.sub(
        r'\bparis[\s-]+(?P<words>(?:[a-z]+\s+){1,3}?)??(?:road|rd)\b\.?',
        street_name, remaining, flags=re.I)
    return re.search(r'\bparis\b', remaining, re.I) is not None


def article_slug(url):
    p = urllib.parse.urlsplit(url)
    if p.username is not None or p.password is not None:
        return None
    if p.scheme != 'https' or p.hostname != HOST or p.port is not None or p.query or p.fragment:
        return None
    match = ARTICLE_PATH.fullmatch(p.path)
    return match.group(1) if match else None


def allowed(url):
    return article_slug(url) is not None


def canonical_article_url(url):
    slug = article_slug(url)
    if slug is None:
        raise ValueError('Source URL outside fixed allowlist')
    return CANONICAL_LIST_URL + 'posts/' + slug + '/'


def article_url_variants(url):
    slug = article_slug(url)
    if slug is None:
        raise ValueError('Source URL outside fixed allowlist')
    return (
        CANONICAL_LIST_URL + 'posts/' + slug + '/',
        LIST_URL + 'posts/' + slug + '/',
    )


def authorized_redirect(source, target):
    if allowed(source):
        return allowed(target) and canonical_article_url(source) == canonical_article_url(target)
    if source in FEED_URLS:
        return target in FEED_URLS
    if source in LIST_URLS:
        return target in LIST_URLS
    return False


class ListingParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
    def handle_starttag(self, tag, attrs):
        if tag != 'a': return
        a = dict(attrs)
        if 'gs-feed-list-title' in a.get('class', '').split():
            self.links.append(urllib.parse.urljoin(LIST_URL, a.get('href', '')))


def collect(page):
    parser = ListingParser()
    parser.feed(page)
    links = list(dict.fromkeys(canonical_article_url(u) for u in parser.links if allowed(u)))
    if not links: raise ValueError('Official listing returned no allowed article links; parser/source may have changed')
    return links[:15]


def parse_feed_date(raw_date):
    # Keep the legacy interpretation: timezone-less RSS dates are naive and
    # astimezone() resolves them in the host's local timezone.
    return parsedate_to_datetime(raw_date).astimezone(UTC)


def collect_feed(xml, now):
    try: root = ET.fromstring(xml)
    except ET.ParseError as e: raise ValueError('Official RSS is malformed') from e
    items = root.findall('./channel/item')
    if not items: raise ValueError('Official RSS returned no items')
    selected = {}
    for item in items:
        url = (item.findtext('link') or '').strip()
        title = (item.findtext('title') or '').strip()
        raw_date = item.findtext('pubDate') or ''
        if not allowed(url): continue
        try: published = parse_feed_date(raw_date)
        except (ValueError, TypeError, OverflowError) as e:
            raise ValueError('Unrecognized RSS publication date for ' + url) from e
        if dt.timedelta(0) <= now - published <= dt.timedelta(days=5):
            canonical = canonical_article_url(url)
            if canonical in selected and selected[canonical] != title:
                raise ValueError('RSS has conflicting titles for equivalent article URLs')
            selected[canonical] = title
        if len(selected) >= 15: break
    return selected


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def fetch(url):
    if url not in LIST_URLS and url not in FEED_URLS and not allowed(url):
        raise ValueError('Source URL outside fixed allowlist')
    current = url
    for _ in range(5):
        req = urllib.request.Request(current, headers={'User-Agent': 'ParisPulseEditorial/1.0 (+https://parispulse.ca)'})
        opener = urllib.request.build_opener(NoRedirect())
        try:
            response = opener.open(req, timeout=12)
        except urllib.error.HTTPError as error:
            response = error
        status = getattr(response, 'status', None)
        if status is None:
            status = response.getcode()
        if status in (301, 302, 303, 307, 308):
            target = urllib.parse.urljoin(current, response.headers.get('Location', ''))
            response.close()
            if not authorized_redirect(current, target):
                raise ValueError('Source redirected outside fixed allowlist')
            current = target
            continue
        try:
            final = response.geturl()
            if final != current and not authorized_redirect(current, final):
                raise ValueError('Source redirected outside fixed allowlist')
            if status != 200: raise ValueError('Source returned non-200')
            content = response.read(750_001)
            if len(content) > 750_000: raise ValueError('Source too large')
            return content.decode('utf-8', 'replace'), final
        finally:
            response.close()
    raise ValueError('Source redirected too many times')


class ArticleBodyParser(HTMLParser):
    """Collect content blocks, retaining ancestry through nested markup."""
    VOID = frozenset('area base br col embed hr img input link meta param source track wbr'.split())
    EXCLUDED = frozenset(('nav', 'header', 'footer', 'script', 'style'))

    def __init__(self):
        super().__init__()
        self.stack = []
        self.blocks = []
        self.has_main = False
        self.ancestors = set()
        self.exclusion_starts = {}
        self.excluded_spans = []
        self.region_start = None
        self.region_end = None
        self.unbalanced = False

    def source_offset(self):
        line, column = self.getpos()
        return self.line_offsets[line - 1] + column

    def handle_starttag(self, tag, attrs):
        # HTML permits p and li end tags to be omitted. Close them at their
        # structural boundaries so following text keeps the correct ancestry.
        if tag in ('p', 'ul', 'ol', 'div'):
            for frame in reversed(self.stack):
                if frame[0] == 'p':
                    self.handle_endtag('p')
                    break
        if tag == 'li':
            for frame in reversed(self.stack):
                if frame[0] in ('ul', 'ol'):
                    break
                if frame[0] == 'li':
                    self.handle_endtag('li')
                    break
        attrs = dict(attrs)
        tokens = (attrs.get('class', '') + ' ' + attrs.get('id', '')).lower().split()
        parent = self.stack[-1] if self.stack else (None, False, False, None, None)
        _, in_main, excluded, block, paragraph = parent
        if tag == 'main' and attrs.get('id') == 'site-content':
            in_main = self.has_main = True
            self.region_start = self.region_end = None
        parent_excluded = excluded
        excluded = excluded or tag in ('script', 'style') or (block is None and (
            tag in self.EXCLUDED or any(
                'breadcrumb' in token or 'sub-nav' in token or 'subnav' in token for token in tokens)))
        if not excluded and block is None and tag == 'div' and {'text', 'base-text'} <= set(tokens):
            block = {'main': in_main, 'text': [], 'paragraphs': []}
            self.blocks.append(block)
            self.ancestors.update(id(frame) for frame in self.stack)
            if self.region_start is None and (in_main or not self.has_main):
                self.region_start = self.source_offset()
        if block is not None and not excluded:
            if tag in ('div', 'p', 'li', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'):
                block['text'].append(' ')
                if paragraph is not None:
                    paragraph.append(' ')
            if tag == 'p':
                paragraph = []
                block['paragraphs'].append(paragraph)
        if tag not in self.VOID:
            frame = (tag, in_main, excluded, block, paragraph)
            self.stack.append(frame)
            if excluded and not parent_excluded:
                self.exclusion_starts[id(frame)] = self.source_offset()

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in self.VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                _, _, excluded, block, paragraph = self.stack[index]
                if block is not None and not excluded:
                    block['text'].append(' ')
                for frame in self.stack[index + 1:]:
                    implicit = (frame[0] in ('p', 'li') and not frame[2]
                                and frame[3] is not None and id(frame) not in self.ancestors)
                    if not implicit and (frame[2] or frame[3] is not None or id(frame) in self.ancestors):
                        self.unbalanced = True
                for frame in self.stack[index:]:
                    self.ancestors.discard(id(frame))
                    start = self.exclusion_starts.pop(id(frame), None)
                    if start is not None:
                        end = self.page.find('>', self.source_offset()) + 1
                        self.excluded_spans.append((start, end))
                if tag == 'main' and self.stack[index][1] and self.region_start is not None:
                    self.region_end = self.source_offset()
                del self.stack[index:]
                break

    def handle_data(self, data):
        if self.stack:
            _, _, excluded, block, paragraph = self.stack[-1]
            if block is not None and not excluded:
                block['text'].append(data)
                if paragraph is not None:
                    paragraph.append(data)

    def extract(self, page):
        self.page = page
        self.line_offsets = [0]
        self.line_offsets.extend(match.end() for match in re.finditer('\n', page))
        self.feed(page)
        self.close()
        if self.unbalanced or any(frame[2] or frame[3] is not None or id(frame) in self.ancestors
                                  for frame in self.stack):
            raise EditorialHold('Unbalanced article markup requires human review')
        # The real page has a sub-navigation column after the article. Mask only
        # outside-content menus (and script/style), then screen through </main>;
        # choosing the first accepted block also skips menus before the article.
        end = self.region_end if self.region_end is not None else len(page)
        region = page[self.region_start:end] if self.region_start is not None else ''
        for start, stop in sorted(self.excluded_spans, reverse=True):
            left, right = max(start, self.region_start or 0), min(stop, end)
            if left < right:
                origin = self.region_start or 0
                region = region[:left - origin] + ' ' * (right - left) + region[right - origin:]
        region = re.sub(r'<(script|style)\b[^>]*>.*?</\1\s*>', ' ', region, flags=re.I | re.S)
        self.loose_text = html.unescape(re.sub(r'<[^>]*>', ' ', region))
        blocks = [b for b in self.blocks if b['main'] or not self.has_main]
        # HTMLParser has already decoded entities; preserve literal text.
        normalize = lambda parts: SPACE.sub(' ', ''.join(parts)).strip()
        body = normalize([' '.join(normalize(b['text']) for b in blocks)])
        if not body:
            raise ValueError('Official article body missing or empty')
        paragraphs = [normalize(p) for b in blocks for p in b['paragraphs']]
        return body, paragraphs


def review(url, independent_fetch, now, expected_title=None):
    if not allowed(url): raise ValueError('Source URL outside fixed allowlist')
    result = independent_fetch(url)
    page, final = result if isinstance(result, tuple) else (result, url)
    if not allowed(final) or canonical_article_url(final) != canonical_article_url(url):
        raise ValueError('Source redirected outside authorized article equivalent')
    title_match = re.search(r'<h1\b[^>]*class="[^"]*main[^"]*"[^>]*>(.*?)</h1>', page, re.I | re.S)
    date_match = re.search(r'<span\b[^>]*class="[^"]*gs-news-details-date[^"]*"[^>]*>(.*?)</span>', page, re.I | re.S)
    section = re.search(r'<section\b[^>]*class="[^"]*gs-news-details-meta[^>]*>(.*?)</section>', page, re.I | re.S)
    if not title_match or not date_match or not section: raise ValueError('Article title/date/category missing')
    title, date_string = clean(title_match.group(1)), clean(date_match.group(1))
    if not title: raise ValueError('Article title empty')
    if expected_title is not None and title != expected_title: raise ValueError('Listing/article title mismatch')
    category = clean(section.group(1))
    if not category.replace(date_string, '').strip(): raise ValueError('Article category missing')
    try:
        published = dt.datetime.strptime(date_string, '%b %d, %Y').date()
    except ValueError as e:
        raise ValueError('Unrecognized source publication date') from e
    parser = ArticleBodyParser()
    body, paragraphs = parser.extract(page)
    excerpt = next((p for p in paragraphs if len(p) >= 30 and len(p) <= 400), '')
    if not any(paragraphs): raise ValueError('Official article paragraphs missing or empty')
    # Validate required source structure before any healthy editorial skip.
    if 'Road Construction' not in category: raise EditorialHold('Not in official road-construction category')
    if not (dt.timedelta(0) <= now.date() - published <= dt.timedelta(days=5)):
        raise EditorialHold('Source article is stale or future-dated')
    if not excerpt: raise EditorialHold('No short complete source excerpt')
    source_text = title + ' ' + body
    if not mentions_paris(source_text): raise EditorialHold('Not demonstrably Paris-specific')
    # Sensitive-topic screen also covers list items and any other body text.
    if BLOCK.search(source_text) or BLOCK.search(parser.loose_text): raise EditorialHold('Sensitive/ambiguous article requires human review')
    canonical = canonical_article_url(url)
    slug = article_slug(canonical)
    if slug is None: raise ValueError('Source URL outside fixed allowlist')
    return {
        'community_id': COMMUNITY_ID, 'source_id': SOURCE_ID,
        'external_id': 'brant-news:' + slug,
        'title': title, 'slug': 'brant-' + slug,
        'summary': excerpt + ' Check the original County notice for current details.',
        'body': None, 'category': 'construction', 'severity': 'info',
        'official_url': canonical, 'published_at': now.isoformat(), 'retrieved_at': now.isoformat(),
        'verified_at': now.isoformat(), 'expires_at': (now + dt.timedelta(days=3)).isoformat(),
        'latitude': None, 'longitude': None, 'affected_area_text': 'Paris, Ontario',
        'city': 'Paris', 'tags_json': ['county-source', 'automated-source-excerpt'],
        'verification_status': 'verified', 'confidence_score': 0.9, 'is_sample': False,
    }


class Supabase:
    def __init__(self, url, key):
        p = urllib.parse.urlsplit(url)
        if p.scheme != 'https' or not p.hostname or not p.hostname.endswith('.supabase.co'):
            raise ValueError('Supabase endpoint must be a project HTTPS URL')
        if not key: raise ValueError('Missing service-role credential')
        self.url, self.key = url.rstrip('/'), key
    def request(self, table, params='', method='GET', payload=None):
        data = json.dumps(payload).encode() if payload is not None else None
        req = urllib.request.Request(self.url + '/rest/v1/' + table + ('?' + params if params else ''), data=data, method=method,
            headers={'apikey': self.key, 'Authorization': 'Bearer ' + self.key,
                     'Content-Type': 'application/json', 'Prefer': 'return=representation'})
        with urllib.request.urlopen(req, timeout=15) as res:
            return json.loads(res.read())
    def existing(self, url, external_id=None):
        canonical = canonical_article_url(url)
        slug = article_slug(canonical)
        if slug is None: raise ValueError('Source URL outside fixed allowlist')
        expected_external_id = 'brant-news:' + slug
        if external_id is not None and external_id != expected_external_id:
            raise ValueError('External ID does not match source URL')
        for candidate in article_url_variants(canonical):
            q = urllib.parse.urlencode({'select': 'id,official_url,external_id', 'official_url': 'eq.' + candidate, 'limit': 1})
            rows = self.request('notices', q)
            if rows: return rows[0]
        q = urllib.parse.urlencode({'select': 'id,official_url,external_id', 'source_id': 'eq.' + SOURCE_ID,
                                    'external_id': 'eq.' + expected_external_id, 'limit': 1})
        rows = self.request('notices', q)
        return rows[0] if rows else None
    def today_count(self, now):
        start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        q = urllib.parse.urlencode({'select': 'id', 'source_id': 'eq.' + SOURCE_ID, 'created_at': 'gte.' + start, 'limit': MAX_PER_DAY})
        return len(self.request('notices', q))
    def source_ready(self):
        q = urllib.parse.urlencode({'select': 'id,active,authority_level,url', 'id': 'eq.' + SOURCE_ID})
        rows = self.request('official_sources', q)
        return len(rows) == 1 and rows[0]['active'] and rows[0]['authority_level'] == 'official' and rows[0]['url'] == LIST_URL
    def create(self, row):
        return self.request('notices', method='POST', payload=row)[0]
    def read(self, id):
        q = urllib.parse.urlencode({'select': 'id,official_url,title,summary,verification_status,is_sample,expires_at', 'id': 'eq.' + id})
        rows = self.request('notices', q)
        return rows[0] if rows else None
    def audit_run(self, outcome):
        at = outcome['at']
        status = 'success' if outcome['run_status'] == 'ok' else 'partial'
        self.request('ingestion_runs', method='POST', payload={
            'source_id': SOURCE_ID, 'started_at': at,
            'completed_at': dt.datetime.now(UTC).isoformat(),
            'status': status, 'records_found': outcome['found'],
            'records_created': outcome['created'], 'records_updated': 0,
            'records_failed': len(outcome['errors']),
            'error_message': '; '.join(str(x.get('error', '')) for x in outcome['errors'])[:400] or None,
        })
        if status == 'success':
            self.request('official_sources', urllib.parse.urlencode({'id': 'eq.' + SOURCE_ID}), method='PATCH', payload={
                'last_checked_at': at, 'last_success_at': at,
                'ingestion_enabled': True, 'ingestion_type': 'html',
            })


def publish(row, db, now):
    if row['verification_status'] != 'verified' or row['is_sample'] or not allowed(row['official_url']):
        raise ValueError('Review gate did not approve this record')
    slug = article_slug(row['official_url'])
    if slug is None or row['official_url'] != canonical_article_url(row['official_url']) or row['external_id'] != 'brant-news:' + slug:
        raise ValueError('Review gate did not approve this record')
    if dt.datetime.fromisoformat(row['verified_at']) < now - dt.timedelta(minutes=10):
        raise ValueError('Reviewer evidence expired before write')
    if dt.datetime.fromisoformat(row['expires_at']) <= now or dt.datetime.fromisoformat(row['expires_at']) > now + dt.timedelta(days=3, minutes=10):
        raise ValueError('Expiry outside strict window')
    if db.existing(row['official_url'], row['external_id']): return 'duplicate'
    if db.today_count(now) >= MAX_PER_DAY: raise EditorialHold('Daily publish cap reached')
    if hasattr(db, 'source_ready') and not db.source_ready(): raise ValueError('Configured official source not approved')
    created = db.create(row)
    actual = db.read(created['id'])
    if not actual or actual['official_url'] != row['official_url'] or actual['title'] != row['title'] or actual['verification_status'] != 'verified' or actual['is_sample']:
        raise RuntimeError('Write readback failed; inspect exact record before retrying')
    return 'created'


def load_env(path):
    values = {}
    if path.exists():
        for line in path.read_text().splitlines():
            if not line or line.startswith('#') or '=' not in line: continue
            k, v = line.split('=', 1)
            values[k.strip()] = v.strip().strip('"').strip("'")
    return values


def record(event):
    STATE_DIR.mkdir(mode=0o700, parents=True, exist_ok=True)
    with (STATE_DIR / 'audit.jsonl').open('a') as f:
        f.write(json.dumps(event, sort_keys=True) + '\n')
    if event.get('mode') == 'publish' and event.get('run_status') in ('ok', 'partial', 'failed'):
        path = STATE_DIR / 'last_run.json'
        tmp = path.with_suffix('.tmp')
        tmp.write_text(json.dumps(event, indent=2))
        os.replace(tmp, path)


def run(publish_enabled=False, env_file=None):
    now = dt.datetime.now(UTC)
    outcome = {'at': now.isoformat(), 'mode': 'publish' if publish_enabled else 'dry-run',
               'run_status': 'failed', 'found': 0, 'eligible': 0, 'created': 0, 'published': [], 'duplicates': 0, 'held': [], 'errors': []}
    STATE_DIR.mkdir(mode=0o700, parents=True, exist_ok=True)
    try:
        with (STATE_DIR / 'lock').open('w') as lock:
            try: fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError: raise RuntimeError('Previous publisher run still active')
            page, final = fetch(FEED_URL)
            if final not in FEED_URLS: raise RuntimeError('News feed redirected')
            candidates = collect_feed(page, now)
            outcome['found'] = len(candidates)
            values = load_env(env_file) if env_file else {}
            db = None
            if publish_enabled:
                db = Supabase(os.environ.get('NEXT_PUBLIC_SUPABASE_URL') or values.get('NEXT_PUBLIC_SUPABASE_URL', ''),
                              os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or values.get('SUPABASE_SERVICE_ROLE_KEY', ''))
                if not db.source_ready(): raise RuntimeError('Production source registry is not authoritative/active')
            for url, title in candidates.items():
                try:
                    # RSS discovers URLs; independent reviewer re-opens the original.
                    row = review(url, fetch, now, expected_title=title)
                    outcome['eligible'] += 1
                    if db:
                        status = publish(row, db, dt.datetime.now(UTC))
                        if status == 'created':
                            outcome['created'] += 1
                            outcome['published'].append(url)
                        else: outcome['duplicates'] += 1
                    else: outcome['held'].append({'url': url, 'title': row['title'], 'decision': 'would-publish'})
                except EditorialHold as e:
                    outcome['held'].append({'url': url, 'reason': str(e)})
                except Exception as e:
                    outcome['errors'].append({'url': url, 'error': type(e).__name__ + ': ' + str(e)[:180]})
            outcome['run_status'] = 'partial' if outcome['errors'] else 'ok'
            if db:
                try: db.audit_run(outcome)
                except Exception as e:
                    outcome['errors'].append({'error': 'Backend audit failed: ' + type(e).__name__ + ': ' + str(e)[:180]})
                    outcome['run_status'] = 'partial'
    except Exception as e:
        outcome['errors'].append({'error': type(e).__name__ + ': ' + str(e)[:180]})
    record(outcome)
    return outcome


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--publish', action='store_true')
    parser.add_argument('--env-file', type=Path)
    args = parser.parse_args()
    result = run(args.publish, args.env_file)
    print(json.dumps(result, indent=2))
    sys.exit(0 if result['run_status'] == 'ok' else 1)
