"""Build the pinned Linux runtime and package the exact docker-save stream for installers."""
import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile


ID_PATTERN = re.compile(r"sha256:[0-9a-f]{64}\Z")
VERSION_PATTERN = re.compile(r"[0-9]+\.[0-9]+\.[0-9]+(?:[.-][A-Za-z0-9][A-Za-z0-9.-]{0,60})?\Z")


def docker(*arguments):
    environment = {key: value for key, value in os.environ.items() if not key.upper().startswith("DOCKER_")}
    return subprocess.run(["docker", *arguments], check=True, text=True, capture_output=True,
                          shell=False, env=environment, timeout=900).stdout.strip()


def validate_identity(image_id, version):
    if not isinstance(image_id, str) or not ID_PATTERN.fullmatch(image_id):
        raise ValueError("Invalid exact image ID")
    if not isinstance(version, str) or not VERSION_PATTERN.fullmatch(version):
        raise ValueError("Version must be a bounded semantic version")


def package_image(image_id, version, output_dir, source):
    """Stream a docker-save tar into deterministic gzip; publish manifest only after hashing."""
    validate_identity(image_id, version)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="campus-runtime-", dir=output_dir) as temporary:
        temporary = Path(temporary)
        archive = temporary / "runtime.tar.gz"
        with archive.open("wb") as destination:
            with gzip.GzipFile(filename="", mode="wb", fileobj=destination, mtime=0, compresslevel=6) as compressed:
                shutil.copyfileobj(source, compressed, 1024 * 1024)
        digest = hashlib.sha256()
        with archive.open("rb") as stream:
            for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                digest.update(chunk)
        manifest = {"schemaVersion": 1, "version": version, "imageId": image_id,
                    "imageTag": "campus-lab-runtime:" + version, "archive": "runtime.tar.gz",
                    "sha256": digest.hexdigest(), "size": archive.stat().st_size}
        manifest_path = temporary / "manifest.json"
        manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
        os.replace(archive, output_dir / "runtime.tar.gz")
        os.replace(manifest_path, output_dir / "manifest.json")
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--version", required=True)
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args()
    validate_identity("sha256:" + "0" * 64, args.version)
    root = Path(__file__).resolve().parents[1]
    tag = "campus-lab-runtime:" + args.version
    docker("build", "--platform", "linux/amd64", "--pull", "--tag", tag,
           "--file", str(root / "lab-runtime" / "Dockerfile"), str(root / "lab-runtime"))
    image = json.loads(docker("image", "inspect", tag))[0]
    validate_identity(image["Id"], args.version)
    config = image["Config"]
    if (image.get("Os") != "linux" or image.get("Architecture") != "amd64" or
            config.get("User") != "10001:10001" or config.get("WorkingDir") != "/app" or
            config.get("Cmd") != ["python", "/app/server.py"] or config.get("Entrypoint") or
            config.get("Volumes") or set(config.get("ExposedPorts", {})) != {"8080/tcp"}):
        raise ValueError("Built image configuration does not match the runtime contract")
    with tempfile.TemporaryDirectory(prefix="campus-docker-save-") as temporary:
        raw_archive = Path(temporary) / "runtime.tar"
        # Save by tag so docker load restores the exact human-readable version tag.
        docker("image", "save", "--output", str(raw_archive), tag)
        with raw_archive.open("rb") as source:
            manifest = package_image(image["Id"], args.version, args.output_dir, source)
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
