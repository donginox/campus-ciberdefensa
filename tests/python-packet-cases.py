"""Dependency-free fixture QA; optional --dpkt also exercises the independent reader."""
import hashlib
import ipaddress
import json
from pathlib import Path
import struct
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'assets/materials/packet-analysis'
EXTERNAL = '--dpkt' in sys.argv
if EXTERNAL:
    sys.argv.remove('--dpkt')


def checksum(data):
    data += b'\0' * (len(data) % 2)
    total = sum(struct.unpack('!' + 'H' * (len(data) // 2), data))
    while total >> 16:
        total = (total & 65535) + (total >> 16)
    return (~total) & 65535


def packets(path):
    raw = path.read_bytes()
    assert len(raw) >= 24, 'missing pcap header'
    assert struct.unpack('<IHHIIII', raw[:24]) == (0xa1b2c3d4, 2, 4, 0, 0, 65535, 1)
    offset, previous, result = 24, 0, []
    while offset < len(raw):
        sec, usec, captured, original = struct.unpack_from('<IIII', raw, offset)
        offset += 16
        frame = raw[offset:offset + captured]
        offset += captured
        assert len(frame) == captured == original and 60 <= captured <= 65535
        stamp = sec * 1000000 + usec
        assert 0 <= usec < 1000000 and stamp > previous
        previous = stamp
        assert frame[12:14] == b'\x08\x00'
        ip = frame[14:]
        # Each synthetic IPv4 endpoint has a stable locally administered MAC.
        assert frame[6:12] == b'\x02\x00' + ip[12:16], 'source Ethernet identity'
        assert frame[:6] == b'\x02\x00' + ip[16:20], 'destination Ethernet identity'
        assert ip[0] == 0x45 and checksum(ip[:20]) == 0
        length = int.from_bytes(ip[2:4], 'big')
        assert 20 <= length <= len(ip) and ip[6:8] == b'@\0'
        for address in (ip[12:16], ip[16:20]):
            assert any(ipaddress.ip_address(address) in ipaddress.ip_network(net)
                       for net in ('192.0.2.0/24', '198.51.100.0/24', '203.0.113.0/24'))
        transport = ip[20:length]
        pseudo = ip[12:20] + struct.pack('!BBH', 0, ip[9], len(transport))
        assert checksum(pseudo + transport) == 0, 'transport checksum'
        assert ip[9] in (6, 17)
        if ip[9] == 17:
            assert int.from_bytes(transport[4:6], 'big') == len(transport)
            assert transport[6:8] != b'\0\0', 'UDP checksum omitted'
        result.append((stamp, ip[12:16], ip[16:20], ip[9], transport))
    assert offset == len(raw), 'trailing or truncated record'
    return result


class PacketCases(unittest.TestCase):
    def test_pack_exists_and_generator_reproduces_committed_bytes(self):
        builder = ROOT / 'scripts/build-packet-cases.py'
        self.assertTrue(builder.is_file(), 'deterministic packet generator is missing')
        with tempfile.TemporaryDirectory() as folder:
            subprocess.run([sys.executable, str(builder), '--output', folder], check=True)
            for path in Path(folder).rglob('*'):
                if path.is_file():
                    self.assertEqual(path.read_bytes(), (PACK / path.relative_to(folder)).read_bytes())

    def test_dns_tcp_http_checksums_sequences_and_distinct_ground_truth(self):
        for name, count, first, method, status, body in (
            ('guiado', 13, 1791028800000000, b'GET /status.txt HTTP/1.1', b'200', b'campus-demo: servicio disponible\n'),
            ('transferencia', 15, 1791115200000000, b'POST /collect HTTP/1.1', b'403', b'solicitud rechazada\n'),
        ):
            with self.subTest(case=name):
                rows = packets(PACK / name / 'caso.pcap')
                self.assertEqual((len(rows), rows[0][0]), (count, first))
                dns = [r[4][8:] for r in rows if r[3] == 17]
                self.assertEqual(len(dns), count - 11)
                for query, response in zip(dns[::2], dns[1::2]):
                    self.assertEqual(query[:2], response[:2])
                    self.assertEqual(query[2:4], b'\x01\x00')
                    self.assertTrue(response[2] & 0x80)
                    self.assertEqual(query[12:], response[12:12 + len(query[12:])])
                    self.assertIn(b'\x04test\x00', query)
                if name == 'transferencia':
                    self.assertEqual(dns[1][3] & 15, 3)  # NXDOMAIN distractor
                tcp = [r for r in rows if r[3] == 6]
                expected_next = {}
                payloads = []
                for index, (_, src, dst, _, segment) in enumerate(tcp):
                    sport, dport, seq, ack = struct.unpack('!HHII', segment[:12])
                    self.assertEqual(segment[12] >> 4, 5)
                    flags, payload = segment[13], segment[20:]
                    key, reverse = (src, sport, dst, dport), (dst, dport, src, sport)
                    if key in expected_next:
                        self.assertEqual(seq, expected_next[key], 'sequence gap/overlap')
                    if flags & 16:
                        self.assertEqual(ack, expected_next[reverse], 'incorrect acknowledgment')
                    expected_next[key] = seq + len(payload) + bool(flags & 2) + bool(flags & 1)
                    if payload:
                        payloads.append(payload)
                self.assertEqual([r[4][13] for r in tcp[:3]], [2, 18, 16])
                self.assertEqual([r[4][13] for r in tcp[-4:]], [17, 16, 17, 16])
                request, response = payloads
                self.assertEqual(request.split(b'\r\n', 1)[0], method)
                self.assertEqual(response.split(b' ')[1], status)
                self.assertEqual(response.split(b'\r\n\r\n', 1)[1], body)
                for message in payloads:
                    header, content = message.split(b'\r\n\r\n', 1)
                    length = [line for line in header.split(b'\r\n') if line.lower().startswith(b'content-length:')]
                    self.assertEqual(int(length[0].split(b':')[1]), len(content))

    def test_hash_inventory_and_export_allowlist_cover_every_artifact(self):
        entries = (PACK / 'SHA256SUMS.txt').read_text(encoding='utf-8').splitlines()
        actual = set()
        for entry in entries:
            digest, name = entry.split('  ', 1)
            self.assertNotIn(name, actual)
            actual.add(name)
            self.assertEqual(hashlib.sha256((PACK / name).read_bytes()).hexdigest(), digest)
        files = {p.relative_to(PACK).as_posix() for p in PACK.rglob('*') if p.is_file()}
        self.assertEqual(actual, files - {'SHA256SUMS.txt'})
        allowed = json.loads((ROOT / 'src/content/materials-manifest.json').read_text(encoding='utf-8'))
        self.assertTrue({'packet-analysis/' + p for p in files}.issubset(set(allowed)))

    @unittest.skipUnless(EXTERNAL, 'optional independent parser: run with --dpkt in QA venv')
    def test_independent_dpkt_reader(self):
        import dpkt
        for name, count, request_method, status in [('guiado', 13, 'GET', '200'), ('transferencia', 15, 'POST', '403')]:
            with (PACK / name / 'caso.pcap').open('rb') as source:
                reader = dpkt.pcap.Reader(source)
                self.assertEqual(reader.datalink(), dpkt.pcap.DLT_EN10MB)
                parsed = list(reader)
            self.assertEqual(len(parsed), count)
            methods, statuses, dns_counts = [], [], []
            for _, frame in parsed:
                ip = dpkt.ethernet.Ethernet(frame).data
                self.assertIsInstance(ip, dpkt.ip.IP)
                if isinstance(ip.data, dpkt.udp.UDP):
                    dns = dpkt.dns.DNS(ip.data.data)
                    dns_counts.append((dns.qr, dns.rcode, len(dns.an)))
                elif ip.data.data:
                    data = ip.data.data
                    if data.startswith(b'HTTP/'):
                        statuses.append(dpkt.http.Response(data).status)
                    else:
                        methods.append(dpkt.http.Request(data).method)
            self.assertEqual(methods, [request_method])
            self.assertEqual(statuses, [status])
            self.assertEqual(dns_counts[-2:], [(0, 0, 0), (1, 0, 1)])
            if name == 'transferencia':
                self.assertEqual(dns_counts[:2], [(0, 0, 0), (1, 3, 0)])
            print(f'dpkt {dpkt.__version__}: {name}: {count} Ethernet/IPv4 records; DNS {dns_counts}; HTTP {methods}/{statuses}')


if __name__ == '__main__':
    unittest.main()
