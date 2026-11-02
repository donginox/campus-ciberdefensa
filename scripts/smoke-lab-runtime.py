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


def published_port(container):
    """Require actual publication, not merely the request saved in HostConfig.

    Moby publishes via a default-gateway endpoint. An exclusively --internal
    network can retain PortBindings while Ports is empty: waiting cannot fix it.
    https://github.com/moby/moby/discussions/53256
    """
    ports = container["NetworkSettings"]["Ports"]
    published = {key: value for key, value in ports.items() if value}
    if not published:
        raise RuntimeError("unsupported_internal_port_publishing: Docker did not publish the requested loopback port; an internal-only network has no default-gateway endpoint. See bounded inspection evidence.")
    bindings = published.get("8081/tcp")
    if set(ports) - {"8080/tcp", "8081/tcp"} or set(published) != {"8081/tcp"} or not isinstance(bindings, list) or len(bindings) != 1:
        raise RuntimeError("unsafe_port_publication: expected exactly one published proxy 8081/tcp binding")
    binding = bindings[0]
    port = binding.get("HostPort")
    if binding.get("HostIp") != "127.0.0.1" or not isinstance(port, str) or not port.isascii() or not port.isdigit() or not 1 <= int(port) <= 65535:
        raise RuntimeError("unsafe_port_publication: expected 127.0.0.1 and a concrete valid host port")
    return int(port)


def diagnostic_snapshot(container, network):
    host = container.get("HostConfig", {})
    settings = container.get("NetworkSettings", {})
    evidence = {"containerId": container.get("Id"), "imageId": container.get("Image"),
                "State": container.get("State"), "PortBindings": host.get("PortBindings"),
                "NetworkMode": host.get("NetworkMode"), "Ports": settings.get("Ports"),
                "Networks": settings.get("Networks"),
                "network": {key: network.get(key) for key in ("Id", "Driver", "Internal", "EnableIPv4", "EnableIPv6", "Options", "IPAM", "Containers")}}
    value = json.dumps(evidence, ensure_ascii=True, separators=(",", ":"), default=str)
    return value if len(value) <= 8192 else value[:8178] + "...[truncated]"


def emit_diagnostics(container_id, network_id):
    try:
        container = json.loads(docker("container", "inspect", container_id))[0] if container_id else {}
        network = json.loads(docker("network", "inspect", network_id))[0]
        print("CAMPUS_SMOKE_INSPECTION " + diagnostic_snapshot(container, network), flush=True)
    except (subprocess.SubprocessError, ValueError, OSError) as error:
        print("CAMPUS_SMOKE_INSPECTION_UNAVAILABLE " + str(error)[:1000], flush=True)


def inspect_container(container_id, primary_network_id, image_id, network_ids, proxy=False):
    container = json.loads(docker("container", "inspect", container_id))[0]
    config, host = container["Config"], container["HostConfig"]
    assert container["Id"] == container_id and container["Image"] == image_id
    assert config["User"] == "10001:10001" and config["WorkingDir"] == "/app"
    assert config["Cmd"] == ["python", "/app/server.py"] and not config.get("Entrypoint")
    assert not container["Mounts"] and not config.get("Volumes")
    assert not host["Privileged"] and host["ReadonlyRootfs"] and not host.get("Devices")
    assert host["Memory"] == 536870912 and host["MemorySwap"] == 536870912 and host["NanoCpus"] == 1000000000 and host["PidsLimit"] == 128
    assert host["CapDrop"] == ["ALL"] and not host.get("CapAdd")
    assert any(value in ("no-new-privileges", "no-new-privileges=true") for value in host["SecurityOpt"])
    assert host["RestartPolicy"]["Name"] == "no" and host["NetworkMode"] == primary_network_id
    assert set(container["Config"]["ExposedPorts"]) == {"8080/tcp", "8081/tcp"}
    assert {value["NetworkID"] for value in container["NetworkSettings"]["Networks"].values()} == set(network_ids)
    if proxy:
        return published_port(container)
    assert not host.get("PortBindings"), "Target must not request host publication"
    assert not any(container["NetworkSettings"]["Ports"].values()), "Target must not publish ports"
    return None


def inspect_network(network_id, internal, members):
    network = json.loads(docker("network", "inspect", network_id))[0]
    assert network["Id"] == network_id and network["Internal"] is internal and network["Driver"] == "bridge"
    assert set(network["Containers"]) == set(members)


