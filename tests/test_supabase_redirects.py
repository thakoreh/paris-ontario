"""Exercise urllib redirect handling with an entirely in-memory transport."""
from email.message import Message
import io
import unittest
import urllib.error
import urllib.request
import urllib.response
from unittest.mock import patch

from scripts import events_ingest, official_publisher, scheduled_ingest


class MockTransport(urllib.request.HTTPSHandler):
    def __init__(self, status, location):
        super().__init__()
        self.status = status
        self.location = location
        self.requests = []

    def https_open(self, request):
        self.requests.append(request)
        headers = Message()
        if self.location:
            headers['Location'] = self.location
        response = urllib.response.addinfourl(
            io.BytesIO(b'[{"id": "test-row"}]'), headers,
            request.full_url, self.status)
        response.msg = 'Mock response'
        return response


class SupabaseRedirectTests(unittest.TestCase):
    clients = (official_publisher.Supabase, events_ingest.HeldDraftStore,
               scheduled_ingest.SourceChecks)

    def test_all_clients_share_request_method(self):
        for client in (events_ingest.HeldDraftStore, scheduled_ingest.SourceChecks):
            self.assertNotIn('request', client.__dict__)
            # Another test reloads the publisher module; subclasses retain their
            # original base class, which still owns the shared implementation.
            base = client.__bases__[0]
            self.assertEqual(base.__name__, 'Supabase')
            self.assertIs(client.request, base.request)

    def test_redirects_never_send_a_second_authenticated_request(self):
        build_opener = urllib.request.build_opener
        for client in self.clients:
            for status in (301, 302, 303, 307, 308):
                for target in ('https://other.example/stolen',
                               'https://example.supabase.co/rest/v1/moved'):
                    with self.subTest(client=client.__name__, status=status, target=target):
                        transport = MockTransport(status, target)
                        def opener(handler):
                            self.assertIsInstance(handler, official_publisher.SupabaseNoRedirect)
                            return build_opener(handler, transport)
                        with patch.object(urllib.request, 'build_opener', side_effect=opener):
                            with self.assertRaisesRegex(urllib.error.HTTPError,
                                                        'Supabase redirect refused'):
                                client('https://example.supabase.co', 'test-key').request('notices')
                        self.assertEqual(len(transport.requests), 1)
                        request = transport.requests[0]
                        self.assertEqual(request.full_url, 'https://example.supabase.co/rest/v1/notices')
                        self.assertEqual(request.get_header('Apikey'), 'test-key')
                        self.assertEqual(request.get_header('Authorization'), 'Bearer test-key')

    def test_normal_200_works_for_all_clients(self):
        build_opener = urllib.request.build_opener
        for client in self.clients:
            with self.subTest(client=client.__name__):
                transport = MockTransport(200, None)
                with patch.object(urllib.request, 'build_opener',
                                  side_effect=lambda handler: build_opener(handler, transport)):
                    result = client('https://example.supabase.co', 'test-key').request(
                        'notices', method='POST', payload={'title': 'Test'})
                self.assertEqual(result, [{'id': 'test-row'}])
                self.assertEqual(len(transport.requests), 1)
                self.assertEqual(transport.requests[0].method, 'POST')
