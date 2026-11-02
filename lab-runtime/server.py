"""Bounded, in-memory practice targets. No subprocesses, external dependencies or file API."""
from collections import deque
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import math
import os
from pathlib import Path
import random
import re
import sqlite3
import threading
import time
from urllib.parse import urlsplit
import uuid


ACTORS = ("sonda", "visitante", "operador")
ACCOUNT = {"username": "analista", "password": "campus-practica"}
MAX_RESPONSE = 512 * 1024
STATIC_DIR = Path(__file__).resolve().parent
STATIC = {"/": ("text/html; charset=utf-8", "dashboard.html"),
          "/app.js": ("text/javascript; charset=utf-8", "dashboard.js"),
          "/style.css": ("text/css; charset=utf-8", "dashboard.css")}


class RejectedQuery(ValueError):
    pass


def encode(value):
    return json.dumps(value, ensure_ascii=False, allow_nan=False, separators=(",", ":")).encode("utf-8")


class PracticeState:
    def __init__(self, mode, seed):
        if mode not in ("soc", "database") or type(seed) is not int or not 1 <= seed <= 2147483647:
            raise ValueError("Invalid practice mode or seed")
        self.mode = mode
        self.case_id = "campus-%s-v1-%d" % (mode, seed)
        self.run_id = str(uuid.uuid4())
        self.events = deque(maxlen=300)
        self.sequence = 0
        self.blocked = set()
        self.lock = threading.Lock()
        self.database = None
        if mode == "database":
            self.database = sqlite3.connect(":memory:", check_same_thread=False)
            self._seed_database(seed)

    def _seed_database(self, seed):
        db = self.database
        db.executescript("""
            CREATE TABLE auth_events(id INTEGER PRIMARY KEY, occurred_at TEXT NOT NULL,
                source_ip TEXT NOT NULL, username TEXT NOT NULL, outcome TEXT NOT NULL);
            CREATE TABLE assets(id INTEGER PRIMARY KEY, hostname TEXT NOT NULL,
                owner TEXT NOT NULL, criticality TEXT NOT NULL);
            CREATE TABLE users(id INTEGER PRIMARY KEY, username TEXT NOT NULL, department TEXT NOT NULL);
        """)
        # Documentation-only address ranges; these are fictional records, never network targets.
        rng = random.Random(seed)
        ips = ["192.0.2.%d" % n for n in rng.sample(range(1, 255), 4)]
        counts = [rng.randint(3, 8), rng.randint(3, 8), 1, 2]
        self.expected_rows = sorted([[ip, count] for ip, count in zip(ips[:2], counts[:2])])
        records = []
        for index, (ip, count) in enumerate(zip(ips, counts)):
            for number in range(count):
                records.append(("2026-01-15T09:%02d:%02dZ" % (index, number), ip, "cuenta-%d" % (index + 1), "failure"))
            records.append(("2026-01-15T09:%02d:30Z" % index, ip, "cuenta-%d" % (index + 1), "success"))
        db.executemany("INSERT INTO auth_events(occurred_at,source_ip,username,outcome) VALUES (?,?,?,?)", records)
        db.executemany("INSERT INTO assets(hostname,owner,criticality) VALUES (?,?,?)", [("portal-formacion", "equipo-a", "high"), ("catalogo", "equipo-b", "medium"), ("archivo", "equipo-a", "low")])
        db.executemany("INSERT INTO users(username,department) VALUES (?,?)", [("analista", "seguridad"), ("editor", "formacion"), ("soporte", "operaciones")])
        db.commit()
        db.execute("PRAGMA temp_store=MEMORY")
        db.execute("PRAGMA query_only=ON")
        db.enable_load_extension(False)
        db.setlimit(sqlite3.SQLITE_LIMIT_LENGTH, 131072)
        db.setlimit(sqlite3.SQLITE_LIMIT_SQL_LENGTH, 8192)
        db.setlimit(sqlite3.SQLITE_LIMIT_COLUMN, 64)
        db.setlimit(sqlite3.SQLITE_LIMIT_EXPR_DEPTH, 50)
        db.setlimit(sqlite3.SQLITE_LIMIT_COMPOUND_SELECT, 10)
        db.setlimit(sqlite3.SQLITE_LIMIT_VARIABLE_NUMBER, 0)
        db.set_authorizer(self._authorize)

    @staticmethod
    def _authorize(action, first, second, database, trigger):
        if action in (sqlite3.SQLITE_SELECT, sqlite3.SQLITE_RECURSIVE):
            return sqlite3.SQLITE_OK
        if action == sqlite3.SQLITE_READ and (first in ("auth_events", "assets", "users") or (database is None and second == "")):
            return sqlite3.SQLITE_OK
        allowed_functions = {"count", "sum", "avg", "min", "max", "total", "abs", "round", "length", "lower", "upper", "trim", "ltrim", "rtrim", "substr", "substring", "coalesce", "ifnull", "nullif", "printf", "format", "like", "glob", "replace", "typeof", "date", "time", "datetime", "strftime", "julianday", "unixepoch", "iif", "group_concat", "row_number", "rank", "dense_rank"}
        if action == sqlite3.SQLITE_FUNCTION and (second or "").lower() in allowed_functions:
            return sqlite3.SQLITE_OK
        return sqlite3.SQLITE_DENY

    def case(self):
        common = {"caseId": self.case_id, "mode": self.mode,
                  "sourceNote": "Caso ficticio propio. Servicio HTTP local; estado en memoria. No acredita una certificación."}
        if self.mode == "soc":
            return {**common, "title": "Investigar accesos HTTP", "description": "Observá solicitudes reales a este objetivo de práctica. Actor es una etiqueta ficticia; peer es el origen HTTP real.",
                    "objective": "Identificá el actor con al menos tres fallos y su cantidad exacta, seguido de un acceso correcto y acceso a administración.",
                    "actors": list(ACTORS), "trainingAccount": dict(ACCOUNT)}
        return {**common, "title": "Investigar registros con SQLite", "description": "Tablas reales en SQLite: auth_events(id, occurred_at, source_ip, username, outcome), assets(id, hostname, owner, criticality), users(id, username, department). outcome contiene failure o success.",
                "objective": "Obtené las columnas source_ip y failures: una fila por origen con tres o más fallos. Ordená por source_ip ascendente."}

    def record(self, actor, peer, method, path, outcome, status, account=None):
        self.sequence += 1
        event = {"id": self.sequence, "time": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                 "actor": actor, "peer": peer, "method": method, "path": path, "outcome": outcome, "status": status}
        if account is not None:
            event["account"] = account
        self.events.append(event)

    def assess(self, actor, failures):
        with self.lock:
            events = [event for event in self.events if event["actor"] == actor]
            failure_ids = [event["id"] for event in events if event["path"] == "/login" and event["outcome"] == "failure"]
            observed = len(failure_ids)
            successes = [event["id"] for event in events if event["path"] == "/login" and event["outcome"] == "success" and len(failure_ids) >= 3 and event["id"] > failure_ids[2]]
            admin = any(event["path"] == "/admin" and event["status"] == 200 and any(before < event["id"] for before in successes) for event in events)
            passed = observed >= 3 and failures == observed and admin
        return {"caseId": self.case_id, "passed": passed, "feedback": "La hipótesis coincide con los eventos HTTP actuales." if passed else "Revisá los fallos, el actor y la secuencia de accesos en los eventos actuales."}

    def query(self, sql):
        if not isinstance(sql, str) or not sql.strip() or len(sql.encode("utf-8")) > 8192:
            raise RejectedQuery("Consulta vacía o mayor a 8 KB.")
        # SQLite's authorizer is the actual security boundary; this also limits the lesson dialect.
        if not re.match(r"\A\s*(?:SELECT|WITH)\b", sql, re.I):
            raise RejectedQuery("Usá una única consulta SELECT o WITH de lectura.")
        started = time.monotonic()
        deadline = started + 2.0
        steps = 0

        def progress():
            nonlocal steps
            steps += 1000
            return time.monotonic() >= deadline or steps >= 5000000

        with self.lock:
            self.database.set_progress_handler(progress, 1000)
            try:
                cursor = self.database.execute(sql)
                columns = [column[0][:256] for column in cursor.description]
                if len(columns) > 64:
                    raise RejectedQuery("La consulta supera 64 columnas.")
                rows = []
                truncated = False
                budget = len(encode(columns))
                for row in cursor:
                    if time.monotonic() >= deadline:
                        raise RejectedQuery("La consulta excedió el presupuesto de ejecución.")
                    if len(rows) == 200:
                        truncated = True
                        break
                    values = []
                    for value in row:
                        if isinstance(value, bytes):
                            value = value.hex()
                        if isinstance(value, float) and not math.isfinite(value):
                            value = None
                        if isinstance(value, str) and len(value) > 4096:
                            value = value[:4096]
                            truncated = True
                        values.append(value)
                    size = len(encode(values)) + 1
                    if budget + size > MAX_RESPONSE - 8192:
                        truncated = True
                        break
                    budget += size
                    rows.append(values)
                passed = columns == ["source_ip", "failures"] and rows == self.expected_rows and not truncated
                return {"caseId": self.case_id, "columns": columns, "rows": rows, "rowCount": len(rows), "truncated": truncated,
                        "elapsedMs": round((time.monotonic() - started) * 1000, 2),
                        "assessment": {"passed": passed, "feedback": "El resultado coincide con los registros del caso." if passed else "Revisá columnas, agrupación, filtro y orden del resultado."}}
            except sqlite3.Error:
                raise RejectedQuery("Consulta rechazada: solo lectura, una sentencia y recursos limitados.") from None
            finally:
                self.database.set_progress_handler(None, 0)


