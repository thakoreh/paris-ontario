import importlib.util
import pathlib
import unittest

P = pathlib.Path(__file__).resolve().parents[1] / 'scripts' / 'official_publisher_cron.py'
spec = importlib.util.spec_from_file_location('official_publisher_cron', P)
assert spec is not None and spec.loader is not None
cron = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cron)

class CronOutputTests(unittest.TestCase):
    def test_successful_no_change_is_silent(self):
        self.assertEqual(cron.format_result({'run_status':'ok','created':0,'published':[],'errors':[]}), '')
    def test_created_record_is_delivered(self):
        text = cron.format_result({'run_status':'ok','created':1,'published':['https://www.brant.ca/news/posts/paris-paving-update/'],'errors':[]})
        self.assertIn('verified', text)
        self.assertIn('https://www.brant.ca/news/posts/paris-paving-update/', text)
    def test_failed_run_delivers_alert(self):
        self.assertIn('ALERT', cron.format_result({'run_status':'failed','created':0,'published':[],'errors':[{'error':'source unavailable'}]}))

if __name__ == '__main__': unittest.main()
