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

    def test_sensitive_labels_and_normalized_text(self):
        for hazard in ['Chemical Spill', 'Emergency', 'Emer\u200bgency', 'ＦＩＲＥ', 'flооd']:
            with self.subTest(hazard=hazard):
                self.hold('sensitive_keyword', category_labels=['Road Construction', hazard])
                self.hold('sensitive_keyword', sensitive_text=hazard)

    def test_added_body_hazards(self):
        hazards = [
            'hazmat', 'contaminant', 'contamination', 'contaminated',
            'needle', 'needles', 'sharps', 'recall', 'recalled', 'recalls',
            'chemical', 'chemicals', 'explosion', 'explosions', 'explode',
            'exploded', 'exploding', 'sinkhole', 'sinkholes',
            'leak', 'leaks', 'leaking', 'leaked', 'spill', 'spills',
            'spilled', 'spilling', 'haz-\nardous spill', 'haz-\nardous',
            'con-tamination', 'cóntaminant',
        ]
        for hazard in hazards:
            with self.subTest(hazard=hazard):
                self.hold('sensitive_keyword', sensitive_text=f'Paris update: {hazard}.')

    def test_benign_spill_names_and_compounds_publish(self):
        for body in ['Spillway Road resurfacing in Paris.',
                     'Paris spill-over lane closure.']:
            with self.subTest(body=body):
                candidate = self.candidate()
                candidate['sensitive_text'] = body
                self.assertEqual(rules.decide(candidate),
                                 ('publish', []))
                page = ARTICLE.replace(
                    'Road work on Paris Main Street is scheduled this week.', body)
                self.assertEqual(publisher.review(URL, lambda url: page, NOW)[
                    'verification_status'], 'verified')

    def test_editor_label_substrings_do_not_require_review(self):
        for label in ['Wastebasket collection', 'Sewerage', 'Composting',
                      'Organicsville', 'Green Binsville', 'Recyclablesville']:
            with self.subTest(label=label):
                self.assertFalse(rules.category_requires_editor_review(label))
                self.assertEqual(rules.decide(self.candidate(
                    category_labels=['Road Construction', label])), ('publish', []))

    def test_review_screens_all_metadata_and_article_text(self):
        pages = []
        for hazard in ['Chemical Spill', 'Emergency', 'Emer\u200bgency']:
            for labels in [('Road Construction', hazard), (hazard, 'Road Construction')]:
                pages.append(ARTICLE.replace(
                    '<a title="Road Construction">Road Construction</a>',
                    ''.join(f'<a>{label}</a>' for label in labels)))
        for hazard in ['Chemical Spill', 'Emer\u200bgency', 'ＦＩＲＥ', 'flооd']:
            # Metadata links outside the category list and plain metadata text
            # must receive the same screening as title, body and loose text.
            pages.extend([
                ARTICLE.replace('</section>', f'<span><a>{hazard}</a></span></section>'),
                ARTICLE.replace('</section>', f'<span>{hazard}</span></section>'),
                ARTICLE.replace('Paris paving update</h1>', f'Paris {hazard} update</h1>'),
                ARTICLE.replace('Road work on Paris', f'{hazard} on Paris'),
                ARTICLE + f'<aside>{hazard}</aside>',
            ])
        for page in pages:
            with self.subTest(page=page):
                with self.assertRaises(publisher.EditorialHold) as held:
                    publisher.review(URL, lambda url: page, NOW)
                self.assertIn('sensitive_keyword', held.exception.reasons)
        self.assertEqual(publisher.review(URL, lambda url: ARTICLE, NOW)[
            'verification_status'], 'verified')

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

    def test_review_mixed_categories_are_waste_drafts_in_either_order(self):
        cases = [
            ('Paris paving update', 'Road work on Paris Main Street is scheduled this week.'),
            ('Paris waste update',
             'A hazardous chemical spill in Paris has contaminated the collection site.'),
            ('Brantford green bin update',
             'Brantford green bin collection changes only in Brantford. Paris collection is unchanged.'),
        ]
        for labels in [('Road Construction', 'Garbage and Recycling'),
                       ('Garbage and Recycling', 'Road Construction')]:
            for title, body in cases:
                with self.subTest(labels=labels, title=title):
                    links = ''.join(f'<a href="/category/">{label}</a>' for label in labels)
                    page = f'''<main><h1 class="main">{title}</h1>
<section class="gs-news-details-meta">
<span class="gs-news-details-date">Sep 28, 2026</span>{links}</section>
<div class="text base-text"><p>{body}</p></div></main>'''
                    with self.assertRaises(publisher.EditorialHold) as held:
                        publisher.review(URL, lambda url: page, NOW)
                    self.assertIn('category_requires_editor_review', held.exception.reasons)
                    self.assertEqual(str(held.exception), 'Category requires editor review')
                    self.assertEqual(held.exception.row['category'], 'waste')
                    self.assertEqual(held.exception.row['verification_status'], 'draft')
                    self.assertIsNone(held.exception.row['verified_at'])
                    self.assertIn('category_requires_editor_review', held.exception.row['tags_json'])

    def test_review_normalized_editor_categories_in_both_orders(self):
        labels = [
            'Garbage and recycling', 'GARBAGE & RECYCLING',
            'Garbage  and\tRecycling', 'Ｇａｒｂａｇｅ and Recycling',
            'Gar\u200bbage and Recycling', 'Gаrbаge and Recycling',
            'Waste Collection', 'Garbage + Recycling',
            'Gar\u200cbage and Recycling', 'Gar\u200dbage and Recycling',
            'Gar\u2060bage and Recycling', 'Gar\ufeffbage and Recycling',
            'Gar\u00adbage and Recycling', 'Gαrbαge and Recycling',
            'Recycling service update',
            'Green Bin', 'Blue Box', 'Recyclable', 'Recyclables', 'Recycling',
            'Organics', 'Compost', 'Garbage', 'Waste', 'Wastewater', 'Sewer',
            'Sewers', 'GREEN-BIN collection', 'Blue Box service',
        ]
        for label in labels:
            for ordered in [('Road Construction', label), (label, 'Road Construction')]:
                with self.subTest(labels=ordered):
                    page = ARTICLE.replace('Road Construction', '</a><a>'.join(ordered))
                    with self.assertRaises(publisher.EditorialHold) as held:
                        publisher.review(URL, lambda url: page, NOW)
                    self.assertIn('category_requires_editor_review', held.exception.reasons)
                    self.assertEqual(held.exception.row['category'], 'waste')
                    self.assertEqual(held.exception.row['verification_status'], 'draft')
                    self.assertIsNone(held.exception.row['verified_at'])

    def test_review_exact_road_label_publishes(self):
        for label in ['Road Construction', ' \t\r\n\v\fRoad Construction \t\r\n\v\f']:
            with self.subTest(label=label):
                page = ARTICLE.replace('Road Construction', label)
                row = publisher.review(URL, lambda url: page, NOW)
                self.assertEqual(row['category'], 'construction')
                self.assertEqual(row['verification_status'], 'verified')

    def test_review_non_exact_road_labels_hold(self):
        labels = [' road construction ', 'Road construction', 'ROAD CONSTRUCTION',
                  'Road Con\u200bstruction', 'Road  Construction',
                  'Road\tConstruction', '\u00a0Road Construction\u00a0',
                  'Ｒｏａｄ Construction']
        for label in labels:
            with self.subTest(label=label):
                self.hold('non_routine_category', category_labels=[label])
                page = ARTICLE.replace('Road Construction', label)
                with self.assertRaises(publisher.EditorialHold) as held:
                    publisher.review(URL, lambda url: page, NOW)
                self.assertIn('non_routine_category', held.exception.reasons)

    def test_review_non_exact_road_labels_with_sensitive_bodies_hold(self):
        for label in ['Road construction', 'ROAD CONSTRUCTION', 'Road Con\u200bstruction']:
            for body in ['Hazmat response in Paris after a tanker crash.',
                         'Waste collection in Paris.',
                         'Used needles and sharps found along Paris sidewalks.',
                         'A sinkhole opened in Paris.']:
                with self.subTest(label=label, body=body):
                    page = ARTICLE.replace('Road Construction', label).replace(
                        'Road work on Paris Main Street is scheduled this week.', body)
                    with self.assertRaises(publisher.EditorialHold) as held:
                        publisher.review(URL, lambda url: page, NOW)
                    self.assertIn('non_routine_category', held.exception.reasons)

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
