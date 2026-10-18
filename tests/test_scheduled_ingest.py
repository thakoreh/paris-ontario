import contextlib
import importlib
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch

from scripts import scheduled_ingest as scheduled


class ScheduledIngestTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.environment = patch.dict(os.environ, {'PARIS_PULSE_STATE_DIR': self.temp.name}, clear=True)
        self.environment.start()
        self.addCleanup(self.environment.stop)
        self.news = Mock(return_value={'run_status': 'ok', 'fetched': True, 'found': 2})
        self.events = Mock(return_value={'fetched': True, 'found': 3})
        self.factory = Mock()
        self.heartbeat = Mock(return_value=True)

    def invoke(self, args=()):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            code = scheduled.main(list(args), news_run=self.news, events_run=self.events,
                                  checks_factory=self.factory, heartbeat=self.heartbeat)
        return code, json.loads(output.getvalue()), output.getvalue()

    def enable(self):
        os.environ.update(NEXT_PUBLIC_SUPABASE_URL='https://example.supabase.co',
                          SUPABASE_SERVICE_ROLE_KEY='super-private-service-key',
                          PARIS_PULSE_AUTOPUBLISH='1', PARIS_PULSE_WRITE_HELD_DRAFTS='1',
                          PARIS_PULSE_RECORD_CHECKS='1')

    def test_summary_passes_through_publish_decisions(self):
        self.news.return_value = {
            'run_status': 'ok', 'fetched': True, 'created': 0,
            'held': [{'decision': 'would-publish'}, {'decision': 'would-publish'},
                     {'reason': 'Daily publish cap reached'},
                     {'reason': 'Held-draft daily limit reached'}],
            'capped': 1, 'draft_capped': 1,
        }
        code, summary, _ = self.invoke(['--dry-run'])
        self.assertEqual(code, 0)
        source = summary['sources'][0]
        for name, expected in [('would_publish', 2), ('capped', 1), ('draft_capped', 1), ('held', 2)]:
            self.assertEqual(source[name], expected)
            self.assertEqual(source['breakdown'][name], expected)
        self.assertEqual(source['records_created'], 0)

    def test_flags_off(self):
        self.assertEqual(self.invoke()[0], 0)
        self.factory.assert_not_called()
        self.assertFalse(self.news.call_args.kwargs['publish_enabled'])
        self.assertFalse(self.events.call_args.kwargs['write_held_drafts'])
        self.assertFalse(self.news.call_args.kwargs['record_checks'])
        self.assertFalse(self.events.call_args.kwargs['record_checks'])

    def test_credentials_alone_do_not_enable_writes(self):
        os.environ.update(NEXT_PUBLIC_SUPABASE_URL='https://example.supabase.co',
                          SUPABASE_SERVICE_ROLE_KEY='private')
        self.assertEqual(self.invoke()[0], 0)
        self.factory.assert_not_called()
        self.assertFalse(self.news.call_args.kwargs['publish_enabled'])
        self.assertFalse(self.events.call_args.kwargs['write_held_drafts'])

    def test_only_the_two_automated_sources_are_recorded(self):
        self.enable()
        self.assertEqual(self.invoke()[0], 0)
        rows = [call.args[0] for call in self.factory.return_value.record.call_args_list]
        self.assertEqual([r['source_id'] for r in rows], [
            scheduled.official_publisher.SOURCE_ID, scheduled.events_ingest.BRANT_EVENTS_SOURCE_ID])

    def test_summary_and_ingestion_runs_preserve_real_counts(self):
        self.enable()
        self.news.return_value = {
            'fetched': True, 'found': 17, 'created': 3, 'held_drafts_created': 2,
            'held': [{'id': i} for i in range(7)], 'duplicates': 5,
        }
        self.events.return_value = {
            'fetched': True, 'found': 13, 'created': 4,
            'candidates': [{'id': i} for i in range(9)],
        }
        # Exercise the real recording adapter with all remote requests mocked.
        client = scheduled.SourceChecks('https://example.supabase.co', 'private')
        client.request = Mock()
        self.factory.return_value = client
        code, summary, _ = self.invoke()
        self.assertEqual(code, 0)
        self.assertEqual(summary['run_status'], 'ok')
        self.assertEqual(len(summary['sources']), 2)
        runs = [call.kwargs['payload'] for call in client.request.call_args_list
                if call.args[0] == 'ingestion_runs']
        self.assertEqual(len(runs), 2)
        self.assertEqual(client.request.call_count, 4)
        self.assertFalse(self.news.call_args.kwargs['record_checks'])
        self.assertFalse(self.events.call_args.kwargs['record_checks'])
        self.assertEqual(summary['sources'][0]['breakdown'], {
            'published': 3, 'held': 7, 'held_drafts_created': 2, 'duplicates': 5, 'would_publish': 0, 'capped': 0, 'draft_capped': 0})
        self.assertTrue(all('breakdown' not in row for row in runs))
        for source, row, source_id, found, created, drafts, held, total in zip(
                summary['sources'], runs,
                [scheduled.official_publisher.SOURCE_ID, scheduled.events_ingest.BRANT_EVENTS_SOURCE_ID],
                [17, 13], [3, 4], [2, 4], [7, 9], [5, 4]):
            with self.subTest(source_id=source_id):
                self.assertEqual(source['source_id'], source_id)
                self.assertEqual(source['created'], created)
                self.assertEqual(source['held_drafts_created'], drafts)
                self.assertEqual(source['held'], held)
                self.assertEqual(source['records_created'], total)
                self.assertEqual(source['records_found'], found)
                self.assertEqual(row['source_id'], source_id)
                self.assertEqual(row['records_created'], total)
                self.assertEqual(row['records_found'], found)
                self.assertEqual(row['records_failed'], 0)
                self.assertEqual(row['status'], 'success')
                self.assertEqual({key: source[key] for key in row}, row)

    def test_missing_credentials_and_exact_flags(self):
        os.environ['PARIS_PULSE_AUTOPUBLISH'] = '1'
        self.invoke()
        self.assertFalse(self.news.call_args.kwargs['publish_enabled'])
        self.enable()
        os.environ['PARIS_PULSE_AUTOPUBLISH'] = 'true'
        self.invoke()
        self.assertFalse(self.news.call_args.kwargs['publish_enabled'])

    def test_dry_run_overrides_every_write(self):
        self.enable()
        os.environ['PARIS_PULSE_HEARTBEAT_URL'] = 'secret-heartbeat'
        self.assertEqual(self.invoke(['--dry-run'])[0], 0)
        self.factory.assert_not_called()
        self.heartbeat.assert_not_called()
        self.assertFalse(self.news.call_args.kwargs['publish_enabled'])
        self.assertFalse(self.events.call_args.kwargs['write_held_drafts'])

    def test_failure_is_isolated_and_secrets_not_printed(self):
        self.enable()
        self.news.side_effect = RuntimeError(os.environ['SUPABASE_SERVICE_ROLE_KEY'])
        code, result, output = self.invoke()
        self.assertEqual(code, 1)
        self.events.assert_called_once()
        self.assertNotIn(os.environ['SUPABASE_SERVICE_ROLE_KEY'], output)
        self.assertNotIn(os.environ['NEXT_PUBLIC_SUPABASE_URL'], output)
        self.assertEqual(len(result['sources']), 2)

    def test_record_only_fetched_sources(self):
        self.enable()
        self.news.return_value = {'errors': [{'error': 'private'}], 'fetched': False}
        self.assertEqual(self.invoke()[0], 1)
        rows = [call.args[0] for call in self.factory.return_value.record.call_args_list]
        self.assertEqual([r['source_id'] for r in rows], [scheduled.events_ingest.BRANT_EVENTS_SOURCE_ID])
        self.assertEqual(rows[0]['records_found'], 3)
        self.assertEqual(rows[0]['status'], 'success')

    def test_record_failure_does_not_stop_other_source(self):
        self.enable()
        self.factory.side_effect = RuntimeError('private')
        self.assertEqual(self.invoke()[0], 1)
        self.events.assert_called_once()

    def test_partial_records_preserve_success_timestamp(self):
        client = scheduled.SourceChecks('https://example.supabase.co', 'private')
        client.request = Mock()
        row = {'source_id': scheduled.official_publisher.SOURCE_ID,
               'completed_at': 'now', 'status': 'partial'}
        client.record(row)
        stamp = client.request.call_args_list[0].kwargs['payload']
        self.assertEqual(stamp, {'last_checked_at': 'now'})
        row['status'] = 'success'
        client.record(row)
        self.assertEqual(client.request.call_args_list[2].kwargs['payload']['last_success_at'], 'now')

    def test_state_directory_env(self):
        original = scheduled.official_publisher.STATE_DIR
        try:
            importlib.reload(scheduled.official_publisher)
            self.assertEqual(scheduled.official_publisher.STATE_DIR, Path(self.temp.name))
            self.invoke()
            self.assertTrue((Path(self.temp.name) / 'scheduled-ingest.lock').exists())
            self.assertEqual(self.events.call_args.kwargs['state_dir'], Path(self.temp.name) / 'events')
        finally:
            scheduled.official_publisher.STATE_DIR = original

    def test_url_validation(self):
        for url in ('http://example.supabase.co', 'https://user:password@example.supabase.co',
                    'https://example.supabase.co/path', 'https://example.supabase.co?key=secret'):
            with self.subTest(url=url), self.assertRaises(ValueError):
                scheduled.SourceChecks(url, 'private')

    def test_process_lock(self):
        import fcntl
        with (Path(self.temp.name) / 'scheduled-ingest.lock').open('a') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            self.assertEqual(self.invoke()[0], 1)
        self.news.assert_not_called()
        self.events.assert_not_called()


if __name__ == '__main__':
    unittest.main()
