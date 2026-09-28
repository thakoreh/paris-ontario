#!/usr/bin/env python3
"""Read-only context for an independent post-publication reviewer agent."""
import datetime as dt
import json
from pathlib import Path

AUDIT = Path.home() / '.hermes' / 'paris-pulse-publisher' / 'audit.jsonl'


def recent_published(path, now):
    if not path.exists(): return []
    urls = []
    for line in path.read_text().splitlines()[-500:]:
        try:
            event = json.loads(line)
            at = dt.datetime.fromisoformat(event['at'])
            if event.get('mode') == 'publish' and dt.timedelta(0) <= now - at <= dt.timedelta(hours=36):
                urls.extend(event.get('published', []))
        except (ValueError, KeyError, TypeError):
            continue
    return list(dict.fromkeys(urls))[-10:]


if __name__ == '__main__':
    urls = recent_published(AUDIT, dt.datetime.now(dt.timezone.utc))
    print(json.dumps({'recent_official_urls': urls, 'public_detail_base': 'https://parispulse.ca/notice/brant-',
      'instruction': 'Independently check original County article against live Paris Pulse detail. If no recent published URLs, check publisher last_run and site health instead.'}))
