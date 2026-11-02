"""Real loopback tests of the fixed-target HTTP sidecar, without Docker."""
import http.client
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import importlib.util
import json
from pathlib import Path
import threading
import time
import unittest


ROOT = Path(__file__).resolve().parents[1]


def load(name, filename):
    path = ROOT / "lab-runtime" / filename
    if not path.exists():
        return None
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


runtime = load("campus_backend", "server.py")
proxy = load("campus_proxy", "proxy.py")
TARGET = "target-0123456789abcdef01234567"


class ProxyTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(proxy, "A fixed-target HTTP proxy has not been implemented")
        self.servers = []
        self.backend = runtime.create_server("soc", 17, "127.0.0.1", 0)
        self.start(self.backend)
        self.gateway = proxy.create_proxy_server(TARGET, self.backend.server_port, "soc", "127.0.0.1", 0, connect_host="127.0.0.1")
        self.start(self.gateway)

    def tearDown(self):
        for server, thread in reversed(getattr(self, "servers", [])):
            server.shutdown()
            server.server_close()
            thread.join(timeout=3)

    def start(self, server):
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        self.servers.append((server, thread))

    def request(self, path, body=None, headers=None, method=None, port=None):
        connection = http.client.HTTPConnection("127.0.0.1", port or self.gateway.server_port, timeout=8)
        try:
            value = json.dumps(body).encode() if body is not None else None
            connection.request(method or ("POST" if body is not None else "GET"), path, value, {"Content-Type": "application/json", **(headers or {})})
            response = connection.getresponse()
            raw = response.read()
            data = json.loads(raw) if "application/json" in response.getheader("Content-Type", "") else raw.decode()
            return response.status, data, response.getheaders()
        finally:
            connection.close()

    def test_health_identifies_fixed_target_and_real_backend(self):
        status, result, _ = self.request("/_campus_proxy/health")
        self.assertEqual(status, 200)
        self.assertEqual(result, {"service": "campus-lab-proxy", "protocolVersion": 1, "targetName": TARGET,
                                  "targetPort": self.backend.server_port, "targetMode": "soc", "ready": True, "backendReady": True})
        self.assertEqual(self.request("/health")[1]["service"], "campus-lab-runtime")

    def test_forwarded_http_preserves_actor_and_rewrites_validated_host_origin(self):
        headers = {"X-Campus-Actor": "sonda", "Origin": "http://127.0.0.1:%d" % self.gateway.server_port}
        self.assertEqual(self.request("/login", {"username": "analista", "password": "incorrecta"}, headers)[0], 401)
        self.assertEqual(self.request("/catalog", headers=headers)[0], 200)
        events = self.request("/api/events")[1]["events"]
        self.assertEqual([event["path"] for event in events], ["/login", "/catalog"])
        self.assertTrue(all(event["actor"] == "sonda" and event["peer"] == "127.0.0.1" for event in events))

    def test_cross_origin_absolute_form_connect_and_control_header_injection_are_rejected(self):
        for path, headers, method in (("http://evil.invalid/", {}, "GET"), ("//evil.invalid/", {}, "GET"),
                                      ("/catalog", {"Host": "evil.invalid"}, "GET"), ("/catalog", {"Origin": "https://evil.invalid"}, "GET"),
                                      ("/catalog%0d%0aX:evil", {}, "GET"), ("evil.invalid:443", {}, "CONNECT")):
            with self.subTest(path=path, headers=headers):
                self.assertIn(self.request(path, headers=headers, method=method)[0], (400, 403, 405))
        self.assertEqual(self.request("/api/events")[1]["events"], [])

    def test_proxy_target_environment_has_no_arbitrary_hostname_port_or_mode(self):
        valid = {"CAMPUS_TARGET_NAME": TARGET, "CAMPUS_TARGET_PORT": "8080", "CAMPUS_TARGET_MODE": "soc"}
        self.assertEqual(proxy.target_from_environment(valid), (TARGET, 8080, "soc"))
        for field, value in (("CAMPUS_TARGET_NAME", "127.0.0.1"), ("CAMPUS_TARGET_NAME", "evil.invalid"), ("CAMPUS_TARGET_PORT", "443"), ("CAMPUS_TARGET_MODE", "invalid")):
            with self.subTest(field=field):
                with self.assertRaises(ValueError):
                    proxy.target_from_environment({**valid, field: value})

    def test_hop_headers_are_removed_and_redirect_is_not_followed(self):
        observations = []

        class Backend(BaseHTTPRequestHandler):
            def log_message(self, *args):
                pass

            def do_GET(self):
                observations.append(dict(self.headers))
                if self.path == "/redirect":
                    self.send_response(302)
                    self.send_header("Location", "http://evil.invalid/")
                    self.end_headers()
                    return
                raw = b"ok"
                self.send_response(200)
                self.send_header("Content-Length", "2")
                self.send_header("Connection", "X-Backend-Secret")
                self.send_header("X-Backend-Secret", "remove-me")
                self.end_headers()
                self.wfile.write(raw)

        backend = ThreadingHTTPServer(("127.0.0.1", 0), Backend)
        self.start(backend)
        gateway = proxy.create_proxy_server(TARGET, backend.server_port, "soc", "127.0.0.1", 0, connect_host="127.0.0.1")
        self.start(gateway)
        status, body, headers = self.request("/", headers={"Connection": "X-Client-Secret", "X-Client-Secret": "remove-me", "Forwarded": "for=evil", "X-Forwarded-Host": "evil"}, port=gateway.server_port)
        self.assertEqual((status, body), (200, "ok"))
        self.assertNotIn("X-Client-Secret", observations[0])
        self.assertNotIn("Forwarded", observations[0])
        self.assertNotIn("X-Forwarded-Host", observations[0])
        self.assertNotIn("X-Backend-Secret", dict(headers))
        self.assertEqual(self.request("/redirect", port=gateway.server_port)[0], 502)
        self.assertEqual(len(observations), 2)

    def test_request_size_is_rejected_before_forwarding(self):
        connection = http.client.HTTPConnection("127.0.0.1", self.gateway.server_port, timeout=5)
        try:
            connection.putrequest("POST", "/login")
            connection.putheader("Content-Type", "application/json")
            connection.putheader("Content-Length", str(1024 * 1024 + 1))
            connection.endheaders()
            response = connection.getresponse()
            self.assertEqual(response.status, 413)
            response.read()
        finally:
            connection.close()
        self.assertEqual(self.request("/api/events")[1]["events"], [])

    def test_response_over_limit_is_rejected_without_buffering_its_body(self):
        class Backend(BaseHTTPRequestHandler):
            def log_message(self, *args):
                pass

            def do_GET(self):
                self.send_response(200)
                self.send_header("Content-Length", str(16 * 1024 * 1024 + 1))
                self.end_headers()

        backend = ThreadingHTTPServer(("127.0.0.1", 0), Backend)
        self.start(backend)
        gateway = proxy.create_proxy_server(TARGET, backend.server_port, "soc", "127.0.0.1", 0, connect_host="127.0.0.1")
        self.start(gateway)
        self.assertEqual(self.request("/", port=gateway.server_port)[0], 502)

    def test_response_deadline_applies_when_backend_closes_its_connection(self):
        class Backend(BaseHTTPRequestHandler):
            def log_message(self, *args):
                pass

            def do_GET(self):
                self.send_response(200)
                self.send_header("Content-Length", "2")
                self.send_header("Connection", "close")
                self.end_headers()
                try:
                    time.sleep(4)
                    self.wfile.write(b"a")
                    self.wfile.flush()
                    time.sleep(3)
                    self.wfile.write(b"b")
                except OSError:
                    pass

        backend = ThreadingHTTPServer(("127.0.0.1", 0), Backend)
        backend.daemon_threads = True
        self.start(backend)
        gateway = proxy.create_proxy_server(TARGET, backend.server_port, "soc", "127.0.0.1", 0, connect_host="127.0.0.1")
        self.start(gateway)
        started = time.monotonic()
        self.assertEqual(self.request("/", port=gateway.server_port)[0], 502)
        self.assertLess(time.monotonic() - started, 6)


if __name__ == "__main__":
    unittest.main()
