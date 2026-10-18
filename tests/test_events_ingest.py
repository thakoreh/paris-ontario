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
            return self.rss if url == ingest.FEED_URL else self.real
        with tempfile.TemporaryDirectory() as directory, patch.object(ingest, 'HeldDraftStore') as client:
            result = ingest.run(fetcher=fetcher, sleep=sleeps.append, now=NOW, state_dir=directory)
            client.assert_not_called()
            self.assertEqual(result['found'], 3)
            self.assertEqual(len(result['candidates']), 3)
            self.assertEqual(sleeps, [1.0] * 3)
            self.assertEqual(calls[0], ingest.FEED_URL)
            for candidate in result['candidates']:
                self.assertIn('untrusted_source', candidate['reasons'])
                self.assertIn('uncertain_locality', candidate['reasons'])
            self.assertEqual(len((Path(directory) / 'audit.jsonl').read_text().splitlines()), 1)

    def test_page_cap_and_bad_discovery(self):
        urls = [f'https://brantevents.org/events/item-{i}/' for i in range(45)] + [URL + '?q=x']
        rss = '<rss><channel>' + ''.join('<item><link>' + url + '</link></item>' for url in urls) + '</channel></rss>'
        fetcher = Mock(side_effect=lambda url: rss if url == ingest.FEED_URL else self.paris)
        sleep = Mock()
        with tempfile.TemporaryDirectory() as directory:
            result = ingest.run(fetcher=fetcher, sleep=sleep, now=NOW, state_dir=directory)
        self.assertEqual(result['found'], 45)
        self.assertEqual(len(result['candidates']), 40)
        self.assertEqual(fetcher.call_count, 41)
        self.assertEqual(sleep.call_count, 40)
        self.assertEqual(len(result['errors']), 1)

    def test_empty_feed_fails_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            result = ingest.run(fetcher=lambda url: '<rss><channel/></rss>',
                                sleep=Mock(), now=NOW, state_dir=directory)
        self.assertEqual(result['candidates'], [])
        self.assertTrue(result['errors'])

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
