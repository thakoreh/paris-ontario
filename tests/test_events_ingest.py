import datetime as dt
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch
import urllib.error

from scripts import events_ingest as ingest

FIXTURES = Path(__file__).parent / 'fixtures' / 'pipeline'
NOW = dt.datetime(2026, 10, 18, 19, tzinfo=dt.timezone.utc)
URL = 'https://brantevents.org/events/synthetic/'
ROBOTS = 'User-agent: *\nDisallow:\n'


class EventsTests(unittest.TestCase):
    def setUp(self):
        self.paris = (FIXTURES / 'brantevents-event-paris-synthetic.html').read_text()
        self.real = (FIXTURES / 'brantevents-event-brantford.html').read_text()
        self.rss = (FIXTURES / 'brantevents-sample.rss').read_text()

    def test_paris_still_held(self):
        row, result = ingest.review(URL, self.paris, NOW)
        self.assertEqual(result['reasons'], ['untrusted_source'])
        self.assertEqual(result['decision'], 'hold')
        self.assertEqual(row['verification_status'], 'draft')
        self.assertEqual(row['source_id'], ingest.BRANT_EVENTS_SOURCE_ID)
        self.assertIn('source-attribution:brantevents.org', row['tags_json'])
        self.assertEqual(row['external_id'], 'brant-events:synthetic')
        self.assertEqual(row['start_at'], result['starts_at'])
        self.assertTrue(row['summary'].endswith(ingest.ATTRIBUTION))

    def test_real_brantford(self):
        _, result = ingest.review(URL, self.real, NOW)
        self.assertIn('uncertain_locality', result['reasons'])
        self.assertIn('untrusted_source', result['reasons'])

    def test_missing_bad_past_and_far_dates(self):
        for page, reason in [
            (self.paris.replace('"startDate":"2026-10-24T18:00:00+00:00",', ''), 'missing_date'),
            (self.paris.replace('2026-10-24T18:00:00+00:00', 'invalid'), 'parse_failure'),
            (self.paris.replace('2026-10-24', '2026-10-01'), 'event_ended'),
            (self.paris.replace('2026-10-24', '2027-10-24'), 'stale_or_future'),
        ]:
            with self.subTest(reason=reason):
                _, result = ingest.review(URL, page, NOW)
                self.assertEqual(result['decision'], 'hold')
                self.assertIn(reason, result['reasons'])

    def test_disallowed_before_fetch(self):
        with patch.object(ingest.urllib.request, 'build_opener') as opener:
            for url in [URL + '?q=x', URL + '?', URL.replace('brantevents.org', 'example.org'),
                        URL + '#x', 'https://brantevents.org:443/events/a/']:
                with self.assertRaises(ValueError):
                    ingest.fetch(url)
            opener.assert_not_called()

    def test_redirect_rejected(self):
        with patch.object(ingest.urllib.request, 'build_opener') as opener:
            opener.return_value.open.side_effect = urllib.error.HTTPError(URL, 302, 'redirect', {}, None)
            with self.assertRaises(urllib.error.HTTPError):
                ingest.fetch(URL)
            self.assertIsNone(ingest.NoRedirect().redirect_request(None, None, 302, '', {}, URL))

    def test_size_cap_and_headers(self):
        response = Mock(status=200)
        response.geturl.return_value = URL
        response.read.return_value = b'x' * (ingest.MAX_BYTES + 1)
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        with patch.object(ingest.urllib.request, 'build_opener') as opener:
            opener.return_value.open.return_value = response
            with self.assertRaises(ValueError):
                ingest.fetch(URL)
            args, kwargs = opener.return_value.open.call_args
            self.assertEqual(kwargs['timeout'], 12)
            self.assertEqual(args[0].get_header('User-agent'), 'ParisPulseBot/1.0 (+https://parispulse.ca)')
            response.read.assert_called_once_with(ingest.MAX_BYTES + 1)

    def test_dry_run_real_feed_never_constructs_client(self):
        calls, sleeps = [], []
        def fetcher(url):
            calls.append(url)
            return ROBOTS if url == ingest.ROBOTS_URL else self.rss if url == ingest.FEED_URL else self.real
        with tempfile.TemporaryDirectory() as directory, patch.object(ingest, 'HeldDraftStore') as client:
            result = ingest.run(fetcher=fetcher, sleep=sleeps.append, now=NOW, state_dir=directory)
            client.assert_not_called()
            self.assertEqual(result['found'], 3)
            self.assertEqual(len(result['candidates']), 3)
            self.assertEqual(sleeps, [1.0] * 4)
            self.assertEqual(calls[:2], [ingest.ROBOTS_URL, ingest.FEED_URL])
            for candidate in result['candidates']:
                self.assertIn('untrusted_source', candidate['reasons'])
                self.assertIn('uncertain_locality', candidate['reasons'])
            self.assertEqual(len((Path(directory) / 'audit.jsonl').read_text().splitlines()), 1)

    def test_page_cap_and_bad_discovery(self):
        urls = [f'https://brantevents.org/events/item-{i}/' for i in range(45)] + [URL + '?q=x']
        rss = '<rss><channel>' + ''.join('<item><link>' + url + '</link></item>' for url in urls) + '</channel></rss>'
        fetcher = Mock(side_effect=lambda url: ROBOTS if url == ingest.ROBOTS_URL else rss if url == ingest.FEED_URL else self.paris)
        sleep = Mock()
        with tempfile.TemporaryDirectory() as directory:
            result = ingest.run(fetcher=fetcher, sleep=sleep, now=NOW, state_dir=directory)
        self.assertEqual(result['found'], 45)
        self.assertEqual(len(result['candidates']), 40)
        self.assertEqual(fetcher.call_count, 42)
        self.assertEqual(sleep.call_count, 41)
        self.assertEqual(len(result['errors']), 1)

    def test_redacts_query_and_fragment_details(self):
        for suffix in ('?token=SECRET', '#SECRET', '?token=SECRET#SECRET'):
            self.assertEqual(ingest.redact_url_details('https://evil.example/' + suffix),
                             '<rejected-url host=evil.example>')
        self.assertEqual(ingest.redact_url_details(URL), URL)

    def test_rejected_link_and_errors_redact_secrets(self):
        secret_url = 'https://evil.example/?token=FAKE-SECRET-CANARY#PRIVATE-FRAGMENT'
        rss = '<rss><channel><item><link>' + secret_url + '</link></item></channel></rss>'
        for feed in [rss, self.rss, None]:
            with self.subTest(feed=feed):
                def fetcher(url):
                    if url == ingest.ROBOTS_URL:
                        return ROBOTS
                    if url == ingest.FEED_URL and feed is not None:
                        return feed
                    raise ValueError('Failed fetching ' + secret_url)
                with tempfile.TemporaryDirectory() as directory:
                    result = ingest.run(fetcher=fetcher, sleep=Mock(), now=NOW, state_dir=directory)
                    audit = (Path(directory) / 'audit.jsonl').read_text()
                for output in (json.dumps(result), audit):
                    self.assertNotIn('FAKE-SECRET-CANARY', output)
                    self.assertNotIn('PRIVATE-FRAGMENT', output)
                    if feed == rss:
                        self.assertIn('<rejected-url host=evil.example>', output)
                    else:
                        self.assertIn('ValueError: rejected', output)
                self.assertTrue(result['errors'])

    def test_rejected_userinfo_and_encoded_path_never_leak(self):
        for secret_url in ('https://user:FAKE-USERINFO@evil.example/path',
                           'https://evil.example/FAKE-PATH%2DSECRET'):
            with self.subTest(url=secret_url), tempfile.TemporaryDirectory() as directory:
                rss = '<rss><channel><item><link>' + secret_url + '</link></item></channel></rss>'
                fetcher = Mock(side_effect=[ROBOTS, rss])
                result = ingest.run(fetcher=fetcher, sleep=Mock(), now=NOW, state_dir=directory)
                audit = (Path(directory) / 'audit.jsonl').read_text()
                self.assertEqual(result['found'], 0)
                self.assertEqual(result['candidates'], [])
                self.assertEqual(result['errors'], [{
                    'url': '<rejected-url host=evil.example>',
                    'error': 'URL outside fixed allowlist',
                }])
                self.assertEqual([call.args[0] for call in fetcher.call_args_list],
                                 [ingest.ROBOTS_URL, ingest.FEED_URL])
                self.assertEqual(json.loads(audit), result)
                for output in (json.dumps(result), audit):
                    for secret in (secret_url, 'FAKE-USERINFO', 'FAKE-PATH%2DSECRET',
                                   'FAKE-PATH-SECRET', 'user:', '/path'):
                        self.assertNotIn(secret, output)

    def test_exception_message_and_whitespace_text_never_leak(self):
        message = ('FAKE-EXCEPTION-SECRET whitespace-separated private text\tprivate-tab'
                   '\nprivate-newline https://user:FAKE-USERINFO@evil.example/path '
                   'https://evil.example/FAKE-PATH%2DSECRET')
        for stage in ('feed', 'page'):
            with self.subTest(stage=stage), tempfile.TemporaryDirectory() as directory:
                rss = '<rss><channel><item><link>' + URL + '</link></item></channel></rss>'
                responses = [ROBOTS, RuntimeError(message)] if stage == 'feed' else [ROBOTS, rss, RuntimeError(message)]
                fetcher = Mock(side_effect=responses)
                result = ingest.run(fetcher=fetcher, sleep=Mock(), now=NOW, state_dir=directory)
                audit = (Path(directory) / 'audit.jsonl').read_text()
                expected_error = {'error': 'RuntimeError: rejected'}
                if stage == 'page':
                    expected_error['url'] = URL
                self.assertEqual(result['errors'], [expected_error])
                self.assertEqual(result['candidates'], [])
                self.assertEqual(result['found'], int(stage == 'page'))
                self.assertEqual(fetcher.call_count, len(responses))
                self.assertEqual(json.loads(audit), result)
                for output in (json.dumps(result), audit):
                    for secret in message.split():
                        self.assertNotIn(secret, output)

    def test_empty_feed_fails_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            result = ingest.run(fetcher=lambda url: ROBOTS if url == ingest.ROBOTS_URL else '<rss><channel/></rss>',
                                sleep=Mock(), now=NOW, state_dir=directory)
        self.assertEqual(result['candidates'], [])
        self.assertTrue(result['errors'])

    def run_policy(self, robots):
        def fetcher(url):
            if url == ingest.ROBOTS_URL:
                if isinstance(robots, Exception):
                    raise robots
                return robots
            return self.rss if url == ingest.FEED_URL else self.paris
        fetcher = Mock(side_effect=fetcher)
        sleep = Mock()
        with tempfile.TemporaryDirectory() as directory:
            result = ingest.run(fetcher=fetcher, sleep=sleep, now=NOW, state_dir=directory)
        return result, [call.args[0] for call in fetcher.call_args_list], sleep

    def test_robots_disallow_pages_and_feed(self):
        result, calls, _ = self.run_policy('User-agent: *\nDisallow: /events/\n')
        self.assertEqual(calls, [ingest.ROBOTS_URL, ingest.FEED_URL])
        self.assertEqual(len(result['errors']), 3)
        self.assertEqual(result['candidates'], [])
        result, calls, _ = self.run_policy('User-agent: *\nDisallow: /events.rss\n')
        self.assertEqual(calls, [ingest.ROBOTS_URL])
        self.assertTrue(result['errors'])

    def test_robots_encoded_feed_disallowed_before_fetch(self):
        result, calls, _ = self.run_policy('User-agent: *\nDisallow: /%65vents.rss')
        self.assertEqual(calls, [ingest.ROBOTS_URL])
        self.assertEqual(result['candidates'], [])
        self.assertIn('robots.txt disallowed', result['errors'][0]['error'])

    def test_robots_encoded_page_disallowed_before_fetch(self):
        url = 'https://brantevents.org/events/probe/'
        fetcher = Mock(side_effect=[
            'User-agent: *\nDisallow: /events/%70robe/',
            f'<rss><channel><item><link>{url}</link></item></channel></rss>',
        ])
        with tempfile.TemporaryDirectory() as directory:
            result = ingest.run(fetcher=fetcher, sleep=Mock(), now=NOW, state_dir=directory)
        self.assertEqual([call.args[0] for call in fetcher.call_args_list],
                         [ingest.ROBOTS_URL, ingest.FEED_URL])
        self.assertEqual(result['candidates'], [])
        self.assertEqual(result['errors'], [{'url': url, 'error': 'robots.txt disallowed'}])

    def test_robots_normalized_paths(self):
        cases = [
            ('/%65vents.rss', '/events.rss', False),
            ('/events/%70robe/', '/events/probe/', False),
            ('/events/probe/', '/%65vents/%70robe/', False),
            ('/literal%2Fpath', '/literal/path', True),
            ('/literal/path', '/literal%2Fpath', True),
            ('/literal%2fpath', '/literal%2Fpath', False),
            ('/literal%2Fpath', '/literal%2fpath', False),
            ('/café/', '/caf%c3%a9/', False),
            ('/caf%C3%A9/', '/café/', False),
            ('/%65vents/*%70robe$', '/events/a/probe', False),
            ('/%65vents/*%70robe$', '/events/a/probe/extra', True),
        ]
        for rule, path, permitted in cases:
            with self.subTest(rule=rule, path=path):
                policy, _ = ingest.robots_policy('User-agent: *\nDisallow: ' + rule)
                self.assertEqual(policy.can_fetch(ingest.UA_TOKEN,
                                                 'https://brantevents.org' + path), permitted)

    def test_robots_reserved_octets_reference_cases(self):
        # Expected disallow results from /tmp/rfc-ref.py norm()/deny().
        for encoded, literal in [('%3F', '?'), ('%3D', '='), ('%26', '&'),
                                 ('%24', '$'), ('%2A', '*')]:
            cases = [
                ('/a' + encoded + 'b', '/a' + literal + 'b', True),
                ('/a' + literal + 'b', '/a' + encoded + 'b', True),
                ('/a?x=' + encoded, '/a?x=' + literal, True),
                ('/a*' + encoded + 'b$', '/axy' + literal + 'b', True),
            ]
            for rule, path, disallowed in cases:
                with self.subTest(rule=rule, path=path):
                    policy, _ = ingest.robots_policy('User-agent: *\nDisallow: ' + rule)
                    self.assertEqual(policy.can_fetch(
                        ingest.UA_TOKEN, 'https://brantevents.org' + path), not disallowed)

    def test_robots_empty_query_anchor(self):
        policy, _ = ingest.robots_policy('User-agent: *\nDisallow: /events.rss?$')
        self.assertFalse(policy.can_fetch(ingest.UA_TOKEN, ingest.FEED_URL + '?'))
        self.assertTrue(policy.can_fetch(ingest.UA_TOKEN, ingest.FEED_URL))

    def test_robots_normalized_specificity(self):
        policy, _ = ingest.robots_policy(
            'User-agent: *\nDisallow: /%65%76%65%6e%74%73/\nAllow: /events/probe/')
        self.assertTrue(policy.can_fetch(ingest.UA_TOKEN,
                                         'https://brantevents.org/events/probe/'))

    def test_robots_normalizes_nonprintable_octets(self):
        self.assertEqual(ingest.normalize_robots_path('/a \x00\x7fé*$/%7e%2f%3f'),
                         '/a%20%00%7F%C3%A9%2A%24/~%2F%3F')

    def test_robots_unavailable_or_malformed(self):
        failures = [urllib.error.HTTPError(ingest.ROBOTS_URL, code, 'failure', {}, None)
                    for code in (403, 404, 500, 302)]
        failures += [TimeoutError(), '<html>error</html>', 'not robots',
                     b'User-agent: *', 'User-agent: *\nDisallow: /\x00',
                     'User-agent: *', 'Sitemap: https://brantevents.org/map.xml',
                     'User-agent: *\nDisallow:\nCrawl-delay: 31',
                     'User-agent: *\nDisallow:\nCrawl-delay: invalid']
        for robots in failures:
            with self.subTest(robots=robots):
                result, calls, sleep = self.run_policy(robots)
                self.assertEqual(calls, [ingest.ROBOTS_URL])
                self.assertEqual(result['candidates'], [])
                self.assertIn('robots.txt unavailable or malformed', result['errors'][0]['error'])
                sleep.assert_not_called()

    def test_robots_delay_and_specific_group(self):
        result, calls, sleep = self.run_policy(
            'User-agent: *\nDisallow: /\n\n'
            'User-agent: ParisPulseBot\nDisallow:\nCrawl-delay: 5\n')
        self.assertEqual(result['errors'], [])
        self.assertEqual(calls[:2], [ingest.ROBOTS_URL, ingest.FEED_URL])
        self.assertEqual(len(result['candidates']), 3)
        self.assertEqual(sleep.call_count, 4)
        for call in sleep.call_args_list:
            self.assertEqual(call.args, (5,))
        result, calls, _ = self.run_policy(
            'User-agent: *\nDisallow:\n\nUser-agent: ParisPulseBot\nDisallow: /\n')
        self.assertEqual(calls, [ingest.ROBOTS_URL])
        self.assertTrue(result['errors'])

    def test_real_robots_raw_query_rule(self):
        robots = (FIXTURES / 'brantevents-robots.txt').read_text()
        policy, delay = ingest.robots_policy(robots)
        self.assertEqual(delay, 1)
        for path, permitted in [('/events.rss', True), ('/events/some-slug/', True),
                                ('/?page=2', False), ('/api/x', False),
                                ('/events.geojson', False), ('/', True)]:
            with self.subTest(path=path):
                self.assertEqual(policy.can_fetch(ingest.UA_TOKEN,
                                                 'https://brantevents.org' + path), permitted)
        result, calls, _ = self.run_policy(robots)
        self.assertEqual(result['errors'], [])
        self.assertEqual(calls[:2], [ingest.ROBOTS_URL, ingest.FEED_URL])
        self.assertEqual(len(result['candidates']), 3)

    def test_robots_wildcards_anchors_and_precedence(self):
        policy, _ = ingest.robots_policy(
            'User-agent: *\nDisallow: /private/*\nAllow: /private/public/\n'
            'Disallow: /private/public/secret\nDisallow: /*.pdf$\n'
            'Disallow: /tie*\nAllow: /tie*\nDisallow: /literal%2F\n')
        for path, permitted in [('/private/a', False), ('/private/public/a', True),
                                ('/private/public/secret', False), ('/a/b.pdf', False),
                                ('/a.pdf?download=1', True), ('/a.pdf/extra', True),
                                ('/tie', True), ('/tie/more', True),
                                ('/literal%2Fpath', False), ('/literal/path', True)]:
            with self.subTest(path=path):
                self.assertEqual(policy.can_fetch(ingest.UA_TOKEN,
                                                 'https://brantevents.org' + path), permitted)

    def test_robots_combines_matching_groups_and_group_delays(self):
        policy, delay = ingest.robots_policy(
            'User-agent: *\nDisallow: /\nCrawl-delay: 30\n'
            'User-agent: OtherBot\nUser-agent: parispulsebot\n'
            'Disallow: /one\nCrawl-delay: 2\n'
            'User-agent: ParisPulseBot\nDisallow: /two\nCrawl-delay: 4\n')
        self.assertEqual(delay, 4)
        for path, permitted in [('/one', False), ('/two', False), ('/three', True)]:
            self.assertEqual(policy.can_fetch(ingest.UA_TOKEN,
                                             'https://brantevents.org' + path), permitted)
        self.assertFalse(policy.can_fetch('UnknownBot', ingest.FEED_URL))
        self.assertEqual(policy.crawl_delay('UnknownBot'), 30)

    def test_robots_transport_limits(self):
        response = Mock(status=200)
        response.geturl.return_value = ingest.ROBOTS_URL
        response.headers.get_content_type.return_value = 'text/plain'
        response.read.return_value = ROBOTS.encode()
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        with patch.object(ingest.urllib.request, 'build_opener') as opener:
            opener.return_value.open.return_value = response
            self.assertEqual(ingest.fetch(ingest.ROBOTS_URL), ROBOTS)
            request = opener.return_value.open.call_args.args[0]
            self.assertEqual(request.get_header('User-agent'), ingest.USER_AGENT)
            self.assertEqual(opener.return_value.open.call_args.kwargs['timeout'], 12)
            response.read.assert_called_once_with(64 * 1024 + 1)
            response.read.return_value = b'x' * (64 * 1024 + 1)
            with self.assertRaises(ValueError):
                ingest.fetch(ingest.ROBOTS_URL)
            response.headers.get_content_type.return_value = 'text/html'
            with self.assertRaises(ValueError):
                ingest.fetch(ingest.ROBOTS_URL)
            response.headers.get_content_type.return_value = 'text/plain'
            response.geturl.return_value = 'https://example.org/robots.txt'
            with self.assertRaises(ValueError):
                ingest.fetch(ingest.ROBOTS_URL)

    def test_write_gate_dedupe_and_draft_only(self):
        row, _ = ingest.review(URL, self.paris, NOW)
        store = ingest.HeldDraftStore('https://example.supabase.co', 'test-only')
        store.source_ready = Mock(return_value=True)
        store.request = Mock(return_value=[{'id': 'existing'}])
        self.assertFalse(store.write_held(row))
        store.create = Mock(return_value={'id': 'new'})
        store.request = Mock(side_effect=[[], [{**row, 'id': 'new'}]])
        self.assertTrue(store.write_held(row))
        with self.assertRaises(ValueError):
            store.write_held({**row, 'verification_status': 'verified'})
        self.assertEqual(store.create.call_count, 1)


if __name__ == '__main__':
    unittest.main()
