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


if __name__ == "__main__":
    unittest.main()
