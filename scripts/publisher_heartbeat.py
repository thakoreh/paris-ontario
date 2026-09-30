#!/usr/bin/env python3
"""Opt-in dead-man heartbeat to Healthchecks, independent of the Hermes host.

Only successful completed publisher runs renew the external success heartbeat.
No notice data, audit contents, exceptions, or credentials are sent in the body.
The ping URL is a secret: never print it or include it in an exception message.
"""
import os
import re
import urllib.parse
import urllib.request


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def report_heartbeat(result, env=None):
    """Return true when disabled or delivered; false on configuration/network failure."""
    env = os.environ if env is None else env
    url = env.get('PARIS_PULSE_HEARTBEAT_URL', '')
    if not url:
        return True
    try:
        parsed = urllib.parse.urlsplit(url)
        # Restrict secret-bearing pings to the documented provider and UUID route.
        if (parsed.scheme != 'https' or parsed.netloc != 'hc-ping.com'
                or not re.fullmatch(r'/[a-fA-F0-9]{8}(?:-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}', parsed.path)
                or parsed.query or parsed.fragment):
            return False
        target = url if result.get('run_status') == 'ok' else url + '/fail'
        request = urllib.request.Request(target, data=b'', method='POST',
                                         headers={'User-Agent': 'ParisPulseHeartbeat/1.0'})
        with urllib.request.build_opener(NoRedirect()).open(request, timeout=10) as response:
            return response.status == 200 and response.read(64).strip() == b'OK'
    except Exception:
        # Never leak the secret URL from an HTTP/network exception.
        return False
