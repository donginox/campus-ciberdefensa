'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs/promises');const path=require('node:path');const os=require('node:os');
let TopologyManager;try{({TopologyManager}=require('../desktop/topology-manager.cjs'));}catch{}
const P='1f06b3be-90a2-499a-ae13-8067880e50de';
async function setup(t,memory={totalMemoryMiB:32768,availableMemoryMiB:20000}){assert.equal(typeof TopologyManager,'function');const dir=await fs.mkdtemp(path.join(os.tmpdir(),'campus-topology-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));const calls=[];const runner=async(exe,args,o)=>{calls.push({args,home:o.env.VBOX_USER_HOME});if(args[0]==='--version')return{stdout:'7.2.22r175245'};if(args[0]==='list')return{stdout:'Processor supports HW virtualization: yes'};throw Error('No foreign VM reads');};const manager=new TopologyManager({dataDir:dir,runner,executable:path.join(dir,'VBoxManage.exe'),memoryInfo:()=>memory});return{manager,dir,calls};}
test('topology has a separate private home and leaves the legacy registry untouched',async t=>{const c=await setup(t);await fs.mkdir(path.join(c.dir,'vm-labs'));await fs.writeFile(path.join(c.dir,'vm-labs','registry.json'),'foreign legacy sentinel');const s=await c.manager.status(P);assert.deepEqual(s.nodes.map(n=>[n.nodeId,n.state,n.osInstalled,n.guestConfigured]),[['workstation','missing',false,false],['router','missing',false,false],['server','missing',false,false]]);assert.equal(s.guestReady,false);await c.manager.doctor();assert.equal(await fs.readFile(path.join(c.dir,'vm-labs','registry.json'),'utf8'),'foreign legacy sentinel');assert.ok(c.calls.every(call=>call.home===path.join(c.dir,'topology-v1','vm-labs','virtualbox-home')));await assert.rejects(()=>c.manager.start(P,'../../foreign'));await assert.rejects(()=>c.manager.status('bad'));});
test('topology start keeps 8GiB for host and refuses uncreated kits',async t=>{const c=await setup(t,{totalMemoryMiB:12000,availableMemoryMiB:12000});assert.equal((await c.manager.doctor()).ready,false);await assert.rejects(()=>c.manager.exportKit(P));const s=await c.manager.start(P,'workstation');assert.equal(s.nodes[0].state,'missing');assert.equal(c.calls.some(c=>c.args[0]==='startvm'),false);});
test('topology content has browser parity and practical evidence requirements',()=>{const vm=require('node:vm'),data=require('../src/content/topologies.json'),context={window:{}};vm.runInNewContext(require('node:fs').readFileSync(path.join(__dirname,'../src/content/topologies.js'),'utf8'),context);assert.deepEqual(JSON.parse(JSON.stringify(context.window.CAMPUS_TOPOLOGIES)),data);assert.equal(data.nodes.length,3);assert.ok(data.campaigns.length>=3);assert.ok(data.campaigns.every(c=>c.steps.every(s=>s.evidence&&s.verify)));});


async function lifecycle(t,memory={totalMemoryMiB:32768,availableMemoryMiB:20000}){
 const fixture=await require('./topology-fixture.cjs').setup(t),{engine,dir}=fixture,raw=engine.runner,machines=new Map(),disks=new Map(),extras=new Map();
 const runner=async(exe,a,o)=>{if(machines.has(a[1])){engine.vm=machines.get(a[1]);engine.extra=extras.get(a[1]);engine.disk=disks.get(a[1]);}if(a[0]==='createvm')engine.extra={};if(a[0]==='showmediuminfo'){for(const [id,disk]of disks)if([disk.id,disk.file].includes(a[2])){engine.disk=disk;engine.vm=machines.get(id);}}
  const reply=await raw(exe,a,o);if(a[0]==='createvm'){machines.set(engine.vm.UUID,engine.vm);extras.set(engine.vm.UUID,engine.extra);}if(a[0]==='createmedium')disks.set(engine.vm.UUID,engine.disk);return reply;};
 const manager=new TopologyManager({dataDir:dir,runner,executable:path.join(dir,'VBoxManage.exe'),memoryInfo:()=>memory});return{...fixture,manager,machines,memory};
}
test('per-node creation and native start enforce host reserve across profiles without changing other nodes',async t=>{
 const c=await lifecycle(t);for(const nodeId of ['workstation','router','server'])assert.equal((await c.manager.create(P,nodeId,{isoPath:c.iso})).operation.state,'configured');
 assert.equal(c.machines.size,3);let s=await c.manager.start(P,'workstation');assert.equal(s.nodes.find(n=>n.nodeId==='workstation').state,'running');assert.equal(s.nodes.find(n=>n.nodeId==='server').state,'configured');
 c.memory.availableMemoryMiB=9000;const before=c.engine.calls.filter(a=>a[0]==='startvm').length;s=await c.manager.start(P,'server');assert.equal(s.operation.code,'memory_budget');assert.equal(c.engine.calls.filter(a=>a[0]==='startvm').length,before);
 c.memory.availableMemoryMiB=20000;for(const nodeId of ['router','server'])assert.equal((await c.manager.start(P,nodeId)).operation.state,'running');
 const other='2f06b3be-90a2-499a-ae13-8067880e50de';await c.manager.create(other,'router',{isoPath:c.iso});s=await c.manager.start(other,'router');assert.equal(s.operation.code,'memory_budget');
});
test('guest kit binds expected identity and refuses drift or partial creation',async t=>{
 const c=await lifecycle(t);for(const nodeId of ['workstation','router','server'])await c.manager.create(P,nodeId,{isoPath:c.iso});const kit=await c.manager.exportKit(P);assert.equal(kit.manifest.nodes.length,3);assert.equal(kit.manifest.nodes.find(n=>n.nodeId==='router').nics.length,2);assert.deepEqual(kit.files.map(f=>f.name),['manifest.json','topology-guide.html','topology-linux.sh','topology-windows.ps1']);assert.ok(kit.files.every(f=>f.content.length>100));
 const router=[...c.machines.values()].find(v=>v.name.startsWith('Campus-topology-router'));router.nic2='nat';await assert.rejects(()=>c.manager.exportKit(P));
});
test('one failed node creation leaves other nodes configured and never retries a foreign registration',async t=>{
 const c=await lifecycle(t);await c.manager.create(P,'workstation',{isoPath:c.iso});c.engine.fail='storageattach';const s=await c.manager.create(P,'router',{isoPath:c.iso});assert.equal(s.operation.state,'error');assert.equal(s.nodes.find(n=>n.nodeId==='workstation').state,'configured');c.engine.fail=null;const creates=c.engine.calls.filter(a=>a[0]==='createvm').length;await c.manager.create(P,'router',{isoPath:c.iso});assert.equal(c.engine.calls.filter(a=>a[0]==='createvm').length,creates);assert.equal(c.engine.calls.some(a=>a.includes('--delete')),false);
});

test('exported guest scripts reject unexpected identity before mutations',async t=>{
 const {spawnSync}=require('node:child_process'),script=await fs.readFile(path.join(__dirname,'../assets/materials/topology-linux.sh'),'utf8');const python=script.replace(/\r\n/g,'\n').split("<<'PY'\n")[1].split('\nPY\n')[0];assert.ok(python.includes("product_uuid"));
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'campus-guest-guard-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));const manifest=path.join(dir,'manifest.json');await fs.writeFile(manifest,JSON.stringify({format:'campus-topology-guest-kit',version:1,nodes:[{nodeId:'router',uuid:P,nics:[{mac:'080027001122',address:'10.78.10.1/24'},{mac:'080027334455',address:'10.78.20.1/24'}]}]}));
 const result=spawnSync(process.platform==='win32'?'python':'python3',['-c',python,manifest,'router'],{encoding:'utf8',timeout:10000});if(result.error?.code==='ENOENT')return t.skip('Python unavailable');assert.equal(result.status,1);assert.equal(result.stdout,'');assert.match(result.stderr,/Guardia/);
 if(process.platform==='win32'){const ps=path.join(dir,'guard.ps1');const windowsScript=path.join(__dirname,'../assets/materials/topology-windows.ps1').replace(/'/g,"''");await fs.writeFile(ps,`function Get-CimInstance { param($ClassName) if($ClassName -eq 'Win32_ComputerSystem'){[pscustomobject]@{Model='PhysicalHost'}}else{[pscustomobject]@{UUID='${P}'}} }\nfunction New-NetIPAddress { throw 'UNSAFE MUTATION' }\ntry { & '${windowsScript}' -ManifestPath '${manifest.replace(/'/g,"''")}' } catch { Write-Output $_.Exception.Message; exit 23 }\n`);const winManifest=JSON.parse(await fs.readFile(manifest));winManifest.nodes=[{nodeId:'workstation',uuid:P,nics:[{mac:'080027001122',address:'10.78.10.10/24'}]}];await fs.writeFile(manifest,JSON.stringify(winManifest));const psResult=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-File',ps],{encoding:'utf8',timeout:10000});assert.equal(psResult.status,23,psResult.stderr);assert.match(psResult.stdout,/Guardia/);assert.doesNotMatch(psResult.stdout,/UNSAFE MUTATION/);}
});

test('visible guide extraction procedures produce the exact kit as UTF-8 LF and reject traversal and overwrite',async t=>{
 const {JSDOM}=require('jsdom'),{spawnSync}=require('node:child_process'),c=await lifecycle(t);
 for(const nodeId of ['workstation','router','server'])await c.manager.create(P,nodeId,{isoPath:c.iso});
 const kit=await c.manager.exportKit(P),guide=new JSDOM(await fs.readFile(path.join(__dirname,'../assets/materials/topology-guide.html'),'utf8'));
 t.after(()=>guide.window.close());
 for(const language of ['python','powershell']){
  const code=guide.window.document.querySelector('#extract-'+language)?.textContent;assert.ok(code,'Guide supplies runnable '+language+' extraction outside the envelope');
  if(language==='powershell'&&process.platform!=='win32')continue;
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'campus-extract-'+language+'-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  const file=path.join(dir,language==='python'?'extract.py':'extract.ps1');await fs.writeFile(file,code);const source=path.join(dir,'Campus-red-kit.json');await fs.writeFile(source,JSON.stringify(kit));
  const executable=language==='python'?(process.platform==='win32'?'python':'python3'):'powershell.exe',args=language==='python'?[file]:['-NoProfile','-NonInteractive','-File',file];
  const run=()=>spawnSync(executable,args,{cwd:dir,encoding:'utf8',timeout:15000});
  let reply=run();assert.equal(reply.status,0,reply.stderr+reply.stdout);
  const output=path.join(dir,'Campus-red-kit');assert.deepEqual((await fs.readdir(output)).sort(),kit.files.map(f=>f.name).sort());
  for(const expected of kit.files){const bytes=await fs.readFile(path.join(output,expected.name));assert.deepEqual(bytes,Buffer.from(expected.content.replace(/\r\n?/g,'\n'),'utf8'));assert.equal(bytes.includes(13),false);}
  await fs.writeFile(path.join(output,'manifest.json'),'preserve existing file');reply=run();assert.notEqual(reply.status,0);assert.equal(await fs.readFile(path.join(output,'manifest.json'),'utf8'),'preserve existing file');
  const unsafe=await fs.mkdtemp(path.join(os.tmpdir(),'campus-extract-invalid-'));t.after(()=>fs.rm(unsafe,{recursive:true,force:true}));const malicious=JSON.parse(JSON.stringify(kit));malicious.files[0].name='../escaped.json';await fs.writeFile(path.join(unsafe,'Campus-red-kit.json'),JSON.stringify(malicious));
  reply=spawnSync(executable,args,{cwd:unsafe,encoding:'utf8',timeout:15000});assert.notEqual(reply.status,0);await assert.rejects(()=>fs.stat(path.join(unsafe,'Campus-red-kit')),e=>e.code==='ENOENT');
 }
});
