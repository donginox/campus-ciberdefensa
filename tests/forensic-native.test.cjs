'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.join(__dirname,'..');
const nativeDir=process.env.CAMPUS_FORENSIC_NATIVE_DIR||path.join(root,'.local/forensic-native');
const bundle=path.join(nativeDir,'forensic-native.zip');

// Reads the already-produced owned fixture only. It never calls capture APIs,
// imports providers, reads host logs, or requires WinDbg/Volatility installation.
test('native fixture has a bounded genuine minidump, EVTX and five provider-only XML records',{
 skip:!fs.existsSync(bundle)?'Generate/download the owned Windows CI fixture first.':false
},()=>{
 const run=spawnSync('python',['-c',String.raw`
import hashlib,json,struct,sys,zipfile,xml.etree.ElementTree as ET
from pathlib import Path
bundle=Path(sys.argv[1])
outer=json.loads((bundle.parent/'bundle-manifest.json').read_text(encoding='utf-8-sig'))
assert outer['version']==1 and outer['file']=='forensic-native.zip'
assert outer['caseId']=='alameda' and outer['environment']=='ephemeral-windows-ci'
assert bundle.stat().st_size==outer['bytes']<=64*1024*1024
assert hashlib.sha256(bundle.read_bytes()).hexdigest()==outer['sha256']
with zipfile.ZipFile(bundle) as z:
    names=['campus-owned-process.dmp','campus-training.evtx','campus-training.xml','LEER-PRIMERO.txt','manifest.json']
    assert sorted(z.namelist())==sorted(names)
    assert sum(f.file_size for f in z.infolist())<=40*1024*1024
    assert all(0<f.file_size<=32*1024*1024 for f in z.infolist())
    m=json.loads(z.read('manifest.json').decode('utf-8-sig'))
    assert m['version']==1 and m['scope']=='owned-process-and-provider-only'
    assert m['environment']=='ephemeral-windows-ci' and m['caseId']=='alameda'
    assert sorted(f['name'] for f in m['files'])==sorted(names[:-1])
    for f in m['files']:
        b=z.read(f['name'])
        assert len(b)==f['bytes']
        assert hashlib.sha256(b).hexdigest()==f['sha256']
    d=z.read('campus-owned-process.dmp')
    assert d[:4]==b'MDMP' and struct.unpack_from('<I',d,4)[0]&0xffff==0xa793
    flags=struct.unpack_from('<Q',d,24)[0]
    assert flags&0x200 and not flags&2, 'Private RW process dump, not full memory'
    streams,offset=struct.unpack_from('<II',d,8)
    assert 1<=streams<=64 and offset+streams*12<=len(d)
    memory=[]
    for i in range(streams):
        kind,size,rva=struct.unpack_from('<III',d,offset+i*12)
        assert rva+size<=len(d)
        if kind==5:
            count=struct.unpack_from('<I',d,rva)[0]
            assert count>0 and 4+16*count<=size
            for j in range(count):
                address,length,start=struct.unpack_from('<QII',d,rva+4+j*16)
                assert start+length<=len(d)
                memory.append(d[start:start+length])
    assert memory and any(b'CAMPUS_TEST_MEMORY_CASE_2026' in r for r in memory)
    evtx=z.read('campus-training.evtx')
    assert evtx[:8]==b'ElfFile\0' and evtx[4096:4104]==b'ElfChnk\0'
    assert 4096<len(evtx)<=4*1024*1024
    xml=ET.fromstring(z.read('campus-training.xml'))
    ns={'e':'http://schemas.microsoft.com/win/2004/08/events/event'}
    events=xml.findall('e:Event',ns)
    assert len(events)==5
    ids=[]
    for event in events:
        assert event.find('e:System/e:Provider',ns).attrib['Name']=='CampusCiberdefensaTraining'
        assert event.find('e:System/e:Channel',ns).text=='Application'
        assert event.find('e:System/e:TimeCreated',ns).attrib['SystemTime'].endswith('Z')
        assert 'alumno-ficticio' in event.find('e:EventData/e:Data',ns).text
        ids.append(int(event.find('e:System/e:EventID',ns).text))
    assert ids==[411,411,411,412,413]
    print(json.dumps({'dumpBytes':len(d),'evtxBytes':len(evtx),'events':len(events),'memoryRegions':len(memory)}))
`,bundle],{cwd:root,encoding:'utf8',maxBuffer:1024*1024,timeout:30000});
 assert.equal(run.status,0,run.stderr||run.error?.message);
 const result=JSON.parse(run.stdout);
 assert.equal(result.events,5);
 assert.ok(result.memoryRegions>0);
});
