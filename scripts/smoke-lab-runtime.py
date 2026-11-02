"""Verify bundled bytes, docker-load them, and exercise both modes in real isolated containers."""
import argparse
import hashlib
import http.client
import json
import os
from pathlib import Path
import re
import subprocess
import time
import uuid


QUERY = "SELECT source_ip, COUNT(*) AS failures FROM auth_events WHERE outcome='failure' GROUP BY source_ip HAVING COUNT(*)>=3 ORDER BY source_ip"


def docker(*arguments):
    environment = {key: value for key, value in os.environ.items() if not key.upper().startswith("DOCKER_")}
    return subprocess.run(["docker", *arguments], check=True, capture_output=True, text=True,
                          shell=False, env=environment, timeout=180).stdout.strip()


def verify_assets(directory):
    directory = Path(directory)
    manifest_path = directory / "manifest.json"
    if manifest_path.stat().st_size > 16384:
        raise ValueError("Manifest too large")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if not isinstance(manifest, dict) or type(manifest.get("schemaVersion")) is not int or manifest["schemaVersion"] != 1:
        raise ValueError("Unsupported runtime manifest")
    version = manifest.get("version")
    if (not isinstance(version, str) or not re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+(?:[.-][A-Za-z0-9][A-Za-z0-9.-]{0,60})?", version)
            or manifest.get("imageTag") != "campus-lab-runtime:" + version
            or not re.fullmatch(r"sha256:[0-9a-f]{64}", str(manifest.get("imageId")))
            or manifest.get("archive") != "runtime.tar.gz"
            or not re.fullmatch(r"[0-9a-f]{64}", str(manifest.get("sha256")))
            or type(manifest.get("size")) is not int or not 0 < manifest["size"] <= 1024 * 1024 * 1024):
        raise ValueError("Invalid runtime identity or archive metadata")
    archive = directory / "runtime.tar.gz"
    if archive.is_symlink() or archive.stat().st_size != manifest["size"]:
        raise ValueError("Runtime archive size mismatch")
    digest = hashlib.sha256()
    with archive.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    if digest.hexdigest() != manifest["sha256"]:
        raise ValueError("Runtime archive SHA-256 mismatch")
    return manifest


def request(port, path, payload=None, actor=None, expected=200):
    connection = http.client.HTTPConnection("127.0.0.1", port, timeout=6)
    headers = {"Content-Type": "application/json"}
    if actor:
        headers["X-Campus-Actor"] = actor
    body = json.dumps(payload) if payload is not None else None
    try:
        connection.request("POST" if payload is not None else "GET", path, body=body, headers=headers)
        response = connection.getresponse()
        raw = response.read(512 * 1024 + 1)
        assert len(raw) <= 512 * 1024, "HTTP response size exceeded"
        assert response.status == expected, (path, response.status, raw[:200])
        return json.loads(raw) if "application/json" in response.getheader("Content-Type", "") else raw.decode()
    finally:
        connection.close()


def healthy(port, mode):
    deadline = time.monotonic() + 30
    while time.monotonic() < deadline:
        try:
            value = request(port, "/health")
            assert value["service"] == "campus-lab-runtime" and value["protocolVersion"] == 1
            assert value["mode"] == mode and value["ready"] is True
            return value
        except (OSError, http.client.HTTPException):
            time.sleep(0.2)
    raise AssertionError("Runtime did not become ready")


def inspect_container(container_id, network_id, image_id):
    container = json.loads(docker("container", "inspect", container_id))[0]
    config, host = container["Config"], container["HostConfig"]
    assert container["Id"] == container_id and container["Image"] == image_id
    assert config["User"] == "10001:10001" and config["WorkingDir"] == "/app"
    assert config["Cmd"] == ["python", "/app/server.py"] and not config.get("Entrypoint")
    assert not container["Mounts"] and not config.get("Volumes")
    assert not host["Privileged"] and host["ReadonlyRootfs"] and not host.get("Devices")
    assert host["Memory"] == 536870912 and host["NanoCpus"] == 1000000000 and host["PidsLimit"] == 128
    assert host["CapDrop"] == ["ALL"] and not host.get("CapAdd")
    assert any(value in ("no-new-privileges", "no-new-privileges=true") for value in host["SecurityOpt"])
    assert host["RestartPolicy"]["Name"] == "no" and host["NetworkMode"] == network_id
    ports = container["NetworkSettings"]["Ports"]
    assert set(ports) == {"8080/tcp"} and len(ports["8080/tcp"]) == 1
    assert ports["8080/tcp"][0]["HostIp"] == "127.0.0.1"
    network = json.loads(docker("network", "inspect", network_id))[0]
    assert network["Id"] == network_id and network["Internal"] and network["Driver"] == "bridge"
    assert set(network["Containers"]) == {container_id}
    return int(ports["8080/tcp"][0]["HostPort"])


