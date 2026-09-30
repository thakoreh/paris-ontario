import importlib.util
import pathlib
import unittest
from unittest.mock import MagicMock, patch

P = pathlib.Path(__file__).resolve().parents[1] / 'scripts' / 'publisher_heartbeat.py'
spec = importlib.util.spec_from_file_location('publisher_heartbeat', P)
heartbeat = importlib.util.module_from_spec(spec)
spec.loader.exec_module(heartbeat)
URL = 'https://hc-ping.com/00000000-0000-0000-0000-000000000001'


class HeartbeatTests(unittest.TestCase):
    def test_disabled_never_contacts_provider(self):
        with patch.object(heartbeat.urllib.request, 'build_opener') as opener:
            self.assertTrue(heartbeat.report_heartbeat({'run_status': 'ok'}, {}))
            opener.assert_not_called()

    def test_only_success_renews_heartbeat(self):
        for status in ('ok', 'degraded', 'partial', 'failed', None):
            with self.subTest(status=status):
                response = MagicMock()
                response.__enter__.return_value.status = 200
                response.__enter__.return_value.read.return_value = b'OK'
                with patch.object(heartbeat.urllib.request, 'build_opener') as opener:
                    opener.return_value.open.return_value = response
                    self.assertTrue(heartbeat.report_heartbeat({'run_status': status}, {'PARIS_PULSE_HEARTBEAT_URL': URL}))
                    args, kwargs = opener.return_value.open.call_args
                    self.assertEqual(args[0].full_url, URL + ('' if status == 'ok' else '/fail'))
                    self.assertEqual(args[0].data, b'')
                    self.assertEqual(kwargs['timeout'], 10)

    def test_rejects_unapproved_destinations_and_secret_redirects(self):
        for url in ('http://hc-ping.com/x', URL + '?secret=yes', URL + '#fragment', URL.replace('hc-ping.com', 'evil.example'), URL.replace('hc-ping.com', 'hc-ping.com:443')):
            with patch.object(heartbeat.urllib.request, 'build_opener') as opener:
                self.assertFalse(heartbeat.report_heartbeat({'run_status': 'ok'}, {'PARIS_PULSE_HEARTBEAT_URL': url}))
                opener.assert_not_called()
        self.assertIsNone(heartbeat.NoRedirect().redirect_request(None, None, 302, '', {}, 'https://example.com'))

    def test_soft_provider_error_is_not_delivery_success(self):
        for body in (b"OK (not found)", b"OK (rate limited)", b"<html>error</html>"):
            response = MagicMock()
            response.__enter__.return_value.status = 200
            response.__enter__.return_value.read.return_value = body
            with patch.object(heartbeat.urllib.request, "build_opener") as opener:
                opener.return_value.open.return_value = response
                self.assertFalse(heartbeat.report_heartbeat({"run_status": "ok"}, {"PARIS_PULSE_HEARTBEAT_URL": URL}))

    def test_delivery_error_is_failure(self):
        with patch.object(heartbeat.urllib.request, 'build_opener') as opener:
            opener.return_value.open.side_effect = OSError('private URL omitted')
            self.assertFalse(heartbeat.report_heartbeat({'run_status': 'ok'}, {'PARIS_PULSE_HEARTBEAT_URL': URL}))


if __name__ == '__main__':
    unittest.main()