def proxy_healthy(port, name, mode):
    deadline = time.monotonic() + 30
    while time.monotonic() < deadline:
        try:
            value = request(port, "/_campus_proxy/health")
            assert value["service"] == "campus-lab-proxy" and value["protocolVersion"] == 1
            assert (value["targetName"], value["targetPort"], value["targetMode"]) == (name, 8080, mode)
            if value["ready"] is True and value["backendReady"] is True:
                return
        except (OSError, http.client.HTTPException):
            pass
        time.sleep(0.2)
    raise AssertionError("Proxy did not become ready for its fixed target")


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
    print("CAMPUS_SMOKE_ENGINE " + version[:100], flush=True)
    docker("image", "load", "--input", str(args.runtime_dir / "runtime.tar.gz"))
    image = json.loads(docker("image", "inspect", manifest["imageTag"]))[0]
    assert image["Id"] == manifest["imageId"] and image["Os"] == "linux" and image["Architecture"] == "amd64"
    networks, containers = [], []
    resources = []
    try:
        for mode in ("soc", "database"):
            suffix = uuid.uuid4().hex[:16]
            lab_id = "soc-response" if mode == "soc" else "database-fundamentals"
            name = "campus-%s-%s-%s" % (uuid.uuid4(), uuid.uuid4(), lab_id)
            target_alias = "target-" + hashlib.sha256(name.encode()).hexdigest()[:24]
            internal_id = docker("network", "create", "--driver", "bridge", "--internal", "--label", "campus.smoke=" + suffix, name + "-internal")
            assert re.fullmatch(r"[0-9a-f]{64}", internal_id)
            networks.append(internal_id)
            edge_id = docker("network", "create", "--driver", "bridge", "--label", "campus.smoke=" + suffix, name + "-edge")
            assert re.fullmatch(r"[0-9a-f]{64}", edge_id)
            networks.append(edge_id)
            common = ["--platform", "linux/amd64", "--label", "campus.smoke=" + suffix, "--cpus", "1", "--memory", "512m", "--memory-swap", "512m", "--pids-limit", "128",
                      "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--read-only", "--restart", "no", "--user", "10001:10001"]
            container_id = docker("container", "create", "--name", name, "--network", internal_id, "--network-alias", target_alias, *common,
                                  "--env", "CAMPUS_LAB_MODE=" + mode, "--env", "CAMPUS_SEED=17", manifest["imageId"])
            assert re.fullmatch(r"[0-9a-f]{64}", container_id)
            containers.append(container_id)
            resources.append((container_id, internal_id))
            docker("container", "start", container_id)
            proxy_id = docker("container", "create", "--name", name + "-proxy", "--network", edge_id, "--network", internal_id,
                              "--publish", "127.0.0.1::8081", *common,
                              "--env", "CAMPUS_LAB_MODE=proxy", "--env", "CAMPUS_SEED=1",
                              "--env", "CAMPUS_TARGET_NAME=" + target_alias, "--env", "CAMPUS_TARGET_PORT=8080",
                              "--env", "CAMPUS_TARGET_MODE=" + mode, manifest["imageId"])
            assert re.fullmatch(r"[0-9a-f]{64}", proxy_id)
            containers.append(proxy_id)
            resources.append((proxy_id, edge_id))
            docker("container", "start", proxy_id)
            inspect_container(container_id, internal_id, manifest["imageId"], [internal_id])
            port = inspect_container(proxy_id, edge_id, manifest["imageId"], [internal_id, edge_id], proxy=True)
            inspect_network(internal_id, True, [container_id, proxy_id])
            inspect_network(edge_id, False, [proxy_id])
            proxy_healthy(port, target_alias, mode)
            before, rows = exercise(port, mode)
            # No DNS or external service is required for this outbound-isolation assertion.
            probe = "import socket,sys\ntry:\n s=socket.create_connection(('1.1.1.1',443),timeout=2)\n s.close()\n sys.exit(1)\nexcept OSError:\n sys.exit(0)"
            docker("exec", container_id, "python", "-c", probe)
            docker("container", "stop", "--time", "3", container_id)
            docker("container", "start", container_id)
            inspect_container(container_id, internal_id, manifest["imageId"], [internal_id])
            port = inspect_container(proxy_id, edge_id, manifest["imageId"], [internal_id, edge_id], proxy=True)
            proxy_healthy(port, target_alias, mode)
            after = healthy(port, mode)
            assert after["caseId"] == before["caseId"] and after["runId"] != before["runId"]
            assert request(port, "/api/events")["events"] == []
            if mode == "database":
                assert request(port, "/api/query", {"query": QUERY})["rows"] == rows
            print("PASS: %s, fixed proxy HTTP, target outbound isolation, restart and loaded image %s" % (mode, manifest["imageId"]), flush=True)
    except BaseException:
        for container_id, network_id in resources:
            emit_diagnostics(container_id, network_id)
            if container_id:
                try:
                    print(docker("container", "logs", "--tail", "100", container_id)[-16384:], flush=True)
                except subprocess.SubprocessError:
                    pass
        raise
    finally:
        # Only full IDs returned by this invocation; no labels, prune or name selectors.
        for container_id in reversed(containers):
            docker("container", "rm", "--force", container_id)
        for network_id in reversed(networks):
            docker("network", "rm", network_id)


if __name__ == "__main__":
    main()
