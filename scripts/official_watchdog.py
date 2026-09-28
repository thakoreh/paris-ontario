#!/usr/bin/env python3
"""Independent Paris Pulse availability and publisher-cadence watchdog."""
import argparse
import datetime as dt
import json
from pathlib import Path
import urllib.request

STATE = Path.home() / '.hermes' / 'paris-pulse-publisher' / 'last_run.json'
HEALTH = 'https://parispulse.ca/api/health'


def assess(last, status, health, now):
    issues = []
    if status != 200 or not isinstance(health, dict) or health.get('ok') is not True:
        issues.append('Paris Pulse health endpoint unavailable')
    elif health.get('dataMode') != 'supabase':
        issues.append('Paris Pulse production data backend is not Supabase')
    if not isinstance(last, dict):
        issues.append('Official-source publisher has never completed a run')
    else:
        if last.get('run_status') != 'ok':
            issues.append('Official-source publisher run failed or partially completed')
        try:
            age = now - dt.datetime.fromisoformat(last['at'])
            if age > dt.timedelta(hours=8) or age < -dt.timedelta(minutes=5):
                issues.append('Official-source publisher heartbeat stale or clock skewed')
        except (ValueError, KeyError, TypeError):
            issues.append('Official-source publisher heartbeat invalid')
    return issues


def check(now=None):
    now = now or dt.datetime.now(dt.timezone.utc)
    try:
        last = json.loads(STATE.read_text())
    except (OSError, ValueError):
        last = None
    try:
        req = urllib.request.Request(HEALTH, headers={'User-Agent': 'ParisPulseWatchdog/1.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            status, health = response.status, json.loads(response.read(2000))
    except Exception:
        status, health = None, None
    return assess(last, status, health, now)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--monitor', action='store_true', help='Stable incident fingerprint for advisor agent')
    args = parser.parse_args()
    issues = check()
    if args.monitor:
        print('OK' if not issues else '\n'.join(issues))
    elif issues:
        print('ALERT: Paris Pulse status check failed. ' + '; '.join(issues) + '. Next action: inspect publisher audit, official source, Supabase and Coolify; do not fabricate updates or bypass review gates.')
