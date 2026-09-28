import datetime as dt
import importlib.util
import pathlib
import unittest

P = pathlib.Path(__file__).resolve().parents[1] / 'scripts' / 'official_watchdog.py'
spec = importlib.util.spec_from_file_location('official_watchdog', P)
assert spec is not None and spec.loader is not None
watchdog = importlib.util.module_from_spec(spec)
spec.loader.exec_module(watchdog)
NOW = dt.datetime(2026, 9, 28, 12, tzinfo=dt.timezone.utc)

class WatchdogTests(unittest.TestCase):
    def test_healthy_run_and_site_are_silent(self):
        last = {'at': (NOW - dt.timedelta(hours=2)).isoformat(), 'run_status': 'ok'}
        self.assertEqual(watchdog.assess(last, 200, {'ok': True, 'dataMode': 'supabase'}, NOW), [])

    def test_failed_or_stale_run_alerts_even_if_site_up(self):
        last = {'at': (NOW - dt.timedelta(hours=2)).isoformat(), 'run_status': 'failed'}
        self.assertTrue(any('publisher' in x.lower() for x in watchdog.assess(last, 200, {'ok': True, 'dataMode': 'supabase'}, NOW)))
        last['run_status'] = 'ok'
        last['at'] = (NOW - dt.timedelta(hours=9)).isoformat()
        self.assertTrue(watchdog.assess(last, 200, {'ok': True, 'dataMode': 'supabase'}, NOW))

    def test_site_down_or_backend_preview_alerts(self):
        last = {'at': NOW.isoformat(), 'run_status': 'ok'}
        self.assertTrue(watchdog.assess(last, 503, None, NOW))
        self.assertTrue(watchdog.assess(last, 200, {'ok': True, 'dataMode': 'preview'}, NOW))

if __name__ == '__main__': unittest.main()
