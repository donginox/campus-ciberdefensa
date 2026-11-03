'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'assets/materials/forensic-alameda');
const memberNames=['alameda-fat16.img','alameda.jsonl','LEEME.txt','manifest.json','network.csv','SHA256SUMS.txt','transfer.jsonl'];
const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function runBuilder(script,cwd){const run=spawnSync('python',[script],{cwd,encoding:'utf8',windowsHide:true});assert.equal(run.status,0,run.stderr||run.error?.message);}
function zipDetails(file){const run=spawnSync('python',['-c',String.raw`
import hashlib,json,sys,zipfile
with zipfile.ZipFile(sys.argv[1]) as z:
 print(json.dumps([{'name':i.filename,'creator':i.create_system,'size':i.file_size,'crc':i.CRC,'sha256':hashlib.sha256(z.read(i)).hexdigest()} for i in z.infolist()]))
`,file],{encoding:'utf8',windowsHide:true});assert.equal(run.status,0,run.stderr||run.error?.message);return JSON.parse(run.stdout);}
function safeCleanup(dir,parent){
 const resolved=fs.realpathSync(dir),safeParent=fs.realpathSync(parent);
 assert.equal(path.dirname(resolved),safeParent);assert.match(path.basename(resolved),/^test-builder-/);assert.equal(fs.lstatSync(dir).isSymbolicLink(),false);
 function check(current){assert.equal(fs.lstatSync(current).isSymbolicLink(),false);assert.equal(fs.realpathSync(current),current);if(fs.lstatSync(current).isDirectory())for(const name of fs.readdirSync(current))check(path.join(current,name));}
 check(resolved);fs.rmSync(resolved,{recursive:true,force:true});
}
test('isolated builder preserves source fixtures and reproduces FAT16 and platform-independent ZIP bytes',t=>{
 const builder=path.join(root,'scripts/build-forensic-disk.py'),sourceZip=path.join(root,'assets/materials/forensic-alameda.zip'),sourceImage=path.join(folder,'alameda-fat16.img');
 const originalZip=fs.readFileSync(sourceZip),before=fs.readFileSync(sourceImage),zipMtime=fs.statSync(sourceZip).mtimeMs,imageMtime=fs.statSync(sourceImage).mtimeMs;
 const scratchParent=path.resolve(root,'../.campus-work');fs.mkdirSync(scratchParent,{recursive:true});assert.equal(fs.lstatSync(scratchParent).isSymbolicLink(),false);
 const scratch=fs.mkdtempSync(path.join(scratchParent,'test-builder-'));t.after(()=>safeCleanup(scratch,scratchParent));
 const scripts=path.join(scratch,'scripts');fs.mkdirSync(scripts);const copy=path.join(scripts,'build-forensic-disk.py');fs.copyFileSync(builder,copy);
 runBuilder(copy,scratch);
 const generatedFolder=path.join(scratch,'assets/materials/forensic-alameda'),generatedZip=path.join(scratch,'assets/materials/forensic-alameda.zip'),firstZip=fs.readFileSync(generatedZip);
 const generated=zipDetails(generatedZip),canonical=zipDetails(sourceZip);
 assert.deepEqual(generated.map(m=>m.name),memberNames.map(name=>'forensic-alameda/'+name));
 assert.ok(generated.every(m=>m.creator===3),'ZIP creator metadata must explicitly use UNIX on every platform');
 assert.deepEqual(generated,canonical,'ZIP members retain canonical CRC/content and fixed metadata');
 assert.deepEqual(firstZip,originalZip,'isolated ZIP matches canonical bytes');
 for(const name of memberNames)assert.deepEqual(fs.readFileSync(path.join(generatedFolder,name)),fs.readFileSync(path.join(folder,name)),name);
 runBuilder(copy,scratch);assert.deepEqual(fs.readFileSync(generatedZip),firstZip,'second isolated build is byte-identical');
 assert.deepEqual(fs.readFileSync(sourceZip),originalZip);assert.deepEqual(fs.readFileSync(sourceImage),before);
 assert.equal(fs.statSync(sourceZip).mtimeMs,zipMtime,'test never rewrites source ZIP');assert.equal(fs.statSync(sourceImage).mtimeMs,imageMtime,'test never rewrites source image');
 assert.ok(before.length<=8*1024*1024);assert.equal(before.readUInt16LE(11),512);assert.equal(before.toString('ascii',54,62),'FAT16   ');assert.equal(before.readUInt16LE(510),0xaa55);
 const reserved=before.readUInt16LE(14),fats=before[16],fatSectors=before.readUInt16LE(22),entries=before.readUInt16LE(17),rootOffset=(reserved+fats*fatSectors)*512,dataOffset=rootOffset+entries*32;
 let deleted;for(let p=rootOffset;p<rootOffset+entries*32;p+=32)if(before[p]===0xe5)deleted=before.subarray(p,p+32);assert.ok(deleted,'deleted directory entry exists');
 const cluster=deleted.readUInt16LE(26),size=deleted.readUInt32LE(28);assert.equal(before.readUInt16LE(reserved*512+cluster*2),0,'deleted cluster is unallocated');assert.match(before.toString('utf8',dataOffset+(cluster-2)*512,dataOffset+(cluster-2)*512+size),/ALAMEDA.*fictici/s);
 const manifest=JSON.parse(fs.readFileSync(path.join(folder,'manifest.json'),'utf8'));for(const item of manifest.files){const bytes=fs.readFileSync(path.join(folder,item.file));assert.equal(bytes.length,item.bytes);assert.equal(sha256(bytes),item.sha256);}
});
