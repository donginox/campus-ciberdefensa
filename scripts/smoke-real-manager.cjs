'use strict';
// Ubuntu CI only: exercises the actual desktop manager with the Docker daemon.
// Uses its own throwaway owner instance; never enumerates or prunes unrelated resources.
const {RealLabManager}=require('../desktop/real-labs.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {randomUUID}=require('node:crypto');
const exec=require('node:util').promisify(require('node:child_process').execFile);
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function webRequest(base,relative,body){
 const url=new URL(relative,base);assert.equal(url.hostname,'127.0.0.1');assert.equal(url.protocol,'http:');
 return new Promise((resolve,reject)=>{
  const request=require('node:http').request(url,{method:body===undefined?'GET':'POST',timeout:60000,headers:body===undefined?{}:{'Content-Type':'text/plain;charset=UTF-8','Content-Length':Buffer.byteLength(body)}},response=>{
   let bytes=0;const chunks=[];response.on('data',chunk=>{bytes+=chunk.length;if(bytes>2*1024*1024)request.destroy(new Error('Web response too large'));else chunks.push(chunk);});response.on('end',()=>{const value=Buffer.concat(chunks).toString('utf8');if(response.statusCode!==200)return reject(new Error('Web HTTP '+response.statusCode+': '+value.slice(0,200)));resolve(value);});response.on('error',reject);
  });request.on('timeout',()=>request.destroy(new Error('Web HTTP timeout')));request.on('error',reject);if(body!==undefined)request.write(body);request.end();
 });
}
(async()=>{
 const dataDir=await fs.mkdtemp(path.join(os.tmpdir(),'campus-manager-live-'));
 const manager=new RealLabManager({dataDir,runtimeDir:path.resolve('.local/lab-runtime'),onDiagnostic:error=>console.error('LAB_DIAGNOSTIC',error.stack||error.message)});
 const profile=randomUUID(),labs=['soc-response','database-fundamentals','juice-shop'];
 const evidence={docker:false,soc:false,database:false,web:false,socketIoPolling:false,lifecycle:false,loopback:false};
 async function ready(labId){
  let snapshot=await manager.start(profile,labId);
  for(let n=0;n<40;n++){
   if(snapshot.state==='running'&&snapshot.capabilities?.open)return snapshot;
   if(!['starting','running'].includes(snapshot.state))throw new Error(labId+': '+JSON.stringify(snapshot));
   await pause(500);snapshot=await manager.status(profile,labId);
  }
  throw new Error(labId+': service did not become ready');
 }
 try{
  const doctor=await manager.doctor();assert.equal(doctor.ready,true,JSON.stringify(doctor));evidence.docker=true;
  const soc=await ready('soc-response');assert.equal(new URL(soc.url).hostname,'127.0.0.1');assert.equal(soc.capabilities.replay,true);evidence.loopback=true;
  const traffic=await manager.replay(profile,'soc-response');assert.equal(traffic.generated,6);assert.ok(traffic.events.length>=6);
  const assessment=await manager.assess(profile,'soc-response',{actor:'sonda',failures:3});assert.equal(assessment.passed,true,JSON.stringify(assessment));
  await manager.contain(profile,'soc-response','sonda');const blocked=await manager.replay(profile,'soc-response');assert.ok(blocked.events.some(event=>event.actor==='sonda'&&event.status===403));evidence.soc=true;
  const db=await ready('database-fundamentals');assert.equal(new URL(db.url).hostname,'127.0.0.1');
  const result=await manager.query(profile,'database-fundamentals',"SELECT source_ip, COUNT(*) AS failures FROM auth_events WHERE outcome = 'failure' GROUP BY source_ip HAVING COUNT(*) >= 3 ORDER BY source_ip;");
  assert.equal(result.assessment.passed,true,JSON.stringify(result));assert.ok(result.rows.length>0);
  await assert.rejects(manager.query(profile,'database-fundamentals','DROP TABLE auth_events'));
  assert.ok((await manager.query(profile,'database-fundamentals','SELECT COUNT(*) AS count FROM auth_events')).rows[0][0]>0);evidence.database=true;
  const web=await ready('juice-shop');assert.equal(new URL(web.url).hostname,'127.0.0.1');
  const page=await webRequest(web.url,'/');assert.match(page,/juice.?shop/i);evidence.web=true;
  // Socket.IO defaults to polling before trying WebSocket. Prove fallback stays
  // usable through its real 25-second heartbeat, rather than only testing HTML.
  const handshake=await webRequest(web.url,'/socket.io/?EIO=4&transport=polling');assert.equal(handshake[0],'0');const engineIo=JSON.parse(handshake.slice(1));assert.match(engineIo.sid,/^[A-Za-z0-9_-]{1,100}$/);
  const poll='/socket.io/?EIO=4&transport=polling&sid='+engineIo.sid;
  assert.equal(await webRequest(web.url,poll,'40'),'ok');
  for(let attempt=0;attempt<8;attempt++){const packet=await webRequest(web.url,poll);if(packet.split('\x1e').includes('2')){assert.equal(await webRequest(web.url,poll,'3'),'ok');evidence.socketIoPolling=true;break;}}
  assert.equal(evidence.socketIoPolling,true,'Socket.IO real heartbeat must pass through the local proxy');
  for(const labId of labs){const stopped=await manager.stop(profile,labId);assert.equal(stopped.state,'stopped');assert.equal(stopped.capabilities.open,false);const reset=await manager.reset(profile,labId);assert.ok(['starting','running'].includes(reset.state),JSON.stringify(reset));await ready(labId);}
  evidence.lifecycle=true;console.log('CAMPUS_DOCKER_MANAGER_OK',JSON.stringify(evidence));
 }finally{
  const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.toUpperCase().startsWith('DOCKER_')));
  const docker=async args=>(await exec('docker',args,{shell:false,env,timeout:15000,maxBuffer:2*1024*1024})).stdout.trim();
  const context=await docker(['context','show']);assert.match(context,/^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/);
  let owner;try{owner=JSON.parse(await fs.readFile(path.join(dataDir,'real-labs-instance.json'),'utf8')).instanceId;}catch{}
  for(const labId of labs){try{
   const current=await manager.status(profile,labId);if(current.capabilities?.stop)await manager.stop(profile,labId);
   const stopped=await manager.status(profile,labId);if(!stopped.capabilities?.reset)continue;
   const stem=`campus-${owner}-${profile}`,name=stem+'-'+labId,internal=labId==='juice-shop'?stem+'-internal':name+'-internal';
   const inspect=async(type,value)=>JSON.parse(await docker(['--context',context,type,'inspect',value]))[0];
   function owned(resource,labels,role){assert.match(resource.Id,/^[a-f0-9]{64}$/);const expected={'owner':'campus-ciberdefensa','instance':owner,'profile':profile,'lab':labId};if(role)expected.role=role;for(const[key,value]of Object.entries(expected))assert.equal(labels['ar.campus.ciberdefensa.'+key],value);}
   // Validate all four identities before selective cleanup, never remove by broad selector.
   const proxy=await inspect('container',name+'-proxy');owned(proxy,proxy.Config.Labels,'proxy');assert.equal(proxy.State.Running,false);
   const container=await inspect('container',name);owned(container,container.Config.Labels);assert.equal(container.State.Running,false);
   const edge=await inspect('network',name+'-edge');owned(edge,edge.Labels,'edge');
   const network=await inspect('network',internal);owned(network,network.Labels);
   for(const target of [proxy,container])await docker(['--context',context,'container','rm',target.Id]);
   for(const target of [edge,network]){const checked=await inspect('network',target.Id);assert.equal(Object.keys(checked.Containers||{}).length,0);await docker(['--context',context,'network','rm',target.Id]);}

  }catch(error){console.error('Owned cleanup:',labId,error.message);process.exitCode=1;}}
  await fs.rm(dataDir,{recursive:true,force:true});
 }
})().catch(error=>{console.error('CAMPUS_DOCKER_MANAGER_FAIL',error.stack||error.message);process.exitCode=1;});
