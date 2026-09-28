import datetime as dt
import importlib.util
import pathlib
import tempfile
import unittest

P = pathlib.Path(__file__).resolve().parents[1] / 'scripts' / 'official_reviewer_context.py'
spec = importlib.util.spec_from_file_location('official_reviewer_context', P)
assert spec is not None and spec.loader is not None
context = importlib.util.module_from_spec(spec)
spec.loader.exec_module(context)
NOW = dt.datetime(2026, 9, 28, 12, tzinfo=dt.timezone.utc)

class ReviewerContextTests(unittest.TestCase):
    def test_uses_recent_published_records_only_and_dedupes(self):
        with tempfile.TemporaryDirectory() as folder:
            path = pathlib.Path(folder) / 'audit.jsonl'
            path.write_text('\n'.join([
                '{"at":"2026-09-28T09:00:00+00:00","mode":"publish","published":["https://www.brant.ca/news/posts/a/"]}',
                '{"at":"2026-09-28T10:00:00+00:00","mode":"publish","published":["https://www.brant.ca/news/posts/a/","https://www.brant.ca/news/posts/b/"]}',
                '{"at":"2026-09-25T10:00:00+00:00","mode":"publish","published":["https://www.brant.ca/news/posts/old/"]}',
            ]) + '\n')
            self.assertEqual(context.recent_published(path, NOW), ['https://www.brant.ca/news/posts/a/', 'https://www.brant.ca/news/posts/b/'])

if __name__ == '__main__': unittest.main()
