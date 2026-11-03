'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module');
const main=path.join(__dirname,'../desktop/main.cjs'),nativeRequire=createRequire(main),tick=()=>new Promise(r=>setImmediate(r));
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};}
function boot(services={}){
 const handlers=new Map(),events={},calls=[];const contents={mainFrame:{url:'campus://app/src/renderer/index.html'},send:(channel)=>calls.push(channel)};
 const electron={app:{getAppPath:()=>path.join(__dirname,'..'),on:(name,cb)=>events[name]=cb,requestSingleInstanceLock:()=>true,whenReady:()=>new Promise(()=>{}),quit:()=>calls.push('quit')},protocol:{registerSchemesAsPrivileged(){}},ipcMain:{handle:(name,handler)=>handlers.set(name,handler)},dialog:{showSaveDialog:async()=>({filePath:'owned-export-destination'})}};
 const context={require:name=>name==='electron'?electron:name==='node:fs/promises'&&services.fileSystem?services.fileSystem:nativeRequire(name),__dirname:path.dirname(main),process,Buffer,URL,Response,setTimeout,clearTimeout};
 vm.runInNewContext(fs.readFileSync(main,'utf8')+`;globalThis.inject=values=>{store=values.store;topology=values.topology;forensic=values.forensic;professional=values.professional;advanced=values.advanced;mainWindow={webContents:values.contents,isDestroyed:()=>false};updater={quitAndInstall:()=>values.calls.push('install')};snapshot={status:'downloaded'};registerIpc();};globalThis.beginClose=requestClose;`,context,{filename:main});
 context.inject({contents,calls,store:{flush:async()=>calls.push('flushed'),saveProfile:async()=>({revision:1}),...services.store},topology:services.topology||{},forensic:services.forensic||{},professional:services.professional,advanced:services.advanced});
 return{calls,request:()=>context.beginClose(),invoke:(method,arg)=>handlers.get('campus:'+method)({sender:contents,senderFrame:contents.mainFrame},arg)};
}
const profileId='11111111-1111-4111-8111-111111111111';
for(const method of ['topologyCreate','topologySnapshot','forensicIngest','forensicExportNative'])for(const install of [false,true])test(method+' transaction settles before '+(install?'update install':'quit')+'; shutdown rejects newly arriving operations',async()=>{
 const op=deferred();let entered=0;const isTopology=method.startsWith('topology');const methodName={topologyCreate:'create',topologySnapshot:'snapshot',forensicIngest:'ingest',forensicExportNative:'exportNative'}[method];
 const c=boot({[isTopology?'topology':'forensic']:{[methodName]:()=>{entered++;return op.promise;}}});
 const arg=isTopology?{profileId,nodeId:'router'}:method==='forensicIngest'?{profileId,datasetId:'alameda'}:{profileId};
 const pending=c.invoke(method,arg);await tick();assert.equal(entered,1);if(install)await c.invoke('installUpdate');else c.request();const closing=c.invoke('readyToClose');await tick();assert.equal(c.calls.includes('quit')||c.calls.includes('install'),false);
 await assert.rejects(c.invoke(method,arg),/cierre|finalizando/i);assert.equal(entered,1);op.resolve({ok:true,state:'running'});await pending;await closing;assert.equal(c.calls.at(-1),install?'install':'quit');
});
test('a native transaction failure waits for every accepted write then refuses quit and permits explicit retry',async()=>{
 const first=deferred(),last=deferred();const c=boot({topology:{create:()=>first.promise,snapshot:()=>last.promise}});
 const pending=c.invoke('topologyCreate',{profileId,nodeId:'router'});const failure=assert.rejects(pending,/snapshot failed/);const remaining=c.invoke('topologySnapshot',{profileId,nodeId:'server'});await tick();c.request();const close=c.invoke('readyToClose');let settled=false;close.then(()=>settled=true,()=>settled=true);first.reject(Error('snapshot failed'));await failure;await tick();assert.equal(settled,false);last.resolve({ok:true});await remaining;await assert.rejects(close,/snapshot failed/);assert.equal(c.calls.includes('quit'),false);await c.invoke('readyToClose');assert.equal(c.calls.at(-1),'quit');
});
test('file export write and final renderer profile flush both drain without readyToClose waiting on itself',async()=>{
 const write=deferred(),save=deferred();const c=boot({fileSystem:{copyFile:()=>write.promise},store:{saveProfile:()=>save.promise}});
 const exportTask=c.invoke('exportMaterial','forensic-alameda.zip');const saveTask=c.invoke('saveProfile',{id:profileId,expectedRevision:1,study:{},labs:{}});await tick();c.request();const close=c.invoke('readyToClose');await tick();assert.equal(c.calls.includes('quit'),false);save.resolve({revision:1});await saveTask;await tick();assert.equal(c.calls.includes('quit'),false);write.resolve();await exportTask;await close;assert.equal(c.calls.at(-1),'quit');
});

test('actual forensic persistence finishes its atomic write before the main boundary allows quit',async t=>{
 const fsp=require('node:fs/promises'),os=require('node:os');const dir=await fsp.mkdtemp(path.join(os.tmpdir(),'campus-close-forensic-'));t.after(()=>fsp.rm(dir,{recursive:true,force:true}));
 const {ForensicLab}=require('../desktop/forensic-lab.cjs'),{ForensicActions}=require('../desktop/forensic-actions.cjs');const lab=new ForensicLab({dataDir:dir}),started=deferred(),release=deferred(),persist=lab.persist.bind(lab);
 lab.persist=async(db,file)=>{started.resolve();await release.promise;return persist(db,file);};
 const c=boot({forensic:new ForensicActions({store:{getProfile:async()=>({id:profileId})},engine:lab})});
 const task=c.invoke('forensicIngest',{profileId,datasetId:'alameda'});await started.promise;c.request();const closing=c.invoke('readyToClose');await tick();assert.equal(c.calls.includes('quit'),false);assert.equal(fs.existsSync(path.join(dir,profileId+'.sqlite')),false);release.resolve();await task;await closing;assert.equal(c.calls.at(-1),'quit');assert.equal((await new ForensicLab({dataDir:dir}).status(profileId)).eventCount,9);
});
test('close request still accepts final renderer save; a flush failure reopens controls and no duplicate acknowledgement quits twice',async()=>{
 const save=deferred();let fail=true;const c=boot({store:{saveProfile:()=>save.promise,flush:async()=>{if(fail)throw Error('disk flush failed');}}});
 c.request();const saving=c.invoke('saveProfile',{id:profileId,expectedRevision:1,study:{},labs:{}});await tick();const closing=c.invoke('readyToClose');await tick();assert.equal(c.calls.includes('quit'),false);save.resolve({revision:2});await saving;await assert.rejects(closing,/disk flush failed/);assert.equal(c.calls.includes('quit'),false);fail=false;await c.invoke('saveProfile',{id:profileId,expectedRevision:2,study:{},labs:{}});await Promise.all([c.invoke('readyToClose'),c.invoke('readyToClose')]);assert.equal(c.calls.filter(x=>x==='quit').length,1);
});
