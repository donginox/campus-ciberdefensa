"""Packaging tests exercise real gzip bytes and trust checks without a Docker daemon."""
import gzip
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]


def module(name, filename):
    path = ROOT / "scripts" / filename
    if not path.exists():
        return None
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


build = module("build_runtime", "build-lab-runtime.py")
smoke = module("smoke_runtime", "smoke-lab-runtime.py")


class PackagingTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(build, "Runtime archive packager missing")
        self.assertIsNotNone(smoke, "Runtime archive verification missing")
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.output = Path(self.directory.name)
        self.image_id = "sha256:" + "a" * 64

    def package(self, value=b"real stream bytes"):
        return build.package_image(self.image_id, "0.1.0", self.output, io.BytesIO(value))

    def test_manifest_hash_size_identity_and_deterministic_gzip_match_final_bytes(self):
        self.package()
        first = (self.output / "runtime.tar.gz").read_bytes()
        manifest = json.loads((self.output / "manifest.json").read_text())
        self.assertEqual(gzip.decompress(first), b"real stream bytes")
        self.assertEqual(manifest, {"schemaVersion": 1, "version": "0.1.0", "imageId": self.image_id,
                                    "imageTag": "campus-lab-runtime:0.1.0", "archive": "runtime.tar.gz",
                                    "sha256": hashlib.sha256(first).hexdigest(), "size": len(first)})
        self.package()
        self.assertEqual(first, (self.output / "runtime.tar.gz").read_bytes())
        self.assertEqual(smoke.verify_assets(self.output)["imageId"], self.image_id)

    def test_truncated_or_tampered_archive_fails_before_load(self):
        self.package()
        archive = self.output / "runtime.tar.gz"
        archive.write_bytes(archive.read_bytes()[:-1])
        with self.assertRaises(ValueError):
            smoke.verify_assets(self.output)

    def test_manifest_does_not_authorize_path_tag_or_image_injection(self):
        for field, value in (("archive", "../outside.tar.gz"), ("imageTag", "other:latest"), ("imageId", "alpine"), ("size", True), ("schemaVersion", 2)):
            with self.subTest(field=field):
                self.package()
                path = self.output / "manifest.json"
                manifest = json.loads(path.read_text())
                manifest[field] = value
                path.write_text(json.dumps(manifest))
                with self.assertRaises(ValueError):
                    smoke.verify_assets(self.output)

    def test_invalid_versions_cannot_inject_docker_flags_or_tags(self):
        for value in ("../x", "--privileged", "latest/x", "1\n2", ""):
            with self.subTest(value=value):
                with self.assertRaises(ValueError):
                    build.package_image(self.image_id, value, self.output, io.BytesIO(b"x"))


class PublishedPortTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(smoke)
        self.assertTrue(hasattr(smoke, "published_port"), "Smoke must diagnose actual missing Docker port publication")

    def container(self, ports):
        return {"State": {"Running": True, "Status": "running", "ExitCode": 0},
                "HostConfig": {"PortBindings": {"8081/tcp": [{"HostIp": "127.0.0.1", "HostPort": ""}]}},
                "NetworkSettings": {"Ports": ports}}

    def test_internal_only_network_missing_mappings_fail_with_specific_diagnostic(self):
        for ports in ({}, {"8080/tcp": None, "8081/tcp": None}, {"8080/tcp": None, "8081/tcp": []}):
            with self.subTest(ports=ports):
                with self.assertRaisesRegex(RuntimeError, "unsupported_internal_port_publishing"):
                    smoke.published_port(self.container(ports))

    def test_actual_loopback_publication_is_required_and_returned(self):
        self.assertEqual(smoke.published_port(self.container({"8080/tcp": None, "8081/tcp": [{"HostIp": "127.0.0.1", "HostPort": "49170"}]})), 49170)
        for binding in ({"HostIp": "0.0.0.0", "HostPort": "49170"}, {"HostIp": "127.0.0.1", "HostPort": ""}, {"HostIp": "127.0.0.1", "HostPort": "65536"}):
            with self.subTest(binding=binding):
                with self.assertRaisesRegex(RuntimeError, "unsafe_port_publication"):
                    smoke.published_port(self.container({"8080/tcp": None, "8081/tcp": [binding]}))

    def test_diagnostics_show_actual_requested_ports_and_state_without_environment(self):
        self.assertTrue(hasattr(smoke, "diagnostic_snapshot"), "Smoke failure must print bounded inspection evidence")
        container = self.container({"8080/tcp": None, "8081/tcp": []})
        container["Config"] = {"Env": ["SECRET=must-not-print"]}
        network = {"Id": "b" * 64, "Driver": "bridge", "Internal": True, "IPAM": {"Config": [{"Subnet": "172.20.0.0/16", "Gateway": "172.20.0.1"}]}}
        evidence = smoke.diagnostic_snapshot(container, network)
        self.assertIn('"PortBindings"', evidence)
        self.assertIn('"Ports"', evidence)
        self.assertIn('"Internal":true', evidence)
        self.assertNotIn("must-not-print", evidence)
        container["State"]["Error"] = "x" * 20000
        self.assertLessEqual(len(smoke.diagnostic_snapshot(container, network)), 8192)


if __name__ == "__main__":
    unittest.main()
