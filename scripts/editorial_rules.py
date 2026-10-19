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


NORMALISATION_LIMIT = 200_000


class NormalisationLimitExceeded(ValueError):
    pass


def normalize_field(text):
    """Bound compatibility decomposition before allocating expanded text."""
    if len(text) > NORMALISATION_LIMIT:
        raise NormalisationLimitExceeded
    cap = min(2 * len(text), NORMALISATION_LIMIT)
    parts, size = [], 0
    for start in range(0, len(text), 1024):
        part = unicodedata.normalize('NFKD', text[start:start + 1024])
        size += len(part)
        if size > cap:
            raise NormalisationLimitExceeded
        parts.append(part)
    text = ''.join(char for part in parts for char in part
                   if not unicodedata.combining(char)
                   and unicodedata.category(char) != 'Cf')
    return text.translate(_CONFUSABLES).casefold()


def _label_from_normalized(text):
    text = text.replace('&', ' and ').replace('+', ' and ')
    return re.sub(r'[\W_]+', ' ', text).strip()


def normalize_label(text):
    """Canonicalize labels with the same bounded normalization as screening."""
    return _label_from_normalized(normalize_field(text))


EDITOR_REQUIRED_LABELS = re.compile(
    r'\b(?:green bin|blue box|recyclables?|recycling|organics|compost|'
    r'garbage|waste|wastewater|sewers?)\b')


def category_requires_editor_review(label):
    normalized = normalize_label(label)
    return _category_requires_editor_review(normalized)


def _category_requires_editor_review(normalized):
    return (normalized == 'garbage and recycling'
            or EDITOR_REQUIRED_LABELS.search(normalized) is not None)


BLOCK = re.compile(
    r'\b(emergency|evacuat\w*|flood\w*|election\w*|vot\w*|fatal\w*|death|fire|'
    r'spills?|spillway|spilled|spilling|toxic|hazardous|hazmat|contaminants?|decontaminat\w*|'
    r'contaminat\w*|needles?|sharps|recall\w*|chemicals?|chemically|explosives?|explosions?|explod\w*|'
    r'sinkholes?|leak|leaks|leaking|leaked|leaky|leakage|spillage|asbestos|gas\s+leak\w*|'
    r'shelter.in.place|boil.water|drinking.water|school|medical|health|outage|'
    r'ignore previous instructions|system prompt)\b', re.I)


_JOIN_SPLITS = re.compile(
    r'(?<=\w)[-\u2010\u2011]?[ \t]*\r?\n[ \t]*(?=\w)|(?<=\w)[-\u2010\u2011](?=\w)')


def _contains_hazard(normalized):
    # One join pass handles plain newlines and ASCII/Unicode hyphen splits.
    joined = _JOIN_SPLITS.sub('', normalized)
    for copy in (normalized, joined):
        screening = re.sub(r'[^\w-]+|_', ' ', copy)
        if BLOCK.search(copy) or BLOCK.search(screening):
            return True
    return False


def contains_hazard(value):
    return _contains_hazard(normalize_field(value))



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
    try:
        return _decide(candidate)
    except NormalisationLimitExceeded:
        return Decision('hold', ['normalisation_limit_exceeded'])


def _decide(candidate):
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
    labels = [label for label in labels if isinstance(label, str)]
    fields = [text(key) for key in (
        'sensitive_text', 'category_text', 'title', 'body', 'residual')]
    # Check raw lengths before stripping, hashing, or Unicode work.
    if any(len(value) > NORMALISATION_LIMIT for value in [*fields, *labels]):
        raise NormalisationLimitExceeded
    normalized = {value: normalize_field(value) for value in dict.fromkeys([*fields, *labels])}
    raw_labels = labels
    labels = [label.strip(' \t\n\r\v\f') for label in labels]
    if any(_category_requires_editor_review(_label_from_normalized(normalized[label]))
           for label in raw_labels):

        reasons.append('category_requires_editor_review')
    elif text('kind') != 'event' and not any(
            label == 'Road Construction' for label in labels):
        reasons.append('non_routine_category')
    if not mentions_paris(text('locality_text')):
        reasons.append('uncertain_locality')
    sensitive_fields = normalized.values()
    if not any(text(key).strip() for key in ('sensitive_text', 'body')) or any(
            _contains_hazard(value)
            for value in sensitive_fields):
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
