"""Build original synthetic PCAP fixtures using only Python's standard library.

No capture, sockets, host inspection, or third-party runtime dependency.
--output writes only generated PCAP/CSV fixtures to an alternative directory.
Without it, also refresh the original full-folder SHA256SUMS, including
corrections but excluding outer HTML. build-packet-bundle.py separately builds
the one-click offline ZIP without corrections, with its own subset manifest
covering the included outer HTML pages. Do not interchange these manifests.
"""
import argparse
import csv
from datetime import datetime, timezone
import hashlib
import io
from pathlib import Path
import socket
import struct

ROOT = Path(__file__).resolve().parents[1]


def checksum(data):
    if len(data) % 2:
        data += b'\0'
    total = sum(struct.unpack('!' + 'H' * (len(data) // 2), data))
    while total > 0xffff:
        total = (total & 0xffff) + (total >> 16)
    return 0xffff ^ total


def packet(src, dst, protocol, transport, ident):
    source, target = socket.inet_aton(src), socket.inet_aton(dst)
    pseudo = source + target + struct.pack('!BBH', 0, protocol, len(transport))
    offset = 6 if protocol == 17 else 16
    value = checksum(pseudo + transport) or 0xffff
    transport = transport[:offset] + struct.pack('!H', value) + transport[offset + 2:]
    header = struct.pack('!BBHHHBBH4s4s', 0x45, 0, 20 + len(transport), ident, 0x4000, 64, protocol, 0, source, target)
    header = header[:10] + struct.pack('!H', checksum(header)) + header[12:]
    # Locally administered MAC addresses; no FCS. Ethernet minimum frame padded.
    frame = b'\x02\x00' + target + b'\x02\x00' + source + b'\x08\x00' + header + transport
    return frame.ljust(60, b'\0')


def dns(name, ident, answer=None, nxdomain=False):
    query = b''.join(bytes([len(part)]) + part.encode('ascii') for part in name.split('.')) + b'\0\0\x01\0\x01'
    flags = 0x8183 if nxdomain else (0x8180 if answer else 0x0100)
    data = struct.pack('!HHHHHH', ident, flags, 1, int(bool(answer)), 0, 0) + query
    if answer:
        data += b'\xc0\x0c' + struct.pack('!HHIH', 1, 1, 300, 4) + socket.inet_aton(answer)
    return data


def udp(source, target, payload):
    return struct.pack('!HHHH', source, target, 8 + len(payload), 0) + payload


def tcp(source, target, seq, ack, flags, payload=b''):
    return struct.pack('!HHIIBBHHH', source, target, seq, ack, 0x50, flags, 32768, 0, 0) + payload


def csv_bytes(columns, rows):
    output = io.StringIO(newline='')
    writer = csv.writer(output, lineterminator='\n')
    writer.writerow(columns)
    writer.writerows(rows)
    return output.getvalue().encode('utf-8')


def build_case(name):
    transfer = name == 'transferencia'
    epoch = 1791115200 if transfer else 1791028800
    client = '192.0.2.22' if transfer else '192.0.2.11'
    resolver, server = '192.0.2.53', '198.51.100.80'
    host = 'recepcion.campus.test' if transfer else 'estado.campus.test'
    port = 49162 if transfer else 49161
    frames = []

    def add(src, dst, protocol, transport, micros):
        frames.append((micros, packet(src, dst, protocol, transport, len(frames) + 1)))

    if transfer:
        add(client, resolver, 17, udp(53002, 53, dns('estado-viejo.campus.test', 0x2201)), 0)
        add(resolver, client, 17, udp(53, 53002, dns('estado-viejo.campus.test', 0x2201, nxdomain=True)), 20000)
    dns_start = 200000 if transfer else 0
    add(client, resolver, 17, udp(53001, 53, dns(host, 0x2202)), dns_start)
    add(resolver, client, 17, udp(53, 53001, dns(host, 0x2202, server)), dns_start + 20000)
    start = 400000 if transfer else 200000
    a, b = (4000, 9000) if transfer else (1000, 5000)
    request_body = b'equipo=WS-DEMO-02&estado=prueba\n' if transfer else b''
    request_line = 'POST /collect' if transfer else 'GET /status.txt'
    request = (f'{request_line} HTTP/1.1\r\nHost: {host}\r\nUser-Agent: campus-demo/1.0\r\nContent-Type: text/plain\r\nContent-Length: {len(request_body)}\r\nConnection: close\r\n\r\n').encode('ascii') + request_body
    response_body = b'solicitud rechazada\n' if transfer else b'campus-demo: servicio disponible\n'
    status = '403 Forbidden' if transfer else '200 OK'
    http_date = datetime.fromtimestamp(epoch, timezone.utc).strftime('%a, %d %b %Y %H:%M:%S GMT')
    response = (f'HTTP/1.1 {status}\r\nDate: {http_date}\r\nServer: campus-demo\r\nContent-Type: text/plain\r\nContent-Length: {len(response_body)}\r\nConnection: close\r\n\r\n').encode('ascii') + response_body
    sequence = [
        (False, a, 0, 2, b''), (True, b, a + 1, 18, b''), (False, a + 1, b + 1, 16, b''),
        (False, a + 1, b + 1, 24, request), (True, b + 1, a + 1 + len(request), 16, b''),
        (True, b + 1, a + 1 + len(request), 24, response),
        (False, a + 1 + len(request), b + 1 + len(response), 16, b''),
        (True, b + 1 + len(response), a + 1 + len(request), 17, b''),
        (False, a + 1 + len(request), b + 2 + len(response), 16, b''),
        (False, a + 1 + len(request), b + 2 + len(response), 17, b''),
        (True, b + 2 + len(response), a + 2 + len(request), 16, b''),
    ]
    for index, (reverse, seq, ack, flags, payload) in enumerate(sequence):
        add(server if reverse else client, client if reverse else server, 6,
            tcp(80 if reverse else port, port if reverse else 80, seq, ack, flags, payload), start + index * 50000)
    result = bytearray(struct.pack('<IHHIIII', 0xa1b2c3d4, 2, 4, 0, 0, 65535, 1))
    for micros, frame in frames:
        result.extend(struct.pack('<IIII', epoch, micros, len(frame), len(frame)))
        result.extend(frame)

    def stamp(micros):
        return datetime.fromtimestamp(epoch, timezone.utc).strftime('%Y-%m-%dT%H:%M:%S') + f'.{micros:06d}Z'

    pid, machine = ('202', 'WS-DEMO-02') if transfer else ('101', 'WS-DEMO-01')
    process = 'utilidad-manual-demo' if transfer else 'monitor-servicio-demo'
    endpoint = csv_bytes(['timestamp_utc', 'host', 'event_id', 'pid', 'process', 'action', 'detail', 'provenance'], [
        (stamp(0), machine, 'EP-01', pid, process, 'start', 'usuario ficticio: alumno-demo', 'SINTETICO'),
        (stamp(start), machine, 'EP-02', pid, process, 'connect', f'{client}:{port}->{server}:80', 'SINTETICO'),
        (stamp(start + 150000), machine, 'EP-03', pid, process, 'http_request', request_line + ' ' + host, 'SINTETICO'),
        (stamp(start + 500000), machine, 'EP-04', pid, process, 'exit', 'codigo=0; no equivale a HTTP 200', 'SINTETICO'),
    ])
    server_log = csv_bytes(['timestamp_utc', 'event_id', 'source_ip', 'source_port', 'host', 'method', 'path', 'status', 'request_body_bytes', 'response_body_bytes', 'decision', 'provenance'], [
        (stamp(start + 250000), 'WEB-01', client, port, host, 'POST' if transfer else 'GET', '/collect' if transfer else '/status.txt', 403 if transfer else 200, len(request_body), len(response_body), 'politica-rechaza-metodo' if transfer else 'ruta-permitida', 'SINTETICO'),
    ])
    date = '2026-10-04' if transfer else '2026-10-03'
    changes = csv_bytes(['ticket', 'start_utc', 'end_utc', 'host', 'process', 'method', 'destination', 'path', 'approval', 'provenance'], [
        ('CHG-DEMO-01', date + 'T11:55:00Z', date + 'T12:05:00Z', machine, 'monitor-servicio-demo', 'GET', 'estado.campus.test:80', '/status.txt', 'aprobado-solo-este-alcance', 'SINTETICO'),
    ])
    return {'caso.pcap': bytes(result), 'endpoint.csv': endpoint, 'servidor.csv': server_log, 'cambios.csv': changes}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    target = args.output or ROOT / 'assets/materials/packet-analysis'
    for name in ('guiado', 'transferencia'):
        directory = target / name
        directory.mkdir(parents=True, exist_ok=True)
        for filename, data in build_case(name).items():
            (directory / filename).write_bytes(data)
    if not args.output:
        entries = []
        for file in sorted(target.rglob('*')):
            if file.is_file() and file.name != 'SHA256SUMS.txt':
                entries.append(hashlib.sha256(file.read_bytes()).hexdigest() + '  ' + file.relative_to(target).as_posix())
        (target / 'SHA256SUMS.txt').write_text('\n'.join(entries) + '\n', encoding='utf-8', newline='\n')
    print('Generated original synthetic PCAP/CSV fixtures:', target)


if __name__ == '__main__':
    main()