def exercise(port, mode):
    health = healthy(port, mode)
    assert "<html" in request(port, "/")
    case = request(port, "/api/case")
    assert case["caseId"] == health["caseId"] and "solution" not in case
    assert request(port, "/api/events")["events"] == []
    if mode == "soc":
        assert not request(port, "/api/assess", {"actor": "sonda", "failures": 3})["passed"]
        account = case["trainingAccount"]
        for _ in range(3):
            request(port, "/login", {"username": account["username"], "password": "incorrecta"}, "sonda", 401)
        request(port, "/catalog", actor="sonda")
        request(port, "/login", account, "sonda")
        request(port, "/admin", actor="sonda")
        events = request(port, "/api/events")["events"]
        assert [event["status"] for event in events] == [401, 401, 401, 200, 200, 200]
        assert all(event["actor"] == "sonda" and event["peer"] != "sonda" for event in events)
        assert request(port, "/api/assess", {"actor": "sonda", "failures": 3})["passed"]
        request(port, "/api/control", {"action": "block", "actor": "sonda"})
        request(port, "/admin", actor="sonda", expected=403)
        assert request(port, "/api/events")["events"][-1]["outcome"] == "blocked"
        request(port, "/catalog", actor="visitante")
        return health, None
    result = request(port, "/api/query", {"query": QUERY})
    assert result["assessment"]["passed"] and result["rowCount"] == 2
    for query in ("ATTACH DATABASE ':memory:' AS extra", "PRAGMA database_list", "SELECT load_extension('x')", "SELECT 1; SELECT 2"):
        request(port, "/api/query", {"query": query}, expected=400)
    expensive = "WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM n WHERE x<1000000000) SELECT sum(x) FROM n"
    started = time.monotonic()
    request(port, "/api/query", {"query": expensive}, expected=400)
    assert time.monotonic() - started < 4
    assert request(port, "/api/query", {"query": "SELECT 42"})["rows"] == [[42]]
    return health, result["rows"]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--runtime-dir", required=True, type=Path)
    args = parser.parse_args()
    # Verify every archive byte before giving any of them to Docker.
    manifest = verify_assets(args.runtime_dir)
    version = docker("version", "--format", "{{.Server.Version}}")
    assert int(version.split(".")[0]) >= 28, "Docker Engine >= 28 required"
    docker("image", "load", "--input", str(args.runtime_dir / "runtime.tar.gz"))
    image = json.loads(docker("image", "inspect", manifest["imageTag"]))[0]
    assert image["Id"] == manifest["imageId"] and image["Os"] == "linux" and image["Architecture"] == "amd64"
    resources = []
    try:
        for mode in ("soc", "database"):
            suffix = uuid.uuid4().hex[:16]
            network_id = docker("network", "create", "--driver", "bridge", "--internal", "--label", "campus.smoke=" + suffix, "campus-smoke-" + suffix)
            assert re.fullmatch(r"[0-9a-f]{64}", network_id)
            resources.append((None, network_id))
            container_id = docker("run", "--detach", "--name", "campus-smoke-" + suffix,
                                  "--label", "campus.smoke=" + suffix, "--network", network_id,
                                  "--publish", "127.0.0.1::8080", "--cpus", "1", "--memory", "512m",
                                  "--pids-limit", "128", "--cap-drop", "ALL", "--security-opt", "no-new-privileges",
                                  "--read-only", "--restart", "no", "--user", "10001:10001",
                                  "--env", "CAMPUS_LAB_MODE=" + mode, "--env", "CAMPUS_SEED=17", manifest["imageId"])
            assert re.fullmatch(r"[0-9a-f]{64}", container_id)
            resources[-1] = (container_id, network_id)
            port = inspect_container(container_id, network_id, manifest["imageId"])
            before, rows = exercise(port, mode)
            # No DNS or external service is required for this outbound-isolation assertion.
            probe = "import socket,sys\ntry:\n s=socket.create_connection(('1.1.1.1',443),timeout=2)\n s.close()\n sys.exit(1)\nexcept OSError:\n sys.exit(0)"
            docker("exec", container_id, "python", "-c", probe)
            docker("container", "stop", "--time", "3", container_id)
            docker("container", "start", container_id)
            port = inspect_container(container_id, network_id, manifest["imageId"])
            after = healthy(port, mode)
            assert after["caseId"] == before["caseId"] and after["runId"] != before["runId"]
            assert request(port, "/api/events")["events"] == []
            if mode == "database":
                assert request(port, "/api/query", {"query": QUERY})["rows"] == rows
            print("PASS: %s, real HTTP, isolation, restart and loaded image %s" % (mode, manifest["imageId"]))
    except BaseException:
        for container_id, _ in resources:
            if container_id:
                try:
                    print(docker("container", "logs", "--tail", "100", container_id))
                except subprocess.SubprocessError:
                    pass
        raise
    finally:
        # Only full IDs returned by this invocation; no labels, prune or name selectors.
        for container_id, network_id in reversed(resources):
            if container_id:
                docker("container", "rm", "--force", container_id)
            docker("network", "rm", network_id)


if __name__ == "__main__":
    main()
