"""Build the answer-free packet case ZIP; Python standard library only.

Run without arguments to write the committed artifact; --check compares its
bytes with two deterministic builds and independently verifies ZIP contents.
The source material tree and its original hash manifest are never modified.
"""
import argparse
import hashlib
import io
from pathlib import Path, PurePosixPath
import posixpath
import zipfile

ROOT = Path(__file__).resolve().parents[1]
MATERIALS = ROOT / "assets" / "materials"
DESTINATION = MATERIALS / "packet-analysis-pack.zip"
HASH_PATH = "packet-analysis/SHA256SUMS.txt"


def build():
    files = {"packet-analysis.html": (MATERIALS / "packet-analysis.html").read_bytes()}
    for source in sorted((MATERIALS / "packet-analysis").rglob("*")):
        if source.is_file() and source.name not in ("correccion.txt", "SHA256SUMS.txt"):
            files[source.relative_to(MATERIALS).as_posix()] = source.read_bytes()
    # The original reader has an index link. Keep that navigation useful offline
    # without pulling unrelated campus materials into the case bundle.
    files["indice.html"] = ('<!doctype html><html lang="es"><head><meta charset="utf-8">'
                            '<meta name="viewport" content="width=device-width,initial-scale=1">'
                            '<title>Paquete de análisis de tráfico</title></head><body><main>'
                            '<h1>Paquete offline de análisis de tráfico sintético</h1>'
                            '<p><a href="packet-analysis.html">Abrir guía y consignas</a></p>'
                            '<p>Este paquete excluye las correcciones. Se exportan por separado desde el campus '
                            'después de guardar el primer informe de cada caso.</p>'
                            '<p>Verificá packet-analysis/SHA256SUMS.txt desde la carpeta packet-analysis. '
                            'Las rutas ../ verifican también las páginas HTML de este paquete.</p>'
                            '</main></body></html>\n').encode("utf-8")
    files[HASH_PATH] = "".join(
        f"{hashlib.sha256(data).hexdigest()}  {posixpath.relpath(name, 'packet-analysis')}\n"
        for name, data in sorted(files.items())
    ).encode("utf-8")
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_STORED) as archive:
        for name, data in sorted(files.items()):
            entry = zipfile.ZipInfo(name, date_time=(2026, 11, 2, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_STORED
            entry.create_system = 3
            entry.external_attr = 0o100644 << 16
            archive.writestr(entry, data)
    return output.getvalue()


def verify(data):
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        names = archive.namelist()
        assert len(names) == len(set(names)) == 16, "Unexpected inventory or duplicate entry"
        assert all(not n.endswith("/correccion.txt") for n in names), "Correction leaked"
        assert all(not PurePosixPath(n).is_absolute() and ".." not in PurePosixPath(n).parts for n in names)
        assert all(i.compress_type == zipfile.ZIP_STORED for i in archive.infolist())
        assert archive.testzip() is None
        checked = set()
        for line in archive.read(HASH_PATH).decode("utf-8").splitlines():
            digest, relative = line.split("  ", 1)
            name = posixpath.normpath(posixpath.join("packet-analysis", relative))
            assert name in names and name != HASH_PATH and name not in checked
            assert hashlib.sha256(archive.read(name)).hexdigest() == digest, name
            checked.add(name)
        assert checked == set(names) - {HASH_PATH}, "Hash manifest must cover exactly included files"
        for case in ("guiado", "transferencia"):
            for filename in ("caso.pcap", "endpoint.csv", "servidor.csv", "cambios.csv", "consigna.txt"):
                name = f"packet-analysis/{case}/{filename}"
                assert archive.read(name) == (MATERIALS / name).read_bytes(), name
        assert archive.read("packet-analysis.html") == (MATERIALS / "packet-analysis.html").read_bytes()
        assert b"correccion.txt" not in archive.read("packet-analysis.html")
    return len(names)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    first = build()
    assert first == build(), "Bundle build is not deterministic"
    count = verify(first)
    if args.check:
        assert DESTINATION.read_bytes() == first, "Committed bundle differs; regenerate it"
    else:
        DESTINATION.write_bytes(first)
    print(f"Packet ZIP {'verified' if args.check else 'built'}: {count} files; "
          f"{len(first)} bytes; SHA-256 {hashlib.sha256(first).hexdigest()}")


if __name__ == "__main__":
    main()
