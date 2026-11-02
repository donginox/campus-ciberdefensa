"""Fixed-destination HTTP sidecar. Only this process has an edge network."""
import http.client
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
import re
import socket
import threading
import time
from urllib.parse import urlsplit


MAX_REQUEST = 1024 * 1024
MAX_RESPONSE = 16 * 1024 * 1024
HOP_HEADERS = {"connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade", "proxy-connection"}
TARGET_PATTERN = re.compile(r"target-[0-9a-f]{24}\Z")
TARGET_CONFIG = {"juice-shop": 3000, "soc": 8080, "database": 8080}


def target_from_environment(environment):
    name, port, mode = (environment.get("CAMPUS_TARGET_" + field, "") for field in ("NAME", "PORT", "MODE"))
    match = TARGET_PATTERN.fullmatch(name)
    if not match or not isinstance(port, str) or not port.isascii() or not port.isdigit():
        raise ValueError("Invalid fixed proxy target")
    if TARGET_CONFIG.get(mode) != int(port):
        raise ValueError("Proxy target recipe, port and mode do not match")
    return name, int(port), mode


def filtered_headers(headers):
    tokens = {token.strip().lower() for value in headers.get_all("Connection", []) for token in value.split(",")}
    excluded = HOP_HEADERS | tokens | {"host", "origin", "content-length", "forwarded"}
    return [(name, value) for name, value in headers.items() if name.lower() not in excluded and not name.lower().startswith("x-forwarded-")]


class ProxyServer(ThreadingHTTPServer):
    daemon_threads = True
    request_queue_size = 16

    def __init__(self, address, target_name, target_port, target_mode, connect_host):
        self.target_name = target_name
        self.target_port = target_port
        self.target_mode = target_mode
        self.connect_host = connect_host
        self.slots = threading.BoundedSemaphore(16)
        super().__init__(address, ProxyHandler)

    def process_request(self, request, client_address):
        if not self.slots.acquire(blocking=False):
            self.shutdown_request(request)
            return
        try:
            super().process_request(request, client_address)
        except BaseException:
            self.slots.release()
            raise

    def process_request_thread(self, request, client_address):
        try:
            super().process_request_thread(request, client_address)
        finally:
            self.slots.release()


