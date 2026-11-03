"""Build only owned fictitious ALAMEDA evidence; Python stdlib, deterministic bytes.

The superfloppy is a real FAT16 filesystem, no partition offset. The deleted
entry's cluster is free in both FATs and still contains the original bytes.
No host disks, memory, event logs or network are read.
"""
import hashlib
import json
from pathlib import Path
import struct
import zipfile

ROOT = Path(__file__).resolve().parents[1] / 'assets' / 'materials'
OUT = ROOT / 'forensic-alameda'


def build():
    OUT.mkdir(parents=True, exist_ok=True)
    disk = bytearray(4 * 1024 * 1024)
    disk[:11] = b'\xeb\x3c\x90CAMPUS  '
    struct.pack_into('<HBHBHHBHHHII', disk, 11, 512, 1, 1, 2, 128, 8192, 0xf8, 32, 32, 64, 0, 0)
    disk[36:39] = b'\x80\x00\x29'
    struct.pack_into('<I', disk, 39, 0x414c414d)
    disk[43:54] = b'ALAMEDA    '
    disk[54:62] = b'FAT16   '
    disk[510:512] = b'\x55\xaa'
    fat = bytearray(32 * 512)
    struct.pack_into('<HH', fat, 0, 0xfff8, 0xffff)
    root = (1 + 64) * 512
    data = root + 128 * 32
    files = [
        (b'LEEME   TXT', b'Caso ALAMEDA, laboratorio ficticio propio de Campus. FAT16 sin particiones.\r\nNo contiene datos reales ni malware. Hora del caso: UTC.\r\n', 2, False),
        (b'CASE    LOG', b'2026-06-01T10:00:00Z recepcion ALAMEDA\r\n2026-06-01T10:00:04Z usuario lara en salto\r\n2026-06-01T10:00:05Z servicio archivo /archivo/acta.txt\r\n', 3, False),
        (b'RED     CSV', b'time,source,destination,service,bytes\r\n2026-06-01T10:00:05Z,10.78.10.10,10.78.20.20,HTTP,184\r\n', 4, False),
        (b'ALAMEDA TXT', b'ALAMEDA - nota ficticia borrada del laboratorio\r\nReferencia: ACTA-2026-A. La copia se preparo para el ejercicio, no demuestra exfiltracion real.\r\n', 8, True),
    ]
    for i, (name, content, cluster, deleted) in enumerate(files):
        entry = bytearray(32)
        entry[:11] = name
        entry[11] = 0x20
        # Fixed FAT timestamp: 2026-06-01 10:00:00; provenance explicitly UTC.
        struct.pack_into('<HHHI', entry, 22, (10 << 11), ((2026-1980) << 9) | (6 << 5) | 1, cluster, len(content))
        if deleted:
            entry[0] = 0xe5
        else:
            struct.pack_into('<H', fat, cluster * 2, 0xffff)
        disk[root + i * 32:root + (i + 1) * 32] = entry
        disk[data + (cluster - 2) * 512:data + (cluster - 2) * 512 + len(content)] = content
    disk[512:512 + len(fat)] = fat
    disk[512 + len(fat):512 + 2 * len(fat)] = fat
    (OUT / 'alameda-fat16.img').write_bytes(disk)
    for dataset, actor, ip in [('alameda', 'lara', '10.78.10.10'), ('transfer', 'nora', '10.78.10.31')]:
        kinds = ['network.connect', 'auth.failure', 'auth.failure', 'auth.failure', 'auth.success', 'service.access', 'file.read', 'auth.failure', 'auth.success']
        events = []
        for i, kind in enumerate(kinds):
            events.append(dict(id=f'{dataset}-{i+1:03}', time=f'2026-06-01T10:00:{i:02}.000Z', kind=kind, actor=actor if i < 7 else 'operador', sourceIp=ip if i < 7 else '10.78.10.50', host='servidor' if i in [5, 6] else 'salto', detail=f'Caso ficticio {dataset}: ' + ('GET /archivo/acta.txt; HTTP 200; 184 bytes' if i == 5 else 'Actividad generada propia de laboratorio')))
        (OUT / f'{dataset}.jsonl').write_text(''.join(json.dumps(e, ensure_ascii=False, separators=(',', ':')) + '\n' for e in events), encoding='utf8', newline='\n')
    (OUT / 'network.csv').write_text('time,source,destination,service,bytes\n2026-06-01T10:00:05Z,10.78.10.10,10.78.20.20,HTTP,184\n', encoding='utf8', newline='\n')
    (OUT / 'LEEME.txt').write_text('ALAMEDA v1. Evidencia ficticia, benigna y propia.\nImagen raw FAT16 real de 4 MiB (superfloppy, offset 0); contiene archivo borrado recuperable.\nJSONL y CSV sinteticos propios: no son EVTX ni capturas PCAP. Los nombres/IP no identifican personas reales.\nVerifica SHA256SUMS.txt antes y despues de copiar; trabaja sobre copias, no montes con escritura.\nEl paquete nativo separado contiene un minidump real de proceso propio y EVTX Application propio, generado en CI Windows efimero. Puede no estar disponible en esta distribucion.\nNo se adquiere memoria ni eventos de tu equipo. Consulta la guia externa y registra herramientas/version/UTC/hashes.\n', encoding='utf8', newline='\n')
    manifest = dict(version=1, caseId='alameda', provenance='owned-fictional-deterministic-builder', files=[])
    for name in ['alameda-fat16.img', 'alameda.jsonl', 'transfer.jsonl', 'network.csv', 'LEEME.txt']:
        content = (OUT / name).read_bytes()
        manifest['files'].append(dict(file=name, bytes=len(content), sha256=hashlib.sha256(content).hexdigest()))
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf8', newline='\n')
    (OUT / 'SHA256SUMS.txt').write_text(''.join(f"{f['sha256']}  {f['file']}\n" for f in manifest['files']), encoding='ascii', newline='\n')
    with zipfile.ZipFile(ROOT / 'forensic-alameda.zip', 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as bundle:
        for p in sorted(OUT.iterdir(), key=lambda p: p.name.casefold()):
            if p.is_file():
                info = zipfile.ZipInfo('forensic-alameda/' + p.name, (2026, 6, 1, 10, 0, 0))
                info.create_system = 3
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = 0o100644 << 16
                bundle.writestr(info, p.read_bytes())
    print('Built owned ALAMEDA FAT16 and deterministic ZIP')


if __name__ == '__main__':
    build()
