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
test('Windows observation isolates module lookup from a PowerShell 7 parent environment',async()=>{
 const observer=new SystemObserver({platform:'win32',runner:async(_exe,_args,options)=>{if(options.env?.PSModulePath!=='C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules')throw Error('incompatible inherited module');return {stdout:'[{"Name":"demo","Status":"Running","StartType":"Automatic"}]'}}});
 const result=await observer.observe('services');assert.equal(result.state,'available');assert.equal(result.rows[0].Name,'demo');
});
test('Linux process names containing spaces do not displace numeric CPU and memory fields',async()=>{
 const result=await new SystemObserver({platform:'linux',runner:async()=>({stdout:'42 process name 2.0 0.3\n43 worker 2 name 0.0 1.7\n'})}).observe('processes');
 assert.equal(result.rows[0].Name,'process name');assert.equal(result.rows[0].Pid,42);assert.equal(result.rows[0].CpuPercent,2);assert.equal(result.rows[0].MemoryPercent,0.3);assert.equal(result.rows[1].Name,'worker 2 name');assert.equal(result.rows[1].CpuPercent,0);assert.equal(result.rows[1].MemoryPercent,1.7);
});
