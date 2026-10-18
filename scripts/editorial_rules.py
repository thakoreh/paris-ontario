"""Pure, fail-closed editorial policy; callers supply an explicit reference time."""
import datetime as dt
import re
import unicodedata
from typing import NamedTuple

TRUSTED_AUTO_PUBLISH_SOURCES = frozenset({'official'})
EDITOR_REQUIRED_CATEGORIES = {'Garbage and Recycling'}
ROUTINE_COUNTY_CATEGORIES = {
    'Road Construction': 'construction',
    'Garbage and Recycling': 'waste',
}

# Common Cyrillic and Greek visual substitutes, including their capitals.
_CONFUSABLES = str.maketrans({
    **dict(zip('аеорсхуіѕјкмтнв', 'aeopcxyisjkmthb')),
    **dict(zip('АЕОРСХУІЅЈКМТНВ', 'AEOPCXYISJKMTHB')),
    **dict(zip('αεορϲχυιѕκτν', 'aeopcxyisktv')),
    **dict(zip('ΑΕΟΡϹΧΥΙΚΤΝΖΒΜΗ', 'AEOPCXYIKTNZBMH')),
})


def normalize_label(text):
    """Canonicalize source category labels before applying editorial policy."""
    text = unicodedata.normalize('NFKC', text)
    text = ''.join(char for char in text if unicodedata.category(char) != 'Cf')
    text = text.translate(_CONFUSABLES).casefold()
    text = text.replace('&', ' and ').replace('+', ' and ')
    return re.sub(r'[\W_]+', ' ', text).strip()


def category_requires_editor_review(label):
    normalized = normalize_label(label)
    return (normalized in {normalize_label(value) for value in EDITOR_REQUIRED_CATEGORIES}
            or any(token in normalized for token in ('garbage', 'recycling', 'waste')))


BLOCK = re.compile(r'\b(emergency|evacuat\w*|flood\w*|election\w*|vot\w*|fatal\w*|death|fire|boil.water|drinking.water|school|medical|health|outage|ignore previous instructions|system prompt)\b', re.I)



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


class Decision(NamedTuple):
    action: str
    reasons: list[str]


def decide(candidate):
    """Dates are date/datetime or ISO strings; now is an explicit date/datetime.

    published_at (or published) takes precedence over starts_at. Freshness uses
    calendar days, matching the County publication-date review. Event candidates
    instead use starts_at and a forward 120-day window, skipping only the
    County routine-category gate; authority and all other checks still apply.
    """
    reasons = []
    def text(key):
        value = candidate.get(key)
        return value if isinstance(value, str) else ''
    if text('authority_level') not in TRUSTED_AUTO_PUBLISH_SOURCES:
        reasons.append('untrusted_source')
    labels = candidate.get('category_labels', [text('category_text')])
    labels = labels if isinstance(labels, list) else []
    labels = [normalize_label(label) for label in labels if isinstance(label, str)]
    if any(category_requires_editor_review(label) for label in labels):
        reasons.append('category_requires_editor_review')
    elif text('kind') != 'event' and not any(
            normalize_label(label) in labels for label in ROUTINE_COUNTY_CATEGORIES
            if not category_requires_editor_review(label)):
        reasons.append('non_routine_category')
    if not mentions_paris(text('locality_text')):
        reasons.append('uncertain_locality')
    if not text('sensitive_text').strip() or BLOCK.search(text('sensitive_text')):
        reasons.append('sensitive_keyword')
    if candidate.get('parse_ok') is not True:
        reasons.append('parse_failure')
    date_keys = ('starts_at',) if text('kind') == 'event' else ('published_at', 'published', 'starts_at')
    raw = next((candidate.get(k) for k in date_keys
                if candidate.get(k) is not None and candidate.get(k) != ''), None)
    if raw is None:
        reasons.append('missing_date')
    else:
        try:
            def date(value):
                if isinstance(value, dt.datetime):
                    return value.date()
                if isinstance(value, dt.date):
                    return value
                return dt.datetime.fromisoformat(value).date()
            age = date(candidate.get('now')) - date(raw)
            window_ok = (-dt.timedelta(days=120) <= age <= dt.timedelta(0)
                         if text('kind') == 'event' else dt.timedelta(0) <= age <= dt.timedelta(days=5))
            if not window_ok:
                reasons.append('stale_or_future')
        except (ValueError, TypeError, OverflowError):
            reasons.append('parse_failure') if 'parse_failure' not in reasons else None
    if not 30 <= len(text('excerpt').strip()) <= 400:
        reasons.append('missing_excerpt')
    return Decision('hold' if reasons else 'publish', reasons)


def hold_record(row, reasons):
    """Build a non-public draft without mutating or persisting the input row."""
    return {**row, 'verification_status': 'draft',
            'verified_at': None,
            'tags_json': list(dict.fromkeys(['held-for-review', *reasons]))}
