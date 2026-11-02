const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');const os=require('node:os');const path=require('node:path');
const {SystemObserver}=require('../desktop/system-observer.cjs');
test('observer rejects arbitrary commands before execution',async()=>{
 let calls=0;const o=new SystemObserver({platform:'win32',runner:async()=>{calls++;return {stdout:'[]'}}});
 for(const kind of ['processes; Stop-Process','C:\\secret','',null,{},'constructor'])await assert.rejects(()=>o.observe(kind),/observación/i);
 assert.equal(calls,0);assert.equal(o.info().maxRows,30);
});
test('Windows observer selects fixed fields and strips sensitive and oversized input',async()=>{
 let command;const o=new SystemObserver({platform:'win32',runner:async(...args)=>{command=args;return {stdout:JSON.stringify(Array.from({length:70},(_,i)=>({Id:i,ProcessName:'safe',CPU:0,WorkingSet64:500,CommandLine:'SECRET',Path:'C:\\secret',Message:'SECRET'})))}}});
 const r=await o.observe('processes');assert.equal(r.source,'real-host');assert.equal(r.rows.length,30);assert.deepEqual(r.columns,['Id','ProcessName','CPU','WorkingSet64']);assert.equal(r.rows[0].Id,0);assert.equal(JSON.stringify(r).includes('SECRET'),false);assert.ok(Buffer.byteLength(JSON.stringify(r))<=131072);assert.ok(path.win32.isAbsolute(command[0]));assert.ok(command[1].includes('-NonInteractive'));assert.equal(command[2].shell,false);assert.equal(command[2].maxBuffer,131072);
});
test('event observation excludes message bodies, credentials and arbitrary provider fields',async()=>{
 const o=new SystemObserver({platform:'win32',runner:async()=>({stdout:JSON.stringify({Id:100,Level:2,ProviderName:'Service Control Manager',TimeCreated:'2026-11-02',Message:'SECRET',Properties:['SECRET']})})});
 const r=await o.observe('events');assert.equal(r.rows.length,1);assert.equal(r.rows[0].Id,100);assert.equal(JSON.stringify(r).includes('SECRET'),false);
});
test('unsupported platforms, malformed output, timeouts and permissions fail closed without sensitive stderr',async()=>{
 for(const runner of [async()=>({stdout:'not JSON SECRET'}),async()=>{throw Error('password SECRET')},async()=>({stdout:' '.repeat(131073)})]){
 const r=await new SystemObserver({platform:'win32',runner}).observe('services');assert.equal(r.state,'unavailable');assert.deepEqual(r.rows,[]);assert.doesNotMatch(JSON.stringify(r),/SECRET/);
 }
 const r=await new SystemObserver({platform:'darwin'}).observe('network');assert.equal(r.state,'unavailable');
});
test('Linux fixtures parse process names without command arguments and event metadata only',async()=>{
 const p=await new SystemObserver({platform:'linux',runner:async()=>({stdout:'  42 bash 0.1 0.2\n 43 python3 1.2 0.3\n'})}).observe('processes');assert.equal(p.rows[0].Name,'bash');assert.equal(p.rows[1].Pid,43);
 const e=await new SystemObserver({platform:'linux',runner:async()=>({stdout:'{"__REALTIME_TIMESTAMP":"1","PRIORITY":"6","SYSLOG_IDENTIFIER":"demo","MESSAGE":"SECRET"}\n'})}).observe('events');assert.equal(e.rows[0].SYSLOG_IDENTIFIER,'demo');assert.doesNotMatch(JSON.stringify(e),/SECRET/);
});
test('permissions inspect only generated Campus sandbox and reject redirected sandbox',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'campus-observer-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const o=new SystemObserver({dataDir:dir,platform:'linux'});const r=await o.observe('permissions');assert.equal(r.state,'available');assert.equal(r.rows[0].Name,'evidence-example.txt');assert.equal(await fs.readFile(path.join(dir,'system-practice-sandbox','evidence-example.txt'),'utf8'),'Datos ficticios de práctica Campus.\n');
 const bad=await fs.mkdtemp(path.join(os.tmpdir(),'campus-observer-link-'));t.after(()=>fs.rm(bad,{recursive:true,force:true}));await fs.symlink(dir,path.join(bad,'system-practice-sandbox'),'junction');const blocked=await new SystemObserver({dataDir:bad,platform:'linux'}).observe('permissions');assert.equal(blocked.state,'unavailable');
});
test('permissions initialize the absent application child directories before bounded observation',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'campus-observer-fresh-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 for(const platform of ['linux','win32']){
  const dataDir=path.join(root,platform,'campus-data','system-practice'),file=path.join(dataDir,'system-practice-sandbox','evidence-example.txt');let calls=0;
  const observer=new SystemObserver({dataDir,platform,runner:async(exe,args,options)=>{calls++;assert.equal(await fs.readFile(file,'utf8'),'Datos ficticios de práctica Campus.\n');assert.ok(args.at(-1).includes('Get-Acl -LiteralPath'));assert.ok(args.at(-1).includes(file.replace(/'/g,"''")));assert.equal(options.shell,false);return {stdout:'[{"Name":"evidence-example.txt","Identity":"Fixture","Rights":"Read","Type":"Allow","Inherited":true}]'}}});
  const result=await observer.observe('permissions');assert.equal(result.state,'available',platform);assert.equal(result.rows.length,1);assert.equal(result.rows[0].Name,'evidence-example.txt');assert.equal(calls,platform==='win32'?1:0);assert.match(result.limitations.join(' '),/Solo archivo ficticio/);assert.equal(await fs.readFile(file,'utf8'),'Datos ficticios de práctica Campus.\n');
 }
});
test('permissions reject a linked existing ancestor without creating its missing children outside',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'campus-observer-ancestor-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const outside=path.join(root,'outside'),linked=path.join(root,'redirected');await fs.mkdir(outside);await fs.writeFile(path.join(outside,'keep.txt'),'untouched');await fs.symlink(outside,linked,process.platform==='win32'?'junction':'dir');let calls=0;
 const result=await new SystemObserver({dataDir:path.join(linked,'campus-data','system-practice'),platform:'win32',runner:async()=>{calls++;return {stdout:'[]'}}}).observe('permissions');
 assert.equal(result.state,'unavailable');assert.equal(calls,0);assert.deepEqual(await fs.readdir(outside),['keep.txt']);assert.equal(await fs.readFile(path.join(outside,'keep.txt'),'utf8'),'untouched');
});
test('permissions revalidate the created sandbox ancestors before writing the fictitious file',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'campus-observer-recheck-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const dataDir=path.join(root,'owned'),outside=path.join(root,'outside'),sandbox=path.join(dataDir,'system-practice-sandbox');await fs.mkdir(dataDir);await fs.mkdir(path.join(outside,'system-practice-sandbox'),{recursive:true});const mkdir=fs.mkdir;let redirected=false,calls=0;
 t.mock.method(fs,'mkdir',async function(target,...args){const result=await mkdir.call(this,target,...args);if(target===sandbox&&!redirected){redirected=true;await fs.rename(dataDir,path.join(root,'retained'));await fs.symlink(outside,dataDir,process.platform==='win32'?'junction':'dir');}return result;});
 const result=await new SystemObserver({dataDir,platform:'win32',runner:async()=>{calls++;return {stdout:'[]'}}}).observe('permissions');
 assert.equal(redirected,true);assert.equal(result.state,'unavailable');assert.equal(calls,0);assert.deepEqual(await fs.readdir(path.join(outside,'system-practice-sandbox')),[]);
});
test('Windows observation isolates module lookup from a PowerShell 7 parent environment',async()=>{
 const observer=new SystemObserver({platform:'win32',runner:async(_exe,_args,options)=>{if(options.env?.PSModulePath!=='C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules')throw Error('incompatible inherited module');return {stdout:'[{"Name":"demo","Status":"Running","StartType":"Automatic"}]'}}});
 const result=await observer.observe('services');assert.equal(result.state,'available');assert.equal(result.rows[0].Name,'demo');
});
test('Linux process names containing spaces do not displace numeric CPU and memory fields',async()=>{
 const result=await new SystemObserver({platform:'linux',runner:async()=>({stdout:'42 process name 2.0 0.3\n43 worker 2 name 0.0 1.7\n'})}).observe('processes');
 assert.equal(result.rows[0].Name,'process name');assert.equal(result.rows[0].Pid,42);assert.equal(result.rows[0].CpuPercent,2);assert.equal(result.rows[0].MemoryPercent,0.3);assert.equal(result.rows[1].Name,'worker 2 name');assert.equal(result.rows[1].CpuPercent,0);assert.equal(result.rows[1].MemoryPercent,1.7);
});
