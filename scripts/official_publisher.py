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
FEED_URL = 'https://www.brant.ca/news/rss'
HOST = 'www.brant.ca'
SOURCE_ID = 'cb111111-1111-4111-8111-111111111111'
COMMUNITY_ID = '00000000-0000-4000-8000-000000000001'
STATE_DIR = Path.home() / '.hermes' / 'paris-pulse-publisher'
MAX_PER_DAY = 2
BLOCK = re.compile(r'\b(emergency|evacuat\w*|flood\w*|election\w*|vot\w*|fatal\w*|death|fire|boil.water|drinking.water|school|medical|health|outage|ignore previous instructions|system prompt)\b', re.I)
SPACE = re.compile(r'\s+')


class EditorialHold(ValueError):
    """A successfully read source is outside the conservative publishing policy."""


def clean(text):
    return SPACE.sub(' ', html.unescape(re.sub(r'<[^>]+>', ' ', text))).strip()


def allowed(url):
    p = urllib.parse.urlsplit(url)
    return p.scheme == 'https' and p.hostname == HOST and p.port is None and re.fullmatch(r'/news/posts/[a-z0-9-]+/', p.path) and not p.query and not p.fragment


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
    links = list(dict.fromkeys(u for u in parser.links if allowed(u)))
    if not links: raise ValueError('Official listing returned no allowed article links; parser/source may have changed')
    return links[:15]


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
        if not allowed(url) or not re.search(r'\bparis\b', title, re.I): continue
        try: published = parsedate_to_datetime(raw_date).astimezone(UTC)
        except (ValueError, TypeError, OverflowError) as e:
            raise ValueError('Unrecognized RSS publication date for ' + url) from e
        if dt.timedelta(0) <= now - published <= dt.timedelta(days=5):
            selected[url] = title
        if len(selected) >= 15: break
    return selected


def fetch(url):
    if url not in (LIST_URL, FEED_URL) and not allowed(url): raise ValueError('Source URL outside fixed allowlist')
    req = urllib.request.Request(url, headers={'User-Agent': 'ParisPulseEditorial/1.0 (+https://parispulse.ca)'})
    with urllib.request.urlopen(req, timeout=12) as response:
        final = response.geturl()
        if final not in (LIST_URL, FEED_URL, FEED_URL + '/') and not allowed(final): raise ValueError('Source redirected outside fixed allowlist')
        if response.status != 200: raise ValueError('Source returned non-200')
        content = response.read(750_001)
        if len(content) > 750_000: raise ValueError('Source too large')
        return content.decode('utf-8', 'replace'), final


def review(url, independent_fetch, now, expected_title=None):
    if not allowed(url): raise ValueError('Source URL outside fixed allowlist')
    result = independent_fetch(url)
    page, final = result if isinstance(result, tuple) else (result, url)
    if final != url: raise ValueError('Source redirected during independent review')
    title_match = re.search(r'<h1\b[^>]*class="[^"]*main[^"]*"[^>]*>(.*?)</h1>', page, re.I | re.S)
    date_match = re.search(r'<span\b[^>]*class="[^"]*gs-news-details-date[^"]*"[^>]*>(.*?)</span>', page, re.I | re.S)
    section = re.search(r'<section\b[^>]*class="[^"]*gs-news-details-meta[^>]*>(.*?)</section>', page, re.I | re.S)
    if not title_match or not date_match or not section: raise ValueError('Article title/date/category missing')
    title, date_string = clean(title_match.group(1)), clean(date_match.group(1))
    if expected_title is not None and title != expected_title: raise ValueError('Listing/article title mismatch')
    category = clean(section.group(1))
    if not category.replace(date_string, '').strip(): raise ValueError('Article category missing')
    if 'Road Construction' not in category: raise EditorialHold('Not in official road-construction category')
    try:
        published = dt.datetime.strptime(date_string, '%b %d, %Y').date()
    except ValueError as e:
        raise ValueError('Unrecognized source publication date') from e
    if not (dt.timedelta(0) <= now.date() - published <= dt.timedelta(days=5)):
        raise EditorialHold('Source article is stale or future-dated')
    text_block = re.search(r'<div\b[^>]*class="[^"]*text base-text[^"]*"[^>]*>(.*?)</div>', page, re.I | re.S)
    if not text_block: raise ValueError('Official article body missing')
    paragraphs = [clean(p) for p in re.findall(r'<p\b[^>]*>(.*?)</p>', text_block.group(1), re.I | re.S)]
    excerpt = next((p for p in paragraphs if len(p) >= 30 and len(p) <= 400), '')
    if not any(paragraphs): raise ValueError('Official article paragraphs missing or empty')
    if not excerpt: raise EditorialHold('No short complete source excerpt')
    if not re.search(r'\bparis\b', title + ' ' + excerpt, re.I): raise EditorialHold('Not demonstrably Paris-specific')
    if BLOCK.search(title + ' ' + excerpt): raise EditorialHold('Sensitive/ambiguous article requires human review')
    slug = urllib.parse.urlsplit(url).path.strip('/').split('/')[-1]
    return {
        'community_id': COMMUNITY_ID, 'source_id': SOURCE_ID,
        'external_id': 'brant-news:' + slug,
        'title': title, 'slug': 'brant-' + slug,
        'summary': excerpt + ' Check the original County notice for current details.',
        'body': None, 'category': 'construction', 'severity': 'info',
        'official_url': url, 'published_at': now.isoformat(), 'retrieved_at': now.isoformat(),
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
    def existing(self, url):
        q = urllib.parse.urlencode({'select': 'id,official_url', 'official_url': 'eq.' + url, 'limit': 1})
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
    if dt.datetime.fromisoformat(row['verified_at']) < now - dt.timedelta(minutes=10):
        raise ValueError('Reviewer evidence expired before write')
    if dt.datetime.fromisoformat(row['expires_at']) <= now or dt.datetime.fromisoformat(row['expires_at']) > now + dt.timedelta(days=3, minutes=10):
        raise ValueError('Expiry outside strict window')
    if db.existing(row['official_url']): return 'duplicate'
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
            if final not in (FEED_URL, FEED_URL + '/'): raise RuntimeError('News feed redirected')
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
