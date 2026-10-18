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

    def test_review_waste_is_draft_only(self):
        now = dt.datetime.now(publisher.UTC)
        cases = [
            ('Paris waste update', 'Asbestos was found at the Paris transfer station.'),
            ('Paris waste update', 'Paris green bin collection is suspended after discarded needles were found.'),
            ('Paris waste update', 'A gas leak near the Paris depot: residents should shelter in place.'),
            ('Paris waste update', 'A contaminant was found in Paris green bins.'),
            ('Brantford green bin update',
             'Brantford green bin collection changes only in Brantford. Paris collection is unchanged.'),
            ('Paris garbage collection delayed one day for Thanksgiving',
             'Paris garbage collection delayed one day for Thanksgiving.'),
        ]
        for title, body in cases:
            with self.subTest(title=title, body=body):
                page = f'''<main><h1 class="main">{title}</h1>
<section class="gs-news-details-meta">
<span class="gs-news-details-date">{now.strftime('%b %d, %Y')}</span>
<a>Garbage and Recycling</a></section><div class="text base-text">
<p>{body}</p></div></main>'''
                with self.assertRaises(publisher.EditorialHold) as held:
                    publisher.review(URL, lambda url: page, now)
                self.assertIn('category_requires_editor_review', held.exception.reasons)
                self.assertEqual(str(held.exception), 'Category requires editor review')
                self.assertEqual(held.exception.row['category'], 'waste')
                self.assertEqual(held.exception.row['verification_status'], 'draft')
                self.assertIsNone(held.exception.row['verified_at'])

    def test_review_paris_road_publishes(self):
        row = publisher.review(URL, lambda url: ARTICLE, NOW)
        self.assertEqual(row['category'], 'construction')
        self.assertEqual(row['verification_status'], 'verified')

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
            def today_count(self, now): return sum(r['verification_status'] == 'verified' for r in self.rows)
            def draft_count(self, now): return sum(r['verification_status'] == 'draft' for r in self.rows)
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
