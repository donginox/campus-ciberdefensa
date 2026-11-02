'use strict';
// Real, read-only host probe. Only availability and counts enter CI logs.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {SystemObserver}=require('../desktop/system-observer.cjs');
(async()=>{
 const dataDir=await fs.mkdtemp(path.join(os.tmpdir(),'campus-observer-smoke-'));
 const observer=new SystemObserver({dataDir}),results=[];
 for(const kind of ['processes','services','network','events','permissions']){
  const result=await observer.observe(kind);
  assert.equal(result.kind,kind);assert.equal(result.platform,process.platform);
  assert.ok(['available','unavailable'].includes(result.state));
  assert.ok(result.rows.length<=30);assert.ok(Buffer.byteLength(JSON.stringify(result))<=128*1024);
  if(['processes','network','permissions'].includes(kind))assert.equal(result.state,'available',kind+' must work on this runner');
  results.push({kind,state:result.state,rows:result.rows.length});
 }
 console.log('SYSTEM_OBSERVER_SMOKE_OK',JSON.stringify({platform:process.platform,results}));
})().catch(error=>{console.error(error.stack);process.exitCode=1});