class PracticeServer(ThreadingHTTPServer):
    daemon_threads = True
    request_queue_size = 16

    def __init__(self, address, state):
        self.state = state
        self.slots = threading.BoundedSemaphore(16)
        super().__init__(address, PracticeHandler)

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

    def server_close(self):
        super().server_close()
        if self.state.database is not None:
            self.state.database.close()


class PracticeHandler(BaseHTTPRequestHandler):
    server_version = "CampusPractice/1"
    sys_version = ""

    def setup(self):
        super().setup()
        self.connection.settimeout(5)

    def log_message(self, *args):
        pass  # No credentials or untrusted request strings in process logs.

    def reply(self, status, value, content_type="application/json; charset=utf-8"):
        raw = encode(value) if content_type.startswith("application/json") else value
        if len(raw) > MAX_RESPONSE:
            status, raw, content_type = 500, encode({"error": "response_limit"}), "application/json"
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy", "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'")
        self.send_header("Connection", "close")
        self.end_headers()
        self.close_connection = True
        self.wfile.write(raw)

    def valid_source(self):
        hosts = self.headers.get_all("Host", [])
        if len(hosts) != 1 or not re.fullmatch(r"(?:127\.0\.0\.1|localhost)(?::[0-9]{1,5})?", hosts[0]):
            self.reply(403, {"error": "invalid_host"})
            return False
        parsed = urlsplit("http://" + hosts[0])
        try:
            port = parsed.port
        except ValueError:
            port = 0
        if port is not None and not 1 <= port <= 65535:
            self.reply(403, {"error": "invalid_host"})
            return False
        origins = self.headers.get_all("Origin", [])
        if len(origins) > 1 or (origins and origins[0] != "http://" + hosts[0]):
            self.reply(403, {"error": "invalid_origin"})
            return False
        if self.headers.get("Sec-Fetch-Site") == "cross-site":
            self.reply(403, {"error": "invalid_origin"})
            return False
        return True

    def payload(self):
        if self.headers.get_content_type() != "application/json":
            self.reply(415, {"error": "json_required"})
            return None
        lengths = self.headers.get_all("Content-Length", [])
        if self.headers.get("Transfer-Encoding") or len(lengths) != 1 or not lengths[0].isdigit() or not 0 < int(lengths[0]) <= 32768:
            self.reply(400, {"error": "invalid_body_size"})
            return None
        try:
            raw = self.rfile.read(int(lengths[0]))
            if len(raw) != int(lengths[0]):
                raise ValueError()
            value = json.loads(raw.decode("utf-8"))
            if not isinstance(value, dict):
                raise ValueError()
            return value
        except (ValueError, UnicodeError, TimeoutError):
            self.reply(400, {"error": "invalid_json"})
            return None

    def traffic(self, path, body=None):
        state = self.server.state
        actor = self.headers.get("X-Campus-Actor", "visitante")
        if actor not in ACTORS:
            self.reply(400, {"error": "invalid_actor"})
            return
        account = None
        with state.lock:
            if actor in state.blocked:
                status, outcome = 403, "blocked"
            elif path == "/login":
                if not isinstance(body.get("username"), str) or not isinstance(body.get("password"), str) or len(body["username"]) > 100 or len(body["password"]) > 200:
                    self.reply(400, {"error": "invalid_credentials"})
                    return
                account = body["username"]
                status = 200 if body == ACCOUNT else 401
                outcome = "success" if status == 200 else "failure"
            else:
                status, outcome = 200, "access"
            state.record(actor, self.client_address[0], self.command, path, outcome, status, account)
        self.reply(status, {"caseId": state.case_id, "outcome": outcome})

    def do_GET(self):
        if not self.valid_source():
            return
        state = self.server.state
        path = self.path
        if path == "/health":
            self.reply(200, {"service": "campus-lab-runtime", "protocolVersion": 1, "mode": state.mode, "caseId": state.case_id,
                             "ready": True, "runId": state.run_id, "recipeVersion": 1, "seedVersion": 1})
        elif path == "/api/case":
            self.reply(200, state.case())
        elif path == "/api/events":
            with state.lock:
                events = list(state.events)
            self.reply(200, {"caseId": state.case_id, "events": events})
        elif state.mode == "soc" and path in ("/catalog", "/admin"):
            self.traffic(path)
        elif path in STATIC:
            content_type, filename = STATIC[path]
            self.reply(200, (STATIC_DIR / filename).read_bytes(), content_type)
        else:
            self.reply(404, {"error": "not_found"})

    def do_POST(self):
        if not self.valid_source():
            return
        body = self.payload()
        if body is None:
            return
        state = self.server.state
        if state.mode == "soc" and self.path == "/login":
            self.traffic("/login", body)
        elif state.mode == "soc" and self.path in ("/api/assess", "/api/control"):
            actor = body.get("actor")
            if actor not in ACTORS:
                self.reply(400, {"error": "invalid_actor"})
            elif self.path == "/api/assess":
                failures = body.get("failures")
                if type(failures) is not int or not 0 <= failures <= 300:
                    self.reply(400, {"error": "invalid_failures"})
                else:
                    self.reply(200, state.assess(actor, failures))
            elif body.get("action") != "block":
                self.reply(400, {"error": "invalid_action"})
            else:
                with state.lock:
                    state.blocked.add(actor)
                self.reply(200, {"caseId": state.case_id, "action": "block", "actor": actor, "blocked": True,
                                 "feedback": "Regla aplicada solo al actor ficticio de esta aplicación de práctica."})
        elif state.mode == "database" and self.path == "/api/query":
            try:
                self.reply(200, state.query(body.get("query")))
            except RejectedQuery as error:
                self.reply(400, {"caseId": state.case_id, "error": "query_rejected", "feedback": str(error)})
        else:
            self.reply(404, {"error": "not_found"})


def create_server(mode, seed, host="0.0.0.0", port=8080):
    return PracticeServer((host, port), PracticeState(mode, seed))


if __name__ == "__main__":
    if os.environ.get("CAMPUS_LAB_MODE") == "proxy":
        from proxy import serve_from_environment
        serve_from_environment()
    else:
        server = create_server(os.environ.get("CAMPUS_LAB_MODE", "soc"), int(os.environ.get("CAMPUS_SEED", "1")))
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
        finally:
            server.server_close()
