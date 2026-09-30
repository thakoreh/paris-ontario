import importlib.util
import pathlib
import unittest
import contextlib
import io
from unittest.mock import patch

P = pathlib.Path(__file__).resolve().parents[1] / 'scripts' / 'official_publisher_cron.py'
spec = importlib.util.spec_from_file_location('official_publisher_cron', P)
assert spec is not None and spec.loader is not None
cron = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cron)

class CronOutputTests(unittest.TestCase):
    def setUp(self):
        heartbeat = patch.object(cron, "report_heartbeat", return_value=True)
        self.heartbeat = heartbeat.start()
        self.addCleanup(heartbeat.stop)

    def test_heartbeat_failure_alerts_and_exits_nonzero(self):
        self.heartbeat.return_value = False
        with patch.object(cron, "run", return_value={"run_status": "ok"}), contextlib.redirect_stdout(io.StringIO()) as output:
            self.assertEqual(cron.main(), 1)
            self.assertIn("heartbeat delivery failed", output.getvalue())
        self.heartbeat.assert_called_once_with({"run_status": "ok"})

    def test_successful_no_change_is_silent(self):
        self.assertEqual(cron.format_result({'run_status':'ok','created':0,'published':[],'errors':[]}), '')
    def test_created_record_is_delivered(self):
        text = cron.format_result({'run_status':'ok','created':1,'published':['https://www.brant.ca/news/posts/paris-paving-update/'],'errors':[]})
        self.assertIn('verified', text)
        self.assertIn('https://www.brant.ca/news/posts/paris-paving-update/', text)
    def test_main_exits_nonzero_for_degraded_runs(self):
        for status in ('partial', 'failed'):
            with self.subTest(status=status), patch.object(cron, 'run', return_value={
                'run_status': status, 'published': [], 'errors': [{'error': 'Article body missing'}]
            }), contextlib.redirect_stdout(io.StringIO()) as output:
                self.assertEqual(cron.main(), 1)
                self.assertIn('ALERT', output.getvalue())

    def test_main_success_is_silent_and_zero(self):
        with patch.object(cron, 'run', return_value={'run_status': 'ok', 'published': [], 'errors': []}), \
             contextlib.redirect_stdout(io.StringIO()) as output:
            self.assertEqual(cron.main(), 0)
            self.assertEqual(output.getvalue(), '')

    def test_failed_run_delivers_alert(self):
        self.assertIn('ALERT', cron.format_result({'run_status':'failed','created':0,'published':[],'errors':[{'error':'source unavailable'}]}))

if __name__ == '__main__': unittest.main()
