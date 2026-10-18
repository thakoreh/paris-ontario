import datetime as dt
import unittest
from unittest.mock import patch

from scripts import editorial_rules as rules
from test_official_publisher import publisher, ARTICLE, NOW, URL
import test_official_publisher as publisher_tests


class EditorialRulesTests(unittest.TestCase):
    def candidate(self, **changes):
        return dict(authority_level='official', category_text='Road Construction',
                    locality_text='Paris, Ontario', sensitive_text='Routine paving in Paris.',
                    published_at=NOW.date(), now=NOW, parse_ok=True,
                    excerpt='Road work in Paris is scheduled this week.', **changes)

    def hold(self, code, **changes):
        candidate = self.candidate()
        candidate.update(changes)
        result = rules.decide(candidate)
        self.assertEqual(result.action, 'hold')
        self.assertIn(code, result.reasons)

    def test_publish_road(self):
        self.assertEqual(rules.decide(self.candidate()), ('publish', []))

    def test_publish_waste(self):
        candidate = self.candidate()
        candidate['category_text'] = 'Garbage and Recycling'
        candidate['routine_text'] = 'Paris collection schedule changes Tuesday.'
        self.assertEqual(rules.decide(candidate).action, 'publish')

    def test_untrusted_source(self):
        for authority in ['community', 'aggregator', 'official_agency', 'unknown', None]:
            self.hold('untrusted_source', authority_level=authority)

    def test_non_routine_category(self):
        self.hold('non_routine_category', category_text='Recreation')

    def test_uncertain_locality(self):
        self.hold('uncertain_locality', locality_text='Brantford')

    def test_france_is_not_local(self):
        self.hold('uncertain_locality', locality_text='Paris, France')

    def test_sensitive_keyword(self):
        self.hold('sensitive_keyword', sensitive_text='A school is affected.')

    def test_parse_failure(self):
        self.hold('parse_failure', parse_ok=False)
        self.hold('parse_failure', published_at='invalid')

    def test_missing_date(self):
        self.hold('missing_date', published_at=None)

    def test_missing_excerpt(self):
        for excerpt in ['', 'short', 'x' * 401, None]:
            self.hold('missing_excerpt', excerpt=excerpt)

    def test_stale_or_future(self):
        for days in [-6, 1]:
            self.hold('stale_or_future', published_at=NOW.date() + dt.timedelta(days=days))
        candidate = self.candidate()
        candidate['published_at'] -= dt.timedelta(days=5)
        self.assertEqual(rules.decide(candidate).action, 'publish')

    def test_missing_fields_fail_closed(self):
        self.assertEqual(rules.decide({}).action, 'hold')
        for key in self.candidate():
            candidate = self.candidate()
            del candidate[key]
            with self.subTest(key=key):
                self.assertEqual(rules.decide(candidate).action, 'hold')

    def test_starts_at_date(self):
        candidate = self.candidate()
        candidate['starts_at'] = candidate.pop('published_at').isoformat()
        self.assertEqual(rules.decide(candidate).action, 'publish')

    def test_hold_record(self):
        row = publisher.review(URL, lambda url: ARTICLE, NOW)
        draft = rules.hold_record(row, ['uncertain_locality'])
        self.assertEqual(draft['verification_status'], 'draft')
        self.assertEqual(draft['tags_json'], ['held-for-review', 'uncertain_locality'])
        self.assertEqual(row['verification_status'], 'verified')
        with self.assertRaises(ValueError):
            publisher.publish(draft, None, NOW)

    def test_review_paris_garbage(self):
        page = '''<h1 class="main">Paris collection update</h1>
<section class="gs-news-details-meta"><span class="gs-news-details-date">Sep 28, 2026</span>
<a>Garbage and Recycling</a></section><div class="text base-text">
<p>Garbage collection in Paris is scheduled for Tuesday this week.</p></div>'''
        self.assertEqual(publisher.review(URL, lambda url: page, NOW)['category'], 'waste')
        with self.assertRaisesRegex(publisher.EditorialHold, 'Not demonstrably Paris-specific'):
            publisher.review(URL, lambda url: page.replace('Paris', 'Brantford'), NOW)

    def waste_page(self, title, body, loose=''):
        return f'''<main><h1 class="main">{title}</h1>
<section class="gs-news-details-meta"><span class="gs-news-details-date">Sep 28, 2026</span>
<a>Garbage and Recycling</a></section><div class="text base-text">
<p>{body}</p></div>{loose}</main>'''

    def test_review_waste_incidents_held(self):
        cases = [
            ('Paris hazardous spill', 'A hazardous chemical spill in Paris has contaminated the collection site.'),
            ('Paris waste update', 'Toxic waste has leaked at the Paris collection site.'),
            ('Paris collection schedule', 'Contamination affects the Paris collection site.'),
            ('Paris collection schedule', 'Evacuation is required near the Paris collection site.'),
            ('Paris collection schedule', 'A safety warning applies to the Paris collection site.'),
            ('Paris hazardous material', 'The Paris collection schedule has changed today.'),
            ('Paris waste update', 'The Paris waste facility has a new manager this week.'),
        ]
        for title, body in cases:
            with self.subTest(title=title, body=body):
                with self.assertRaises(publisher.EditorialHold) as held:
                    publisher.review(URL, lambda url: self.waste_page(title, body), NOW)
                self.assertIn('non_routine_waste', held.exception.reasons)

    def test_review_routine_waste_publishes(self):
        for title in [
            'Paris garbage collection delayed one day for Thanksgiving',
            'Household hazardous waste drop-off event in Paris on Saturday',
        ]:
            with self.subTest(title=title):
                page = self.waste_page(title, title + '.')
                row = publisher.review(URL, lambda url: page, NOW)
                self.assertEqual(row['category'], 'waste')
                self.assertEqual(row['verification_status'], 'verified')

    def test_review_waste_hazards_in_all_text(self):
        hazards = ['spillages', 'toxic', 'chemicals', 'contaminated', 'leaking',
                   'safety', 'unsafe', 'emergency', 'evacuating', 'hazmat',
                   'fumes', 'smoke', 'explosion', 'injuries', 'warning',
                   'advisory', 'do not', 'avoid', 'hazardous material']
        for hazard in hazards:
            for location in ['title', 'body', 'loose']:
                with self.subTest(hazard=hazard, location=location):
                    title = 'Paris collection schedule'
                    body = 'Paris garbage collection is scheduled for Tuesday this week.'
                    loose = ''
                    if location == 'title':
                        title += ' ' + hazard
                    elif location == 'body':
                        body += ' ' + hazard
                    else:
                        loose = '<aside>' + hazard + '</aside>'
                    page = self.waste_page(title, body, loose)
                    with self.assertRaises(publisher.EditorialHold) as held:
                        publisher.review(URL, lambda url: page, NOW)
                    self.assertIn('non_routine_waste', held.exception.reasons)

    def test_held_draft_flag_and_dry_run(self):
        import pathlib
        import tempfile
        now = dt.datetime.now(publisher.UTC)
        page = ARTICLE.replace('Road Construction', 'Recreation').replace(
            'Sep 28, 2026', now.strftime('%b %d, %Y'))

        class DB:
            def __init__(self):
                self.rows = []
            def source_ready(self): return True
            def existing(self, *args): return None
            def today_count(self, now): return len(self.rows)
            def create(self, row):
                self.rows.append(row)
                return {'id': 'draft'}
            def read(self, id): return self.rows[-1]
            def audit_run(self, outcome): pass

        for enabled, flag, expected in [(True, '0', 0), (True, '1', 1), (False, '1', 0)]:
            db = DB()
            with tempfile.TemporaryDirectory() as tmp, patch.dict(
                    'os.environ', {'PARIS_PULSE_WRITE_HELD_DRAFTS': flag}), patch.object(
                    publisher, 'STATE_DIR', pathlib.Path(tmp)), patch.object(
                    publisher, 'fetch', return_value=(page, URL)), patch.object(
                    publisher, 'collect_feed', return_value={URL: 'Paris paving update'}), patch.object(
                    publisher, 'Supabase', return_value=db):
                # Feed fetch must retain its own authorized final URL.
                with patch.object(publisher, 'fetch', side_effect=lambda url:
                                  (page, publisher.FEED_URL if url == publisher.FEED_URL else URL)):
                    outcome = publisher.run(enabled)
            self.assertEqual(outcome['errors'], [])
            self.assertEqual(len(db.rows), expected)
            if expected:
                self.assertEqual(db.rows[0]['verification_status'], 'draft')
                self.assertIn('non_routine_category', db.rows[0]['tags_json'])

    def test_default_held_items_are_not_inserted(self):
        helper = publisher_tests.PublisherTests()
        with patch.dict('os.environ', {'PARIS_PULSE_WRITE_HELD_DRAFTS': '0'}):
            outcome, requests = helper.run_article_fixture(ARTICLE.replace('Road Construction', 'Recreation'))
        self.assertEqual(len(outcome['held']), 1)
        self.assertFalse(any(table == 'notices' and method == 'POST' for table, method, _ in requests))


if __name__ == '__main__':
    unittest.main()
