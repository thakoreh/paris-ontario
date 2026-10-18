#!/usr/bin/env python3
"""Four-hour Coolify entry point. Standard library only; database writes opt in."""
import argparse
import contextlib
import datetime as dt
import fcntl
import io
import json
import os
from pathlib import Path
import urllib.parse
import urllib.request

try:
    from scripts import official_publisher, events_ingest, publisher_heartbeat
except ModuleNotFoundError:
    import official_publisher
    import events_ingest
    import publisher_heartbeat


class SourceChecks(official_publisher.Supabase):
    """Service credentials travel only in headers; reject redirects."""
    def __init__(self, url, key):
        parsed = urllib.parse.urlsplit(url)
        if (parsed.scheme != 'https' or not parsed.hostname
                or not parsed.hostname.endswith('.supabase.co')
                or parsed.username or parsed.password or parsed.port
                or parsed.path not in ('', '/') or parsed.query or parsed.fragment):
            raise ValueError('Invalid project HTTPS URL')
        super().__init__(url, key)

    def record(self, row):
        stamp = {'last_checked_at': row['completed_at']}
        if row['status'] == 'success':
            stamp['last_success_at'] = row['completed_at']
        self.request('official_sources', urllib.parse.urlencode({'id': 'eq.' + row['source_id']}),
                     method='PATCH', payload=stamp)
        self.request('ingestion_runs', method='POST', payload=row)


def timestamp():
    return dt.datetime.now(dt.timezone.utc).isoformat()


def main(argv=None, *, news_run=None, events_run=None, checks_factory=None, heartbeat=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dry-run', action='store_true', help='Disable all remote writes, including heartbeat')
    args = parser.parse_args(argv)
    news_run = news_run or official_publisher.run
    events_run = events_run or events_ingest.run
    checks_factory = checks_factory or SourceChecks
    heartbeat = heartbeat or publisher_heartbeat.report_heartbeat
    env = os.environ
    url, key = env.get('NEXT_PUBLIC_SUPABASE_URL', ''), env.get('SUPABASE_SERVICE_ROLE_KEY', '')
    credentials = bool(url and key)
    enabled = lambda name: not args.dry_run and credentials and env.get(name) == '1'
    state_dir = Path(env.get('PARIS_PULSE_STATE_DIR') or official_publisher.STATE_DIR)
    summary = {'run_status': 'ok', 'sources': []}
    # Exception text and adapter output are untrusted: never print or persist them here.
    try:
        state_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
        with (state_dir / 'scheduled-ingest.lock').open('a') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            for source_id, runner, options in (
                (official_publisher.SOURCE_ID, news_run,
                 {'publish_enabled': enabled('PARIS_PULSE_AUTOPUBLISH'), 'record_checks': False}),
                (events_ingest.BRANT_EVENTS_SOURCE_ID, events_run,
                 {'write_held_drafts': enabled('PARIS_PULSE_WRITE_HELD_DRAFTS'),
                  'state_dir': state_dir / 'events', 'record_checks': False}),
            ):
                started = timestamp()
                result = {}
                error = None
                try:
                    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
                        result = runner(**options)
                    if result.get('errors') or result.get('run_status', 'ok') != 'ok':
                        error = 'Source ingestion failed or incomplete'
                except Exception:
                    error = 'Source ingestion raised an exception'
                is_events = source_id == events_ingest.BRANT_EVENTS_SOURCE_ID
                created = int(result.get('created', 0))
                drafts = created if is_events else int(result.get('held_drafts_created', 0))
                held = len(result.get('candidates' if is_events else 'held', []))
                counts = {'created': created, 'held': held, 'held_drafts_created': drafts}
                if not is_events:
                    counts['breakdown'] = official_publisher.run_breakdown(result)
                    counts['held'] = counts['breakdown']['held']
                    for name in ('would_publish', 'capped', 'draft_capped'):
                        counts[name] = counts['breakdown'][name]
                for name in ('capped', 'draft_limit', 'draft_limit_reached', 'drafts_capped'):
                    if name in result:
                        counts[name] = int(result[name])
                row = {'source_id': source_id, 'started_at': started, 'completed_at': timestamp(),
                       'status': ('partial' if result.get('fetched') else 'failed') if error else 'success',
                       'records_found': int(result.get('found', 0)),
                       'records_created': created if is_events else created + drafts,
                       'records_failed': max(len(result.get('errors', [])), int(bool(error))),
                       'error_message': error[:400] if error else None}
                if enabled('PARIS_PULSE_RECORD_CHECKS') and result.get('fetched'):
                    try:
                        checks_factory(url, key).record(row)
                    except Exception:
                        error = 'Source check recording failed'
                summary['sources'].append({**row, **counts, 'fetched': bool(result.get('fetched')),
                                           'check_error': error})
                if error:
                    summary['run_status'] = 'failed'
    except Exception:
        summary['run_status'] = 'failed'
        summary['error'] = 'Scheduler lock or state unavailable'
    if env.get('PARIS_PULSE_HEARTBEAT_URL') and not args.dry_run:
        try:
            summary['heartbeat_ok'] = bool(heartbeat(summary))
        except Exception:
            summary['heartbeat_ok'] = False
        if not summary['heartbeat_ok']:
            summary['run_status'] = 'failed'
    print(json.dumps(summary, separators=(',', ':')))
    return int(summary['run_status'] != 'ok')


if __name__ == '__main__':
    raise SystemExit(main())
