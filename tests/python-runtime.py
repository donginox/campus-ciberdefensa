"""HTTP integration tests. Run: python tests/python-runtime.py."""
import importlib.util
import json
from pathlib import Path
import threading
import time
import unittest
from urllib.error import HTTPError
from urllib.request import Request, urlopen


RUNTIME = Path(__file__).resolve().parents[1] / "lab-runtime" / "server.py"
runtime = None
if RUNTIME.exists():
    spec = importlib.util.spec_from_file_location("campus_runtime", RUNTIME)
    runtime = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(runtime)


class RuntimeHTTPTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(runtime, "The real HTTP runtime has not been implemented")
        self.servers = []
        self.base = self.start("soc", 17)

    def tearDown(self):
        for server, thread in self.servers:
            server.shutdown()
            server.server_close()
            thread.join(timeout=3)

    def start(self, mode, seed):
        server = runtime.create_server(mode, seed, "127.0.0.1", 0)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        self.servers.append((server, thread))
        return "http://127.0.0.1:%d" % server.server_port

    def request(self, path, payload=None, headers=None, base=None):
        data = json.dumps(payload).encode() if payload is not None else None
        request = Request((base or self.base) + path, data=data,
                          headers={"Content-Type": "application/json", **(headers or {})})
        try:
            response = urlopen(request, timeout=6)
        except HTTPError as error:
            response = error
        with response:
            raw = response.read()
            body = json.loads(raw) if response.headers.get_content_type() == "application/json" else raw.decode()
            return response.status, body, response.headers

    def replay(self, actor="sonda"):
        headers = {"X-Campus-Actor": actor}
        for _ in range(3):
            self.assertEqual(self.request("/login", {"username": "analista", "password": "incorrecta"}, headers)[0], 401)
        self.request("/catalog", headers=headers)
        self.assertEqual(self.request("/login", {"username": "analista", "password": "campus-practica"}, headers)[0], 200)
        self.request("/admin", headers=headers)

    def test_health_dashboard_and_case_are_real_http_without_solutions(self):
        status, health, _ = self.request("/health")
        self.assertEqual(status, 200)
        self.assertEqual((health["service"], health["protocolVersion"], health["mode"]), ("campus-lab-runtime", 1, "soc"))
        _, case, _ = self.request("/api/case")
        self.assertEqual(case["caseId"], health["caseId"])
        self.assertEqual(case["trainingAccount"], {"username": "analista", "password": "campus-practica"})
        self.assertNotIn("solution", case)
        status, html, headers = self.request("/")
        self.assertEqual(status, 200)
        self.assertIn("<html", html)
        self.assertIn("script-src 'self'", headers["Content-Security-Policy"])
        self.assertEqual(self.request("/../server.py")[0], 404)

    def test_soc_assesses_observed_http_and_distinguishes_actor_from_peer(self):
        self.assertFalse(self.request("/api/assess", {"actor": "sonda", "failures": 3})[1]["passed"])
        self.replay()
        _, result, _ = self.request("/api/assess", {"actor": "sonda", "failures": 3})
        self.assertTrue(result["passed"])
        self.assertFalse(self.request("/api/assess", {"actor": "sonda", "failures": 2})[1]["passed"])
        events = self.request("/api/events")[1]["events"]
        self.assertEqual([event["status"] for event in events], [401, 401, 401, 200, 200, 200])
        self.assertTrue(all(event["peer"] == "127.0.0.1" for event in events))
        self.assertTrue(all(event["actor"] == "sonda" for event in events))
        self.assertNotIn("password", json.dumps(events))

    def test_block_only_changes_practice_actor_and_logs_real_block(self):
        self.replay()
        self.assertEqual(self.request("/api/control", {"action": "block", "actor": "sonda"})[0], 200)
        self.assertEqual(self.request("/admin", headers={"X-Campus-Actor": "sonda"})[0], 403)
        self.assertEqual(self.request("/catalog", headers={"X-Campus-Actor": "visitante"})[0], 200)
        events = self.request("/api/events")[1]["events"]
        self.assertEqual(events[-2]["outcome"], "blocked")
        self.assertEqual(self.request("/api/control", {"action": "block", "actor": "127.0.0.1"})[0], 400)

    def test_soc_requires_success_and_admin_after_the_failure_sequence(self):
        headers = {"X-Campus-Actor": "sonda"}
        self.request("/login", {"username": "analista", "password": "campus-practica"}, headers)
        self.request("/admin", headers=headers)
        for _ in range(3):
            self.request("/login", {"username": "analista", "password": "incorrecta"}, headers)
        self.assertFalse(self.request("/api/assess", {"actor": "sonda", "failures": 3})[1]["passed"])
        self.request("/login", {"username": "analista", "password": "campus-practica"}, headers)
        self.request("/admin", headers=headers)
        self.assertTrue(self.request("/api/assess", {"actor": "sonda", "failures": 3})[1]["passed"])

    def test_events_are_bounded_and_restart_has_no_previous_state(self):
        for _ in range(305):
            self.request("/catalog")
        events = self.request("/api/events")[1]["events"]
        self.assertEqual(len(events), 300)
        self.assertEqual(events[-1]["id"], 305)
        fresh = self.start("soc", 17)
        self.assertEqual(self.request("/api/events", base=fresh)[1]["events"], [])

    def test_cross_origin_host_and_non_json_controls_are_rejected(self):
        for headers in ({"Origin": "https://evil.invalid"}, {"Host": "evil.invalid"}, {"Content-Type": "text/plain"}):
            status = self.request("/api/control", {"action": "block", "actor": "sonda"}, headers)[0]
            self.assertIn(status, (400, 403, 415))
        self.assertEqual(self.request("/api/assess", {"actor": "sonda", "failures": True})[0], 400)
        self.assertEqual(self.request("/catalog", headers={"X-Campus-Actor": "<script>"})[0], 400)

    def test_sqlite_returns_real_results_and_assesses_result_values(self):
        database = self.start("database", 17)
        query = "SELECT source_ip, COUNT(*) AS failures FROM auth_events WHERE outcome = 'failure' GROUP BY source_ip HAVING COUNT(*) >= 3 ORDER BY source_ip"
        status, result, _ = self.request("/api/query", {"query": query}, base=database)
        self.assertEqual(status, 200)
        self.assertEqual(result["columns"], ["source_ip", "failures"])
        self.assertTrue(result["assessment"]["passed"])
        self.assertEqual(result["rowCount"], 2)
        self.assertFalse(result["truncated"])
        # Equivalent result with a CTE must pass; matching query text is not evidence.
        cte = "WITH failures AS (SELECT source_ip, count(*) failures FROM auth_events WHERE outcome='failure' GROUP BY source_ip) SELECT * FROM failures WHERE failures>=3 ORDER BY source_ip"
        self.assertTrue(self.request("/api/query", {"query": cte}, base=database)[1]["assessment"]["passed"])
        other = self.start("database", 18)
        self.assertNotEqual(result["rows"], self.request("/api/query", {"query": query}, base=other)[1]["rows"])
        self.assertFalse(self.request("/api/query", {"query": "SELECT * FROM assets"}, base=database)[1]["assessment"]["passed"])

    def test_sqlite_authorizer_rejects_writes_extensions_and_multiple_statements(self):
        database = self.start("database", 1)
        queries = ["ATTACH DATABASE ':memory:' AS other", "PRAGMA database_list", "DELETE FROM users", "SELECT load_extension('x')", "SELECT 1; SELECT 2", "WITH x AS (SELECT 1) DELETE FROM users", "SELECT * FROM pragma_database_list", "SELECT randomblob(1000000000)"]
        for query in queries:
            with self.subTest(query=query):
                self.assertEqual(self.request("/api/query", {"query": query}, base=database)[0], 400)
        self.assertGreater(self.request("/api/query", {"query": "SELECT * FROM users"}, base=database)[1]["rowCount"], 0)

    def test_sqlite_resource_limits_bound_query_cells_columns_rows_and_time(self):
        database = self.start("database", 1)
        self.assertEqual(self.request("/api/query", {"query": "SELECT 1" + " " * 8192}, base=database)[0], 400)
        self.assertEqual(self.request("/api/query", {"query": "SELECT " + ",".join("1" for _ in range(65))}, base=database)[0], 400)
        rows_query = "WITH RECURSIVE x(n) AS (VALUES(1) UNION ALL SELECT n+1 FROM x WHERE n<1000) SELECT n FROM x"
        result = self.request("/api/query", {"query": rows_query}, base=database)[1]
        self.assertEqual(result["rowCount"], 200)
        self.assertTrue(result["truncated"])
        result = self.request("/api/query", {"query": "SELECT printf('%05000d', 1) AS long_value"}, base=database)[1]
        self.assertEqual(len(result["rows"][0][0]), 4096)
        self.assertTrue(result["truncated"])
        started = time.monotonic()
        costly = "WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM n WHERE x<1000000000) SELECT sum(x) FROM n"
        self.assertEqual(self.request("/api/query", {"query": costly}, base=database)[0], 400)
        self.assertLess(time.monotonic() - started, 4)
        # Progress handler is reset after a rejected request.
        self.assertEqual(self.request("/api/query", {"query": "SELECT 42"}, base=database)[1]["rows"], [[42]])

    def test_sqlite_response_budget_includes_escaped_column_names(self):
        database = self.start("database", 1)
        columns = ["printf('%%039d',1) AS \"%s%d\"" % ("\x01" * 70, index) for index in range(64)]
        query = "WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM n WHERE x<200) SELECT " + ",".join(columns) + " FROM n"
        status, result, _ = self.request("/api/query", {"query": query}, base=database)
        self.assertEqual(status, 200)
        self.assertTrue(result["truncated"])
        self.assertGreater(result["rowCount"], 0)
        self.assertLessEqual(len(json.dumps(result, ensure_ascii=False, separators=(",", ":")).encode()), 512 * 1024)

    def test_sqlite_cte_rowset_can_be_counted_without_reading_a_named_column(self):
        database = self.start("database", 1)
        status, result, _ = self.request("/api/query", {"query": "WITH n(x) AS (SELECT 1) SELECT count(*) FROM n"}, base=database)
        self.assertEqual(status, 200)
        self.assertEqual(result["rows"], [[1]])


if __name__ == "__main__":
    unittest.main()
