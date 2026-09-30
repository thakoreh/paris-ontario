#!/usr/bin/env python3
"""Hermes script-only cron entry point: silent when unchanged, explicit on failure."""
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from official_publisher import run
from publisher_heartbeat import report_heartbeat

ENV_FILE = Path.home() / 'microsaas-projects' / 'paris-ontario' / '.env.local'


def format_result(result):
    urls = result.get('published', [])
    if result.get('run_status') != 'ok':
        errors = '; '.join(str(e.get('error', 'unknown')) for e in result.get('errors', []))
        return ('ALERT: Paris Pulse official-source publisher failed or partial. '
                + errors[:500] + ' Next action: inspect local audit and source/Supabase; do not bypass review gates.')
    if urls:
        return ('Paris Pulse verified and published ' + str(len(urls)) + ' County source-linked notice(s). '
                + 'Live source URLs: ' + ', '.join(urls) + '. Status: write readback verified.')
    return ''


def main():
    result = run(True, ENV_FILE)
    heartbeat_ok = report_heartbeat(result)
    print(format_result(result), end='')
    if not heartbeat_ok:
        print(' ALERT: Independent publisher heartbeat delivery failed; check monitor configuration and connectivity.', end='')
    return 0 if result.get('run_status') == 'ok' and heartbeat_ok else 1


if __name__ == '__main__':
    sys.exit(main())
