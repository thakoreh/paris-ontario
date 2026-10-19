#!/usr/bin/env python3
"""Conservative County of Brant -> Paris Pulse publisher. Standard library only.

This is deliberately narrow: only recent Paris-specific routine road news,
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

try:
    from scripts.editorial_rules import BLOCK, mentions_paris, decide, hold_record, ROUTINE_COUNTY_CATEGORIES, category_requires_editor_review, NORMALISATION_LIMIT
except ModuleNotFoundError:  # Direct execution: python3 scripts/official_publisher.py
    from editorial_rules import BLOCK, mentions_paris, decide, hold_record, ROUTINE_COUNTY_CATEGORIES, category_requires_editor_review, NORMALISATION_LIMIT

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
STATE_DIR = Path(os.environ.get('PARIS_PULSE_STATE_DIR') or Path.home() / '.hermes' / 'paris-pulse-publisher')
MAX_PER_DAY = 2
MAX_HELD_DRAFTS_PER_DAY = 10
# Bound raw HTML before regex scans, newline offsets, or parsing. Allow markup
# overhead above editorial_rules' 200,000-character normalisation cap while
# comfortably accommodating ordinary County pages (tens of KB).
MAX_ARTICLE_PAGE_CHARS = 1_000_000
SPACE = re.compile(r'\s+')
ARTICLE_PATH = re.compile(r'/news(?:-and-notices)?/posts/([a-z0-9-]+)/')


class EditorialHold(ValueError):
    """A successfully read source is outside the conservative publishing policy."""


def check_article_page_budget(page):
    if len(page) > MAX_ARTICLE_PAGE_CHARS:
        error = EditorialHold('Article too large for bounded review')
        error.reasons = ['normalisation_limit_exceeded']
        raise error


def clean(text):
    return SPACE.sub(' ', html.unescape(re.sub(r'<[^>]+>', ' ', text))).strip()



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


class HazardTextParser(HTMLParser):
    """Hazard-only text: inline adjacency, explicit block/line boundaries.

    Retain one character beyond the policy cap so decide() reports the usual
    limit hold, never silently screening a truncated field.
    """
    INLINE = frozenset(('span b i em strong a u s small mark abbr code sub sup font '
                        'q cite dfn kbd samp var time data bdi bdo ins del label '
                        'wbr img input area audio video source track picture '
                        'ruby rt rp acronym big strike tt output select option '
                        'textarea button meter progress canvas map object embed').split())
    LINE_BREAKS = str.maketrans(dict.fromkeys('\r\u2028\u2029\u0085\t\f\v', '\n'))

    def __init__(self):
        super().__init__()
        self.parts = []
        self.size = 0

    def handle_data(self, data):
        remaining = NORMALISATION_LIMIT + 1 - self.size
        if remaining > 0:
            part = data[:remaining].replace('\r\n', ' \n').translate(self.LINE_BREAKS)
            self.parts.append(part)
            self.size += len(part)

    def handle_starttag(self, tag, attrs):
        if tag not in self.INLINE:
            self.handle_data('\n' if tag == 'br' else ' ')

    def handle_endtag(self, tag):
        if tag not in self.INLINE and tag != 'br':
            self.handle_data(' ')

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        self.handle_endtag(tag)

    def text(self):
        return ''.join(self.parts)

    @classmethod
    def extract(cls, markup):
        parser = cls()
        parser.feed(markup)
        parser.close()
        return parser.text()


class ArticleBodyParser(HTMLParser):
    """Collect content blocks, retaining ancestry through nested markup."""
    VOID = frozenset('area base br col embed hr img input link meta param source track wbr'.split())
    EXCLUDED = frozenset(('nav', 'header', 'footer', 'script', 'style'))
    BLOCK_CHILDREN = frozenset(('address article aside blockquote div dl fieldset '
                                'figure footer form h1 h2 h3 h4 h5 h6 header hr '
                                'li main nav ol p pre section table ul').split())

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
        self.fallback_containers = {}

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
            block = {'main': in_main, 'text': [], 'paragraphs': [], 'fallback': [], 'hazard': HazardTextParser()}
            self.blocks.append(block)
            self.ancestors.update(id(frame) for frame in self.stack)
            if self.region_start is None and (in_main or not self.has_main):
                self.region_start = self.source_offset()
        if block is not None and not excluded:
            block['hazard'].handle_starttag(tag, attrs)
            if tag == 'br' or tag in self.BLOCK_CHILDREN:
                self.separate_fallback_text()
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
            if block is not None and not excluded and tag in ('div', 'li') and block is parent[3]:
                for ancestor in self.fallback_containers.values():
                    ancestor['container']['has_children'] = True
                candidate = {'text': [], 'container': {'has_children': False}}
                block['fallback'].append(candidate)
                self.fallback_containers[id(frame)] = candidate
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
                    block['hazard'].handle_endtag(tag)
                    if tag in self.BLOCK_CHILDREN:
                        self.separate_fallback_text()
                for frame in self.stack[index + 1:]:
                    implicit = (frame[0] in ('p', 'li') and not frame[2]
                                and frame[3] is not None and id(frame) not in self.ancestors)
                    if not implicit and (frame[2] or frame[3] is not None or id(frame) in self.ancestors):
                        self.unbalanced = True
                for frame in self.stack[index:]:
                    self.fallback_containers.pop(id(frame), None)
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
                block['hazard'].handle_data(data)
                if paragraph is not None:
                    paragraph.append(data)
                # Only the nearest container owns this text. Shared container
                # state also excludes fragments before/after children as labels.
                for frame in reversed(self.stack):
                    candidate = self.fallback_containers.get(id(frame))
                    if candidate is not None:
                        if block['fallback'][-1] is not candidate:
                            candidate = {'text': [], 'container': candidate['container']}
                            self.fallback_containers[id(frame)] = candidate
                            block['fallback'].append(candidate)
                        candidate['text'].append(data)
                        break

    def separate_fallback_text(self):
        for candidate in self.fallback_containers.values():
            candidate['text'].append(' ')

    def extract(self, page):
        check_article_page_budget(page)
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
        self.screening_residual = HazardTextParser.extract(region)
        blocks = [b for b in self.blocks if b['main'] or not self.has_main]
        # HTMLParser has already decoded entities; preserve literal text.
        self.screening_text = ' '.join(b['hazard'].text() for b in blocks)
        normalize = lambda parts: SPACE.sub(' ', ''.join(parts)).strip()
        body = normalize([' '.join(normalize(b['text']) for b in blocks)])
        if not body:
            raise ValueError('Official article body missing or empty')
        paragraphs = []
        for block in blocks:
            primary = [normalize(p) for p in block['paragraphs']]
            if any(primary):
                paragraphs.extend(primary)
            else:
                paragraphs.extend(text for candidate in block['fallback']
                                  if not candidate['container']['has_children']
                                  and (text := normalize(candidate['text'])))
        return body, paragraphs


def review(url, independent_fetch, now, expected_title=None):
    if not allowed(url): raise ValueError('Source URL outside fixed allowlist')
    result = independent_fetch(url)
    page, final = result if isinstance(result, tuple) else (result, url)
    if not allowed(final) or canonical_article_url(final) != canonical_article_url(url):
        raise ValueError('Source redirected outside authorized article equivalent')
    check_article_page_budget(page)
    title_match = re.search(r'<h1\b[^>]*class="[^"]*main[^"]*"[^>]*>(.*?)</h1>', page, re.I | re.S)
    date_match = re.search(r'<span\b[^>]*class="[^"]*gs-news-details-date[^"]*"[^>]*>(.*?)</span>', page, re.I | re.S)
    section = re.search(r'<section\b[^>]*class="[^"]*gs-news-details-meta[^>]*>(.*?)</section>', page, re.I | re.S)
    if not title_match or not date_match or not section: raise ValueError('Article title/date/category missing')
    # Retain split-word evidence for hazard screening, independently of display
    # and listing-title normalization.
    screening_title = HazardTextParser.extract(title_match.group(1))
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
    # Source structure failures above retain their error/hold semantics.
    category_labels = [html.unescape(re.sub(r'<[^>]+>', '', label)).strip(' \t\n\r\v\f')
                       for label in re.findall(
        r'<a\b[^>]*>(.*?)</a>', section.group(1), re.I | re.S)]
    category_text = ('Road Construction' if 'Road Construction' in category_labels
                     else category.replace(date_string, '').strip())
    decision = decide({
        'authority_level': 'official',
        'category_labels': category_labels or [category_text],
        'locality_text': title + ' ' + body,
        'title': screening_title, 'category_text': category, 'body': parser.screening_text,
        'residual': parser.screening_residual,
        'published_at': published, 'now': now, 'parse_ok': True, 'excerpt': excerpt,
    })
    if 'category_requires_editor_review' in decision.reasons:
        category_text = 'Garbage and Recycling'
    canonical = canonical_article_url(url)
    slug = article_slug(canonical)
    if slug is None: raise ValueError('Source URL outside fixed allowlist')
    row = {
        'community_id': COMMUNITY_ID, 'source_id': SOURCE_ID,
        'external_id': 'brant-news:' + slug,
        'title': title, 'slug': 'brant-' + slug,
        'summary': excerpt + ' Check the original County notice for current details.',
        'body': None, 'category': ROUTINE_COUNTY_CATEGORIES.get(category_text, 'other'), 'severity': 'info',
        'official_url': canonical, 'published_at': now.isoformat(), 'retrieved_at': now.isoformat(),
        'verified_at': now.isoformat(), 'expires_at': (now + dt.timedelta(days=3)).isoformat(),
        'latitude': None, 'longitude': None, 'affected_area_text': 'Paris, Ontario',
        'city': 'Paris', 'tags_json': ['county-source', 'automated-source-excerpt'],
        'verification_status': 'verified', 'confidence_score': 0.9, 'is_sample': False,
    }

    if decision.action == 'hold':
        messages = {
            'normalisation_limit_exceeded': 'normalisation_limit_exceeded',
            'non_routine_category': 'Not in official road-construction category',
            'category_requires_editor_review': 'Category requires editor review',
            'stale_or_future': 'Source article is stale or future-dated',
            'missing_excerpt': 'No short complete source excerpt',
            'uncertain_locality': 'Not demonstrably Paris-specific',
            'sensitive_keyword': 'Sensitive/ambiguous article requires human review',
        }
        # Preserve the historical first-message precedence.
        priority = ('category_requires_editor_review', 'non_routine_category', 'stale_or_future', 'missing_excerpt',
                    'uncertain_locality', 'sensitive_keyword')
        reason = next((r for r in priority if r in decision.reasons), decision.reasons[0])
        error = EditorialHold(messages.get(reason, reason))
        if 'category_requires_editor_review' in decision.reasons:
            row = hold_record(row, decision.reasons)
        error.row, error.reasons = row, decision.reasons
        raise error
    return row


class SupabaseNoRedirect(urllib.request.HTTPRedirectHandler):
    """Never replay service credentials, even to the same host."""
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise urllib.error.HTTPError(
            req.full_url, code, 'Supabase redirect refused', headers, fp)


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
        with urllib.request.build_opener(SupabaseNoRedirect()).open(req, timeout=15) as res:
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
        return self._day_count(now, 'verified', MAX_PER_DAY)
    def draft_count(self, now):
        return self._day_count(now, 'draft', MAX_HELD_DRAFTS_PER_DAY)
    def _day_count(self, now, status, limit):
        # Both quotas retain the created_at bucket starting at midnight UTC,
        # independent of the Toronto calendar day.
        start = now.astimezone(UTC).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        q = urllib.parse.urlencode({'select': 'id', 'source_id': 'eq.' + SOURCE_ID,
                                    'verification_status': 'eq.' + status,
                                    'created_at': 'gte.' + start, 'limit': limit})
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
            'records_created': outcome['created'] + outcome.get('held_drafts_created', 0), 'records_updated': 0,
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


def run_breakdown(outcome):
    breakdown = {'published': outcome.get('created', 0),
                 'held': sum(item.get('decision') != 'would-publish' for item in outcome.get('held', [])),
                 'held_drafts_created': outcome.get('held_drafts_created', 0),
                 'duplicates': outcome.get('duplicates', 0),
                 'errors': sum('url' in item for item in outcome.get('errors', []))}
    breakdown['would_publish'] = sum(item.get('decision') == 'would-publish' for item in outcome.get('held', []))
    for name in ('capped', 'draft_capped'):
        breakdown[name] = outcome.get(name, 0)
    return breakdown


def assert_partition(outcome):
    """Validate candidate buckets even when Python optimization is enabled."""
    counts = run_breakdown(outcome)
    total = sum(counts[name] for name in
                ('published', 'would_publish', 'held', 'duplicates', 'errors'))
    if outcome['found'] != total:
        raise RuntimeError(f"Run count partition invariant violated: found={outcome['found']}, {counts}")
    for name in ('capped', 'draft_capped'):
        if counts[name] > counts['held']:
            raise RuntimeError(f'Run count partition invariant violated: {name} exceeds held, {counts}')
    return counts


def run(publish_enabled=False, env_file=None, *, record_checks=True):
    now = dt.datetime.now(UTC)
    outcome = {'at': now.isoformat(), 'mode': 'publish' if publish_enabled else 'dry-run',
               'run_status': 'failed', 'found': 0, 'eligible': 0, 'created': 0, 'held_drafts_created': 0, 'published': [], 'duplicates': 0, 'held': [], 'errors': []}
    STATE_DIR.mkdir(mode=0o700, parents=True, exist_ok=True)
    candidates = {}
    processed = set()
    db = None
    try:
        with (STATE_DIR / 'lock').open('w') as lock:
            try: fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError: raise RuntimeError('Previous publisher run still active')
            page, final = fetch(FEED_URL)
            outcome['fetched'] = True
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
                processed.add(url)
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
                    if str(e) == 'Daily publish cap reached':
                        outcome['capped'] = outcome.get('capped', 0) + 1
                    if (db and os.environ.get('PARIS_PULSE_WRITE_HELD_DRAFTS') == '1'
                            and hasattr(e, 'row')):
                        try:
                            draft = hold_record(e.row, e.reasons)
                            if not db.existing(draft['official_url'], draft['external_id']):
                                if db.draft_count(now) >= MAX_HELD_DRAFTS_PER_DAY:
                                    outcome['held'][-1]['reason'] = 'Held-draft daily limit reached'
                                    outcome['draft_capped'] = outcome.get('draft_capped', 0) + 1
                                    continue
                                if not db.source_ready():
                                    raise ValueError('Configured official source not approved')
                                created = db.create(draft)
                                actual = db.read(created['id'])
                                if not actual or any(actual.get(k) != draft[k] for k in
                                        ('official_url', 'title', 'summary', 'verification_status', 'is_sample', 'expires_at')):
                                    raise RuntimeError('Draft write readback failed')
                                outcome['held_drafts_created'] += 1
                        except Exception as error:
                            outcome['held'].pop()
                            if str(e) == 'Daily publish cap reached':
                                outcome['capped'] -= 1
                            outcome['errors'].append({'url': url, 'error': str(error)[:180]})
                except Exception as e:
                    outcome['errors'].append({'url': url, 'error': type(e).__name__ + ': ' + str(e)[:180]})
            outcome['run_status'] = 'partial' if outcome['errors'] else 'ok'
    except Exception as e:
        outcome['errors'].append({'error': type(e).__name__ + ': ' + str(e)[:180]})
    for url in candidates.keys() - processed:
        outcome['errors'].append({'url': url, 'error': 'Run failed before candidate processing'})
    try:
        outcome['breakdown'] = assert_partition(outcome)
    except RuntimeError as e:
        outcome['errors'].append({'error': str(e)})
        outcome['run_status'] = 'partial'
        outcome['breakdown'] = run_breakdown(outcome)
    if db and record_checks:
        try:
            db.audit_run(outcome)
        except Exception as e:
            outcome['errors'].append({'error': 'Backend audit failed: ' + type(e).__name__ + ': ' + str(e)[:180]})
            outcome['run_status'] = 'partial'
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
