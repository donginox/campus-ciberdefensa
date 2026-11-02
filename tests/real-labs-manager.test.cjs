'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'); const os=require('node:os'); const path=require('node:path');
let RealLabManager;try{({RealLabManager}=require('../desktop/real-labs.cjs'));}catch{}
const PROFILE='b1ec24b4-0a98-4876-a61e-23bd18d31285';
const IMAGE='bkimminich/juice-shop@sha256:cea5a4af4aacee498c491491af0408934ec81d004035c0a02ef3e54395e3bf27';
const IMAGE_ID='sha256:590a451634fe564eff575ecb353a0e67ed6b3abef77005b223281663abda867e';
const clone=value=>structuredClone(value);
const http=require('node:http');
const {createDockerEngine,writeRuntimeBundle}=require('./helpers/fake-lab-docker.cjs');
// Fake Docker models inspect boundaries; health traffic uses a real loopback HTTP server.
async function setup(t){
 assert.equal(typeof RealLabManager,'function');const dir=await fs.mkdtemp(path.join(os.tmpdir(),'campus-docker-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const runtimeDir=path.join(dir,'bundle');await writeRuntimeBundle(runtimeDir);let docker;
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(req.url==='/_campus_proxy/health'?docker.proxyHealth:{error:'not found'}));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 docker=createDockerEngine(server.address().port);return {dir,docker,manager:new RealLabManager({dataDir:dir,runtimeDir,runner:docker.runner,platform:'win32'}),url:'http://127.0.0.1:'+server.address().port+'/'};
}
function mutations(docker){return docker.calls.filter(a=>a.includes('create')||a.includes('start')||a.includes('stop')||a.includes('rm')||a.includes('pull')||a.includes('load'));}

test('doctor distinguishes missing executable from engine failure without leaking subprocess errors',async t=>{
 const {docker,manager}=await setup(t);docker.fail='ENOENT';assert.equal((await manager.doctor()).code,'docker_missing');docker.fail='ECONNREFUSED';const result=await manager.doctor();assert.equal(result.ready,false);assert.equal(result.code,'engine_unavailable');assert.equal(JSON.stringify(result).includes('sensitive-password'),false);
});
test('local lifecycle preserves stopped target and resets only the validated target',async t=>{
 const {dir,docker,manager,url}=await setup(t);assert.equal((await manager.doctor()).ready,true);assert.equal((await manager.status(PROFILE)).state,'missing');
 const running=await manager.start(PROFILE);assert.equal(running.state,'running');assert.equal(running.url,url);assert.equal(docker.container.HostConfig.PortBindings&&Object.keys(docker.container.HostConfig.PortBindings).length,0);assert.equal(docker.proxy.HostConfig.PortBindings['8081/tcp'][0].HostIp,'127.0.0.1');assert.equal(docker.edge.Internal,false);assert.equal(running.imageVersion,'20.3.0');assert.equal(docker.net.Internal,true);assert.equal(docker.container.HostConfig.Memory,805306368);assert.equal(docker.container.HostConfig.NanoCpus,1e9);assert.equal(docker.container.HostConfig.PidsLimit,256);
 const labels=docker.container.Config.Labels;assert.equal(labels['ar.campus.ciberdefensa.profile'],PROFILE);assert.match(labels['ar.campus.ciberdefensa.instance'],/^[a-f0-9-]{36}$/);
 const restarted=new RealLabManager({dataDir:dir,runtimeDir:manager.runtimeDir,runner:docker.runner,platform:'win32'});assert.equal((await restarted.stop(PROFILE)).state,'stopped');assert.equal((await manager.start(PROFILE)).state,'running');assert.equal(mutations(docker).filter(a=>a.includes('pull')).length,1);
 assert.equal((await manager.reset(PROFILE)).state,'running');assert.equal(mutations(docker).filter(a=>a.includes('rm')).length,2);assert.equal(mutations(docker).filter(a=>a.includes('create')&&a.includes('container')).length,4);
});
test('unsafe container drift blocks status URL and every mutating operation',async t=>{
 const {docker,manager}=await setup(t);await manager.start(PROFILE);docker.container.HostConfig.Binds=['C:/secrets:/host'];const count=mutations(docker).length;
 for(const method of ['status','start','stop','reset']){const result=await manager[method](PROFILE);assert.equal(result.state,'unsafe');assert.equal(result.url,undefined);}assert.equal(mutations(docker).length,count);
});
test('remote contexts and unsupported engines never create resources',async t=>{
 const {docker,manager}=await setup(t);for(const endpoint of ['tcp://127.0.0.1:2375','ssh://localhost','https://remote:443']){docker.endpoint=endpoint;assert.equal((await manager.doctor()).code,'unsafe_context');assert.equal((await manager.start(PROFILE)).state,'unavailable');}docker.endpoint='unix:///var/run/docker.sock';docker.version='27.5.1';assert.equal((await manager.doctor()).code,'unsupported_engine');docker.version='28.0.0';docker.os='windows';assert.equal((await manager.doctor()).ready,false);assert.equal(mutations(docker).length,0);
});
test('network ownership drift and foreign attached containers refuse reset',async t=>{
 const {docker,manager}=await setup(t);await manager.start(PROFILE);docker.net.Containers['f'.repeat(64)]={Name:'foreign'};const count=mutations(docker).length;assert.equal((await manager.reset(PROFILE)).state,'unsafe');assert.equal(mutations(docker).length,count);
});
test('invalid profile never reaches Docker and simultaneous starts create a single target',async t=>{
 const {docker,manager}=await setup(t);await assert.rejects(()=>manager.start('../foreign'));assert.equal(docker.calls.length,0);docker.delay=1;const result=await Promise.all([manager.start(PROFILE),manager.start(PROFILE)]);assert.deepEqual(result.map(x=>x.state),['running','running']);assert.equal(mutations(docker).filter(a=>a[2]==='container'&&a.includes('create')).length,2);
});

test('Docker name filters find slash-prefixed container names and network names',async t=>{
 const {docker,manager}=await setup(t);const runner=docker.runner;docker.runner=async()=>{};
 const checked=async(exe,args,options)=>{if(args.includes('ls')){const filter=args[args.indexOf('--filter')+1];const name=(docker.container?.Name||'').slice(1);if(args.includes('container')&&name&& !filter.includes('-proxy'))assert.equal(new RegExp(filter.slice(5)).test('/'+name),true);}return runner(exe,args,options);};
 const strict=new RealLabManager({dataDir:manager.dataDir,runtimeDir:manager.runtimeDir,runner:checked});assert.equal((await strict.start(PROFILE)).state,'running');
});
test('never publishes a URL or changes target after any unsafe configuration or ownership drift',async t=>{
 const changes=[
  c=>{c.Config.Labels['ar.campus.ciberdefensa.instance']='00000000-0000-4000-8000-000000000000';},
  c=>{c.Config.Image='other/image:latest';},c=>{c.Image='sha256:'+'a'.repeat(64);},
  c=>{c.Config.Cmd=['/bin/sh'];},c=>{c.Config.Env.push('NODE_OPTIONS=--inspect=0.0.0.0');},
  c=>{c.HostConfig.Privileged=true;},c=>{c.HostConfig.CapAdd=['NET_ADMIN'];},c=>{c.HostConfig.CapDrop=[];},
  c=>{c.HostConfig.SecurityOpt=['seccomp=unconfined'];},c=>{c.HostConfig.Memory=0;},c=>{c.HostConfig.PidsLimit=0;},c=>{c.HostConfig.NanoCpus=0;},
  c=>{c.HostConfig.NetworkMode='host';},c=>{c.HostConfig.PidMode='host';},c=>{c.HostConfig.IpcMode='host';},
  c=>{c.Mounts=[{Type:'bind',Source:'/var/run/docker.sock',Destination:'/var/run/docker.sock',RW:true}];},
  c=>{c.HostConfig.Devices=[{PathOnHost:'/dev/kvm',PathInContainer:'/dev/kvm',CgroupPermissions:'rwm'}];},
  c=>{c.HostConfig.PortBindings={'3000/tcp':[{HostIp:'0.0.0.0',HostPort:'49153'}]};},
  c=>{c.NetworkSettings.Ports['3000/tcp']=[{HostIp:'::',HostPort:'49153'}];},
  c=>{c.NetworkSettings.Networks.bridge={NetworkID:'f'.repeat(64)};},
 ];
 for(let i=0;i<changes.length;i++){const {docker,manager}=await setup(t);await manager.start(PROFILE);changes[i](docker.container);const count=mutations(docker).length;
  for(const method of ['status','start','stop','reset']){const result=await manager[method](PROFILE);assert.equal(result.state,'unsafe',`drift ${i}, ${method}`);assert.equal(result.url,undefined);}assert.equal(mutations(docker).length,count);
 }
});
test('foreign same-name network and containers are never adopted or removed',async t=>{
 const {docker,manager}=await setup(t);await manager.start(PROFILE);docker.container.Config.Labels['ar.campus.ciberdefensa.owner']='other-app';let count=mutations(docker).length;assert.equal((await manager.reset(PROFILE)).state,'unsafe');assert.equal(mutations(docker).length,count);
 docker.container=null;docker.net.Containers={};docker.net.Labels['ar.campus.ciberdefensa.owner']='other-app';count=mutations(docker).length;assert.equal((await manager.start(PROFILE)).state,'unsafe');assert.equal(mutations(docker).length,count);
});
test('Docker environment never overrides verified local context',async t=>{
 const {docker,manager}=await setup(t);const previous=process.env.DOCKER_HOST;try{process.env.DOCKER_HOST='tcp://127.0.0.1:2375';assert.equal((await manager.doctor()).code,'unsafe_context');assert.equal(docker.calls.length,0);}finally{if(previous===undefined)delete process.env.DOCKER_HOST;else process.env.DOCKER_HOST=previous;}
});
test('malformed Docker JSON and interrupted mutations return persistent safe failures',async t=>{
 const {dir,docker,manager}=await setup(t);const bad=new RealLabManager({dataDir:dir,runtimeDir:manager.runtimeDir,runner:async()=>({stdout:'not json'})});assert.equal((await bad.doctor()).ready,false);
 const runner=docker.runner;const interrupted=new RealLabManager({dataDir:dir,runtimeDir:manager.runtimeDir,runner:async(exe,args,options)=>{if(args.includes('start'))throw Error('password=secret');return runner(exe,args,options);}});const result=await interrupted.start(PROFILE);assert.equal(result.state,'error');assert.equal(JSON.stringify(result).includes('secret'),false);assert.equal((await manager.status(PROFILE)).state,'stopped');
});
test('corrupt persisted installation identity refuses adoption and recreation',async t=>{
 const {dir,docker,manager}=await setup(t);await manager.start(PROFILE);await fs.writeFile(path.join(dir,'real-labs-instance.json'),'{}');const count=mutations(docker).length;assert.equal((await manager.reset(PROFILE)).state,'unsafe');assert.equal(mutations(docker).length,count);
});
test('unstarted Docker container with pending endpoint can be safely started using owned network name',async t=>{
 const {dir,docker,manager}=await setup(t);await manager.start(PROFILE);await manager.stop(PROFILE);docker.container.State.Status='created';docker.container.NetworkSettings.Networks[docker.net.Name].NetworkID='';docker.net.Containers={};
 assert.equal((await manager.start(PROFILE)).state,'running');
});

test('missing inspect evidence blocks control instead of treating omitted fields as empty',async t=>{
 const {docker,manager}=await setup(t);await manager.start(PROFILE);delete docker.container.Mounts;const count=mutations(docker).length;assert.equal((await manager.stop(PROFILE)).state,'unsafe');assert.equal(mutations(docker).length,count);
});
test('paused targets have no open URL and operation timeouts expose no stderr',async t=>{
 const {dir,docker,manager}=await setup(t);await manager.start(PROFILE);docker.container.State.Paused=true;assert.equal((await manager.status(PROFILE)).state,'starting');assert.equal((await manager.status(PROFILE)).url,undefined);docker.container.State.Paused=false;
 const runner=docker.runner;const timed=new RealLabManager({dataDir:dir,runtimeDir:manager.runtimeDir,runner:async(exe,args,options)=>{if(args.includes('stop'))throw Object.assign(Error('stderr private-key'),{killed:true,signal:'SIGTERM'});return runner(exe,args,options);}});const result=await timed.stop(PROFILE);assert.equal(result.state,'error');assert.equal(JSON.stringify(result).includes('private-key'),false);assert.equal((await manager.status(PROFILE)).state,'running');
});

test('verified dead target offers reset and recreation removes only its inspected ID',async t=>{
 const {docker,manager}=await setup(t);await manager.start(PROFILE);await manager.stop(PROFILE);docker.container.State.Dead=true;docker.container.State.Status='dead';const deadId=docker.container.Id,proxyId=docker.proxy.Id;
 const snapshot=await manager.status(PROFILE);assert.equal(snapshot.state,'error');assert.equal(snapshot.canReset,true);assert.equal(snapshot.url,undefined);const before=mutations(docker).length;
 const reset=await manager.reset(PROFILE);assert.equal(reset.state,'running');const performed=mutations(docker).slice(before);assert.deepEqual(new Set(performed.filter(args=>args.includes('rm')).map(args=>args.at(-1))),new Set([deadId,proxyId]));assert.equal(performed.some(args=>args.includes('create')&&args.includes('container')),true);
});
test('dead target with ownership drift never exposes reset capability or mutates resources',async t=>{
 const {docker,manager}=await setup(t);await manager.start(PROFILE);await manager.stop(PROFILE);docker.container.State.Dead=true;docker.container.State.Status='dead';docker.container.Config.Labels['ar.campus.ciberdefensa.owner']='foreign';const before=mutations(docker).length;
 for(const method of ['status','reset']){const result=await manager[method](PROFILE);assert.equal(result.state,'unsafe');assert.equal(result.canReset,undefined);}assert.equal(mutations(docker).length,before);
});
test('missing target and engine failures carry no reset capability',async t=>{
 const {docker,manager}=await setup(t);const missing=await manager.status(PROFILE);assert.equal(missing.state,'missing');assert.equal(missing.canReset,undefined);docker.fail='ECONNREFUSED';const unavailable=await manager.status(PROFILE);assert.equal(unavailable.state,'unavailable');assert.equal(unavailable.canReset,undefined);
});