class ProxyHandler(BaseHTTPRequestHandler):
    server_version = "CampusProxy/1"
    sys_version = ""

    def setup(self):
        super().setup()
        self.connection.settimeout(5)

    def log_message(self, *args):
        pass

    def error(self, status, reason):
        self.send_body(status, json.dumps({"error": reason}).encode(), [("Content-Type", "application/json; charset=utf-8")])

    def send_body(self, status, raw, headers):
        self.send_response(status)
        for name, value in headers:
            self.send_header(name, value)
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Connection", "close")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.close_connection = True
        if self.command != "HEAD":
            self.wfile.write(raw)

    def valid_request(self):
        hosts = self.headers.get_all("Host", [])
        if len(hosts) != 1 or not re.fullmatch(r"(?:127\.0\.0\.1|localhost)(?::[0-9]{1,5})?", hosts[0]):
            self.error(403, "invalid_host")
            return False
        try:
            port = urlsplit("http://" + hosts[0]).port
        except ValueError:
            port = 0
        if port is not None and not 1 <= port <= 65535:
            self.error(403, "invalid_host")
            return False
        origins = self.headers.get_all("Origin", [])
        if len(origins) > 1 or (origins and origins[0] != "http://" + hosts[0]) or self.headers.get("Sec-Fetch-Site") == "cross-site":
            self.error(403, "invalid_origin")
            return False
        raw_target = self.requestline.split()[1]
        if (len(self.path.encode("utf-8")) > 8192 or not raw_target.startswith("/") or raw_target.startswith("//")
                or "\\" in self.path or "#" in self.path or re.search(r"[\x00-\x20\x7f]|%0[ad]", self.path, re.I)):
            self.error(400, "invalid_request_target")
            return False
        return True

    def read_body(self):
        lengths = self.headers.get_all("Content-Length", [])
        if self.headers.get("Transfer-Encoding") or len(lengths) > 1 or (lengths and (not lengths[0].isascii() or not lengths[0].isdigit())):
            self.error(400, "invalid_body_framing")
            return None
        length = int(lengths[0]) if lengths else 0
        if length > MAX_REQUEST:
            self.error(413, "request_limit")
            return None
        try:
            body = self.rfile.read(length)
            if len(body) != length:
                raise ValueError()
            return body
        except (OSError, ValueError):
            self.error(400, "incomplete_body")
            return None

    def upstream(self, path, method, body=b"", headers=None, limit=MAX_RESPONSE):
        deadline = time.monotonic() + 5
        connection = http.client.HTTPConnection(self.server.connect_host, self.server.target_port, timeout=5)
        try:
            # HTTPConnection has no environment proxy support or automatic redirects.
            connection.connect()
            transport = connection.sock
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise TimeoutError()
            transport.settimeout(remaining)
            connection.putrequest(method, path, skip_host=True, skip_accept_encoding=True)
            for name, value in headers or []:
                connection.putheader(name, value)
            connection.putheader("Host", "127.0.0.1:%d" % self.server.target_port)
            if self.headers.get("Origin"):
                connection.putheader("Origin", "http://127.0.0.1:%d" % self.server.target_port)
            connection.putheader("Connection", "close")
            if body or method not in ("GET", "HEAD"):
                connection.putheader("Content-Length", str(len(body)))
            connection.endheaders(body)
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise TimeoutError()
            transport.settimeout(remaining)
            response = connection.getresponse()
            if 300 <= response.status < 400:
                raise ValueError("redirect")
            if sum(len(name) + len(value) for name, value in response.getheaders()) > 65536:
                raise ValueError("headers")
            declared = response.getheader("Content-Length")
            if declared is not None and (not declared.isascii() or not declared.isdigit() or int(declared) > limit):
                raise ValueError("response_limit")
            chunks, total = [], 0
            while True:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise TimeoutError()
                # HTTPConnection clears .sock for Connection:close responses;
                # its makefile still owns the transport until the body is read.
                transport.settimeout(remaining)
                chunk = response.read1(min(65536, limit + 1 - total))
                if not chunk:
                    break
                chunks.append(chunk)
                total += len(chunk)
                if total > limit:
                    raise ValueError("response_limit")
            return response.status, b"".join(chunks), filtered_headers(response.headers)
        finally:
            connection.close()

    def health(self):
        ready = False
        try:
            status, raw, _ = self.upstream("/" if self.server.target_mode == "juice-shop" else "/health", "GET", limit=65536)
            if self.server.target_mode == "juice-shop":
                ready = status == 200
            else:
                health = json.loads(raw)
                ready = status == 200 and health.get("service") == "campus-lab-runtime" and health.get("protocolVersion") == 1 and health.get("mode") == self.server.target_mode and health.get("ready") is True
        except (OSError, ValueError, http.client.HTTPException):
            pass
        raw = json.dumps({"service": "campus-lab-proxy", "protocolVersion": 1, "targetName": self.server.target_name,
                          "targetPort": self.server.target_port, "targetMode": self.server.target_mode, "ready": ready, "backendReady": ready}).encode()
        self.send_body(200, raw, [("Content-Type", "application/json; charset=utf-8"), ("Cache-Control", "no-store")])

    def forward(self):
        if not self.valid_request():
            return
        body = self.read_body()
        if body is None:
            return
        if self.path == "/_campus_proxy/health":
            if self.command not in ("GET", "HEAD"):
                self.error(405, "method_not_allowed")
            else:
                self.health()
            return
        try:
            status, raw, headers = self.upstream(self.path, self.command, body, filtered_headers(self.headers))
            self.send_body(status, raw, headers)
        except (OSError, ValueError, http.client.HTTPException):
            self.error(502, "upstream_unavailable_or_limited")

    do_GET = forward
    do_HEAD = forward
    do_POST = forward
    do_PUT = forward
    do_PATCH = forward
    do_DELETE = forward
    do_OPTIONS = forward

    def do_CONNECT(self):
        self.error(405, "method_not_allowed")

    do_TRACE = do_CONNECT


def create_proxy_server(target_name, target_port, target_mode, host="0.0.0.0", port=8081, *, connect_host=None):
    # The trusted factory can bind real loopback fixtures. Production uses the
    # strictly validated environment and never supplies connect_host.
    return ProxyServer((host, port), target_name, target_port, target_mode, connect_host or target_name)


def serve_from_environment():
    target_name, target_port, target_mode = target_from_environment(os.environ)
    server = create_proxy_server(target_name, target_port, target_mode)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    serve_from_environment()
