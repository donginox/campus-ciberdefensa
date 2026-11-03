"""Independent, read-only evidence QA; does not import the filesystem builder."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import struct
import subprocess
import sys
import xml.etree.ElementTree as ET
import zipfile

BASE = Path(__file__).resolve().parents[1]
MARKER = b'CAMPUS_TEST_MEMORY_CASE_2026'


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def verify_disk(root, use_sleuthkit=False):
    manifest = json.loads((root / 'manifest.json').read_text(encoding='utf-8-sig'))
    require(manifest['version'] == 1 and manifest['caseId'] == 'alameda', 'Manifest incompatible')
    for entry in manifest['files']:
        name = entry['file']
        require(Path(name).name == name and '/' not in name and '\\' not in name, 'Unsafe evidence name')
        data = (root / name).read_bytes()
        require(len(data) == entry['bytes'] and digest(data) == entry['sha256'], 'SHA256 mismatch: ' + name)
    image = root / 'alameda-fat16.img'
    data = image.read_bytes()
    require(data[510:512] == b'\x55\xaa', 'Boot-sector signature missing')
    sector = struct.unpack_from('<H', data, 11)[0]
    cluster_sectors = data[13]
    reserved = struct.unpack_from('<H', data, 14)[0]
    fats = data[16]
    entries = struct.unpack_from('<H', data, 17)[0]
    total = struct.unpack_from('<H', data, 19)[0] or struct.unpack_from('<I', data, 32)[0]
    fat_sectors = struct.unpack_from('<H', data, 22)[0]
    require(sector == 512 and cluster_sectors in (1, 2, 4, 8, 16) and fats == 2, 'Unexpected FAT geometry')
    root_sectors = (entries * 32 + sector - 1) // sector
    clusters = (total - reserved - fats * fat_sectors - root_sectors) // cluster_sectors
    require(4085 <= clusters < 65525 and total * sector == len(data), 'Image is not FAT16')
    fat_a = data[reserved * sector:(reserved + fat_sectors) * sector]
    fat_b = data[(reserved + fat_sectors) * sector:(reserved + 2 * fat_sectors) * sector]
    require(fat_a == fat_b and len(fat_a) >= (clusters + 2) * 2, 'FAT copies disagree')
    root_offset = (reserved + fats * fat_sectors) * sector
    data_offset = root_offset + root_sectors * sector
    deleted = []
    for i in range(entries):
        row = data[root_offset + i * 32:root_offset + (i + 1) * 32]
        if row[0] == 0:
            break
        if row[0] != 0xe5 or row[11] & 0x18 or row[11] == 0x0f:
            continue
        first = struct.unpack_from('<H', row, 26)[0]
        size = struct.unpack_from('<I', row, 28)[0]
        require(2 <= first < clusters + 2 and 0 < size <= sector * cluster_sectors, 'Deleted extent invalid')
        require(struct.unpack_from('<H', fat_a, first * 2)[0] == 0, 'Deleted cluster is not free')
        offset = data_offset + (first - 2) * sector * cluster_sectors
        recovered = data[offset:offset + size]
        require(len(recovered) == size and b'ACTA-2026-A' in recovered, 'Deleted evidence is incomplete')
        deleted.append(recovered)
    require(len(deleted) == 1, 'Expected one recoverable deleted entry')
    recovered = deleted[0]
    if use_sleuthkit:
        require(shutil.which('fls') and shutil.which('icat'), 'Install Sleuth Kit in isolated QA runner')
        listing = subprocess.run(['fls', '-f', 'fat', '-d', str(image)], check=True, capture_output=True, text=True, timeout=10).stdout
        found = re.findall(r'\*\s+(\d+(?:-\d+-\d+)?):', listing)
        require(len(found) == 1, 'Sleuth Kit did not recognize one deleted file')
        external = subprocess.run(['icat', '-f', 'fat', '-r', str(image), found[0]], check=True, capture_output=True, timeout=10).stdout
        require(external == recovered, 'Independent icat recovery disagrees')
    return {'filesystem': 'FAT16', 'deletedRecoveredBytes': len(recovered), 'deletedRecoverySha256': digest(recovered), 'sleuthkitVerified': use_sleuthkit}


def captured_marker(dump):
    require(dump[:4] == b'MDMP' and len(dump) <= 32 * 1024 * 1024, 'Invalid MDMP')
    count, directory = struct.unpack_from('<II', dump, 8)
    require(count <= 100 and directory + count * 12 <= len(dump), 'Invalid MDMP directory')
    ranges = []
    for i in range(count):
        kind, size, offset = struct.unpack_from('<III', dump, directory + i * 12)
        require(offset + size <= len(dump), 'MDMP stream outside file')
        if kind == 5:  # MINIDUMP_MEMORY_LIST: address + location descriptor
            number = struct.unpack_from('<I', dump, offset)[0]
            require(number <= 10000 and 4 + number * 16 <= size, 'Invalid memory list')
            for n in range(number):
                address, length, rva = struct.unpack_from('<QII', dump, offset + 4 + n * 16)
                require(rva + length <= len(dump), 'Captured memory outside file')
                ranges.append(dump[rva:rva + length])
        elif kind == 9:  # MINIDUMP_MEMORY64_LIST
            number, rva = struct.unpack_from('<QQ', dump, offset)
            require(number <= 10000 and 16 + number * 16 <= size, 'Invalid memory64 list')
            for n in range(number):
                address, length = struct.unpack_from('<QQ', dump, offset + 16 + n * 16)
                require(rva + length <= len(dump), 'Captured memory64 outside file')
                ranges.append(dump[rva:rva + length])
                rva += length
    require(any(MARKER in region for region in ranges), 'Marker is not inside a captured memory extent')
    return True


def verify_native(root, required=False):
    manifest_file = root / 'bundle-manifest.json'
    if not manifest_file.exists():
        require(not required, 'Native evidence is required for distribution')
        return {'nativeAvailable': False}
    manifest = json.loads(manifest_file.read_text(encoding='utf-8-sig'))
    require(manifest['file'] == 'forensic-native.zip' and manifest['environment'] == 'ephemeral-windows-ci', 'Unexpected native bundle')
    bundle = root / manifest['file']
    raw = bundle.read_bytes()
    require(len(raw) == manifest['bytes'] and digest(raw) == manifest['sha256'], 'Native bundle SHA256 mismatch')
    allowed = {'manifest.json', 'campus-owned-process.dmp', 'campus-training.evtx', 'campus-training.xml', 'LEER-PRIMERO.txt'}
    with zipfile.ZipFile(bundle) as archive:
        require(set(archive.namelist()) == allowed and len(archive.infolist()) == len(allowed), 'Unexpected native ZIP entries')
        require(sum(i.file_size for i in archive.infolist()) <= 40 * 1024 * 1024, 'Native evidence exceeds budget')
        inside = json.loads(archive.read('manifest.json').decode('utf-8-sig'))
        for entry in inside['files']:
            require(entry['name'] in allowed, 'Unexpected native evidence name')
            content = archive.read(entry['name'])
            require(len(content) == entry['bytes'] and digest(content) == entry['sha256'], 'Native evidence SHA256 mismatch')
        marker = captured_marker(archive.read('campus-owned-process.dmp'))
        require(archive.read('campus-training.evtx')[:8] == b'ElfFile\0', 'Invalid EVTX signature')
        xml = archive.read('campus-training.xml')
        require(b'<!DOCTYPE' not in xml.upper() and b'<!ENTITY' not in xml.upper(), 'XML entities forbidden')
        events = ET.fromstring(xml)
        ns = {'e': 'http://schemas.microsoft.com/win/2004/08/events/event'}
        rows = list(events)
        require(len(rows) == 5, 'Unexpected Windows event count')
        for row in rows:
            require(row.find('e:System/e:Provider', ns).attrib['Name'] == 'CampusCiberdefensaTraining', 'Foreign Windows provider')
            message = row.find('e:EventData/e:Data', ns)
            payload = json.loads(message.text)
            require(payload.get('case_id') == 'alameda' and payload.get('training') is True, 'Unscoped training message')
        return {'nativeAvailable': True, 'nativeEventCount': len(rows), 'markerInsideCapturedMemory': marker, 'nativeBundleSha256': digest(raw)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, default=BASE / 'assets/materials/forensic-alameda')
    parser.add_argument('--native-dir', type=Path, default=BASE / '.local/forensic-native')
    parser.add_argument('--require-native', action='store_true')
    parser.add_argument('--sleuthkit', action='store_true')
    args = parser.parse_args()
    result = verify_disk(args.root, args.sleuthkit)
    result.update(verify_native(args.native_dir, args.require_native))
    print(json.dumps(result))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('Forensic verification failed: ' + str(error), file=sys.stderr)
        sys.exit(1)
