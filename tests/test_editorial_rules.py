import datetime as dt
import time
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

    def test_normalisation_performance_limits(self):
        fixtures = [
            '\uFDFA' * 249_700,
            'a-' * 1_000_000,
            'routine text ' * (1_000_000 // len('routine text ') + 1),
            # Below the raw cap: must abort compatibility expansion too.
            '\uFDFA' * 10_000,
            'a' * 190_000 + '\uFDFA' * 1_000,
        ]
        for index, body in enumerate(fixtures):
            for field in ('sensitive_text', 'body'):
                with self.subTest(fixture=index, path='decide', field=field):
                    candidate = self.candidate()
                    candidate[field] = body
                    start = time.perf_counter()
                    decision = rules.decide(candidate)
                    elapsed = time.perf_counter() - start
                    self.assertEqual(decision.action, 'hold')
                    self.assertIn('normalisation_limit_exceeded', decision.reasons)
                    self.assertLess(elapsed, 0.5)
            with self.subTest(fixture=index, path='review'):
                page = ARTICLE.replace(
                    'Road work on Paris Main Street is scheduled this week.', body)
                start = time.perf_counter()
                with self.assertRaises(publisher.EditorialHold) as held:
                    publisher.review(URL, lambda url: page, NOW)
                elapsed = time.perf_counter() - start
                self.assertIn('normalisation_limit_exceeded', held.exception.reasons)
                self.assertLess(elapsed, 0.5)

    def test_normalise_identical_fields_once(self):
        candidate = self.candidate()
        candidate.update(title=candidate['sensitive_text'],
                         body=candidate['sensitive_text'],
                         residual=candidate['sensitive_text'])
        with patch.object(rules, 'normalize_field', wraps=rules.normalize_field) as normalize:
            self.assertEqual(rules.decide(candidate), ('publish', []))
        values = [call.args[0] for call in normalize.call_args_list]
        self.assertEqual(len(values), len(set(values)))

    def test_joined_unicode_hyphens_and_line_breaks_hold(self):
        for value in ['haz\nmat', 'haz\u2010ardous', 'haz\nardous', 'haz-\r\n  ardous',
                      'con\u2010tamination', 'con\u2011tamination']:
            with self.subTest(value=value):
                self.hold('sensitive_keyword', sensitive_text=value)

    def test_review_joins_hyphenated_title_and_body_whitespace(self):
        for hyphen in ('-', '\u2010', '\u2011'):
            for whitespace in ('\n', ' ', '\t', ' \t\r\n  \n'):
                for text in (f'Paris haz{hyphen}{whitespace}ardous materials',
                             f'Road con{hyphen}{whitespace}tamination in Paris'):
                    for field, original in (
                            ('title', 'Paris paving update</h1>'),
                            ('body', 'Road work on Paris Main Street is scheduled this week.')):
                        with self.subTest(text=text, field=field):
                            replacement = text + ('</h1>' if field == 'title' else '.')
                            page = ARTICLE.replace(original, replacement)
                            with self.assertRaises(publisher.EditorialHold) as held:
                                publisher.review(URL, lambda url: page, NOW)
                            self.assertIn('sensitive_keyword', held.exception.reasons)

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
            'contaminants', 'decontamination', 'leaky', 'leakage', 'chemically',
            'explosive', 'explosives', 'spillage', 'spill-response', 'spill-cleanup',
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

    def test_formerly_exempt_phrases_and_street_names_hold(self):
        for body in ['leak detection survey in Paris.',
                     'sinkhole repairs completed on Grand River St in Paris.',
                     'Chemical Road resurfacing in Paris.', 'Recall Lane paving in Paris.',
                     'Needle Street in Paris.', 'as we recall, Paris paving continues.',
                     'Spillway Road resurfacing in Paris.',
                     'Paris spill-over lane closure.']:
            with self.subTest(body=body):
                candidate = self.candidate()
                candidate['sensitive_text'] = body
                self.assertEqual(rules.decide(candidate),
                                 ('hold', ['sensitive_keyword']))
                page = ARTICLE.replace(
                    'Road work on Paris Main Street is scheduled this week.', body)
                with self.assertRaises(publisher.EditorialHold) as held:
                    publisher.review(URL, lambda url: page, NOW)
                self.assertIn('sensitive_keyword', held.exception.reasons)

    def test_review_hazard_phrases_in_each_article_field(self):
        # All 30 R2 cases: the original six phrases and four supplemental
        # phrases, each inserted into body, title, and residual/loose text.
        phrases = [
            'Fire road closed due to fire road spreading toward homes',
            'Emergency road closure in Paris',
            'Flood road closure in Paris',
            'school road closure',
            'medical road response',
            'evacuation road closure',
            'Emergency Road closure in Paris',
            'Flood Road closed in Paris',
            'fire street response in Paris',
            'Fire Road closed while flames spread toward homes',
        ]
        cases = [(phrase, field) for phrase in phrases
                 for field in ('body', 'title', 'residual')]
        cases.extend(('gas leak detection survey identified escaping gas', field)
                     for field in ('category', 'title', 'body', 'residual', 'meta_link'))
        self.assertEqual(len(cases), 35)
        # Keep the exact routine label and a healthy Paris article in every case.
        self.assertEqual(publisher.review(URL, lambda url: ARTICLE, NOW)[
            'verification_status'], 'verified')
        for phrase, field in cases:
            with self.subTest(phrase=phrase, field=field):
                pages = {
                    'category': ARTICLE.replace(
                        '<a title="Road Construction">Road Construction</a>',
                        '<a title="Road Construction">Road Construction</a>'
                        f'<a>{phrase}</a>'),
                    'title': ARTICLE.replace('Paris paving update</h1>',
                                             f'Paris {phrase}</h1>'),
                    'body': ARTICLE.replace(
                        'Road work on Paris Main Street is scheduled this week.',
                        f'Road work on Paris Main Street: {phrase}.'),
                    'residual': ARTICLE + f'<aside>{phrase}</aside>',
                    'meta_link': ARTICLE.replace(
                        '</section>', f'<span><a>{phrase}</a></span></section>'),
                }
                with self.assertRaises(publisher.EditorialHold) as held:
                    publisher.review(URL, lambda url: pages[field], NOW)
                self.assertIn('sensitive_keyword', held.exception.reasons)

    def test_review_screens_newline_split_hazards_in_each_article_field(self):
        self.assertEqual(publisher.review(URL, lambda url: ARTICLE, NOW)[
            'verification_status'], 'verified')
        for split in ('\n', '-\n'):
            for phrase in (f'haz{split}ardous materials on roadway',
                           f'con{split}tamination found in roadway soil',
                           f'haz{split}mat response on roadway'):
                for field in ('title', 'body', 'residual'):
                    for encoded in (False, True):
                        with self.subTest(phrase=phrase, field=field, encoded=encoded):
                            text = phrase.replace('\n', '&#10;') if encoded else phrase
                            text = f'Paris <span>{text}</span>'
                            pages = {
                                'title': ARTICLE.replace('Paris paving update</h1>',
                                                         f'{text}</h1>'),
                                'body': ARTICLE.replace(
                                    'Road work on Paris Main Street is scheduled this week.',
                                    text),
                                'residual': ARTICLE + f'<aside>{text}</aside>',
                            }
                            expected_title = (publisher.clean(text) if field == 'title'
                                              else 'Paris paving update')
                            with self.assertRaises(publisher.EditorialHold) as held:
                                publisher.review(URL, lambda url: pages[field], NOW,
                                                 expected_title=expected_title)
                            self.assertEqual(held.exception.reasons, ['sensitive_keyword'])
                            self.assertEqual(held.exception.row['title'], expected_title)

    def test_review_inline_and_separator_hazards_in_all_visible_fields(self):
        splits = ['haz<br>ardous', 'haz<wbr>ardous', 'haz<!-- split -->ardous',
                  '<b>con</b>tamination']
        splits.extend(f'<{tag}>haz</{tag}>ardous' for tag in
                      publisher.HazardTextParser.INLINE if tag not in
                      publisher.ArticleBodyParser.VOID)
        splits.extend(f'haz{sep}ardous' for sep in
                      ('\n', '\r\n', '\r', '\u2028', '\u2029', '\u0085', '\t', '\f', '\v'))
        for split in splits:
            for field in ('title', 'h1', 'h2', 'h3', 'body', 'residual'):
                with self.subTest(split=split, field=field):
                    text = f'Paris {split} materials on roadway.'
                    if field == 'title':
                        page = ARTICLE.replace('Paris paving update</h1>', f'{text}</h1>')
                    elif field == 'residual':
                        page = ARTICLE + f'<aside>{text}</aside>'
                    else:
                        insertion = text if field == 'body' else f'<{field}>{text}</{field}>'
                        page = ARTICLE.replace('See the County notice for details.', insertion)
                    started = time.perf_counter()
                    with self.assertRaises(publisher.EditorialHold) as held:
                        publisher.review(URL, lambda _: page, NOW,
                                         expected_title=publisher.clean(text) if field == 'title'
                                         else 'Paris paving update')
                    self.assertEqual(held.exception.reasons, ['sensitive_keyword'])
                    self.assertLess(time.perf_counter() - started, 0.5)

    def test_hazard_stream_keeps_block_boundaries_and_size_limit(self):
        for markup in ('<p>haz</p><p>ardous</p>', '<div>con</div><div>tamination</div>'):
            self.assertFalse(rules.contains_hazard(publisher.HazardTextParser.extract(markup)))
        for separator in ('\n', '\r\n', '\r', '\t'):
            page = ARTICLE.replace('Paris paving update</h1>',
                                   'Paris ' + separator * 200_001 + 'paving update</h1>')
            with self.subTest(separator=separator), self.assertRaises(
                    publisher.EditorialHold) as held:
                publisher.review(URL, lambda _: page, NOW)
            self.assertEqual(held.exception.reasons, ['normalisation_limit_exceeded'])

    def test_real_county_inline_hazard_and_benign_fixture(self):
        page = (publisher_tests.SCRIPT.parent.parent / 'tests' / 'fixtures' /
                'brant_grand_river_street_north.html').read_text()
        page = publisher.re.sub(
            r'(<span[^>]*gs-news-details-date[^>]*>).*?(</span>)',
            r'\g<1>Sep 28, 2026\2', page, flags=publisher.re.S)
        # Remove independent conservative policy blockers from the real road notice.
        page = page.replace('school', 'community centre').replace(
            'School', 'Community centre').replace('fire hall', 'municipal hall')
        row = publisher.review(URL, lambda _: page, NOW)
        self.assertEqual(row['verification_status'], 'verified')
        planted = page.replace('Major upgrades on Grand River Street North',
                               'Paris <span>haz</span>ardous materials on roadway. '
                               'Major upgrades on Grand River Street North', 1)
        with self.assertRaises(publisher.EditorialHold) as held:
            publisher.review(URL, lambda _: planted, NOW)
        self.assertEqual(held.exception.reasons, ['sensitive_keyword'])

    def test_benign_phrases_do_not_hide_incidents(self):
        for text in ['Chemical Road closed after chemical spill',
                     'leak detection found leakage',
                     'sinkhole repairs completed; another sinkhole opened',
                     'as we recall, a recall was issued',
                     'hazmat\nresponse', 'chemical\nspill']:
            with self.subTest(text=text):
                self.hold('sensitive_keyword', sensitive_text=text)

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
