'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'); const os=require('node:os'); const path=require('node:path');
let RealLabManager;try{({RealLabManager}=require('../desktop/real-labs.cjs'));}catch{}
const PROFILE='b1ec24b4-0a98-4876-a61e-23bd18d31285';
const IMAGE='bkimminich/juice-shop@sha256:cea5a4af4aacee498c491491af0408934ec81d004035c0a02ef3e54395e3bf27';
const IMAGE_ID='sha256:590a451634fe564eff575ecb353a0e67ed6b3abef77005b223281663abda867e';
const clone=value=>structuredClone(value);
// Boundary fixture models Docker's JSON inspect shapes and applies CLI arguments to resource state.
function engine(){
 const state={calls:[],net:null,container:null,version:'28.5.1',os:'linux',endpoint:'npipe:////./pipe/dockerDesktopLinuxEngine',images:false,fail:null,delay:0};
 const image={Id:IMAGE_ID,RepoDigests:[IMAGE],Config:{Cmd:['/nodejs/bin/node','/juice-shop/build/app.js'],Entrypoint:null,Env:['NODE_ENV=production'],User:'65532',WorkingDir:'/juice-shop',Volumes:null,ExposedPorts:{'3000/tcp':{}}}};
 state.runner=async(exe,args,options)=>{
  assert.equal(exe,'docker'); assert.equal(options.shell,false); assert.equal(options.windowsHide,true); assert.ok(options.timeout>0&&options.timeout<=180000); assert.ok(options.maxBuffer<=2*1024*1024);
  assert.equal(Object.keys(options.env).some(key=>key.toUpperCase().startsWith('DOCKER_')),false);
  state.calls.push([...args]); if(state.delay)await new Promise(resolve=>setTimeout(resolve,state.delay));
  if(state.fail)throw Object.assign(new Error('sensitive-password /secret/path'),{code:state.fail});
  let a=[...args];if(a[0]==='--context'){assert.equal(a[1],'desktop-linux');a=a.slice(2);}
  const out=value=>({stdout:JSON.stringify(value)}); const flag=name=>a[a.indexOf(name)+1];
  if(a[0]==='context'&&a[1]==='show')return {stdout:'desktop-linux\n'};
  if(a[0]==='context'&&a[1]==='inspect')return out([{Name:'desktop-linux',Metadata:{},Endpoints:{docker:{Host:state.endpoint,SkipTLSVerify:false}},TLSMaterial:{},Storage:{MetadataPath:'x',TLSPath:'x'}}]);
  if(a[0]==='version')return out({Version:state.version,ApiVersion:'1.51',MinAPIVersion:'1.24',Os:state.os,Arch:'amd64',KernelVersion:'6.6.0',BuildTime:'2026-01-01',GoVersion:'go1.24',GitCommit:'abc'});
  if(a[0]==='container'&&a[1]==='ls')return out(state.container?[{ID:state.container.Id,Names:state.container.Name.slice(1)}]:[]);
  if(a[0]==='network'&&a[1]==='ls')return out(state.net?[{ID:state.net.Id,Name:state.net.Name}]:[]);
  if(a[0]==='container'&&a[1]==='inspect')return out([clone(state.container)]);
  if(a[0]==='network'&&a[1]==='inspect')return out([clone(state.net)]);
  if(a[0]==='image'&&a[1]==='inspect')return out([clone(image)]);
  if(a[0]==='image'&&a[1]==='pull'){assert.equal(a.at(-1),IMAGE);state.images=true;return {stdout:'Digest: fixed\n'};}
  if(a[0]==='network'&&a[1]==='create'){
   const labels={};for(let i=0;i<a.length;i++)if(a[i]==='--label'){const [k,v]=a[++i].split('=');labels[k]=v;}
   state.net={Name:a.at(-1),Id:'d'.repeat(64),Created:'2026-11-02',Scope:'local',Driver:flag('--driver'),EnableIPv6:false,IPAM:{Driver:'default',Options:null,Config:[{Subnet:'172.23.0.0/16',Gateway:'172.23.0.1'}]},Internal:a.includes('--internal'),Attachable:false,Ingress:false,ConfigFrom:{Network:''},ConfigOnly:false,Containers:{},Options:{},Labels:labels};return {stdout:state.net.Id};
  }
  if(a[0]==='container'&&a[1]==='create'){
   assert.equal(a.at(-1),IMAGE);const labels={};for(let i=0;i<a.length;i++)if(a[i]==='--label'){const [k,v]=a[++i].split('=');labels[k]=v;}
   const bind=flag('--publish').split(':'); const network=flag('--network');
   state.container={Id:'e'.repeat(64),Name:'/'+flag('--name'),Created:'2026-11-02',Path:'/nodejs/bin/node',Args:['/juice-shop/build/app.js'],Image:IMAGE_ID,State:{Status:'created',Running:false,Paused:false,Restarting:false,OOMKilled:false,Dead:false,Pid:0,ExitCode:0,Error:'',StartedAt:'0001-01-01T00:00:00Z',FinishedAt:'0001-01-01T00:00:00Z'},Config:{...clone(image.Config),Image:IMAGE,Labels:labels,Hostname:'eeee',Domainname:'',AttachStdin:false,AttachStdout:false,AttachStderr:false,Tty:false,OpenStdin:false,StdinOnce:false,StopTimeout:null},HostConfig:{Binds:null,ContainerIDFile:'',LogConfig:{Type:'json-file',Config:{}},NetworkMode:network,PortBindings:{[bind[2]+'/tcp']:[{HostIp:bind[0],HostPort:bind[1]}]},RestartPolicy:{Name:flag('--restart'),MaximumRetryCount:0},AutoRemove:false,VolumeDriver:'',VolumesFrom:null,CapAdd:null,CapDrop:a.includes('--cap-drop')?[flag('--cap-drop')]:null,CgroupnsMode:'private',Dns:[],DnsOptions:[],DnsSearch:[],ExtraHosts:null,GroupAdd:null,IpcMode:'private',Links:null,OomScoreAdj:0,PidMode:'',Privileged:a.includes('--privileged'),PublishAllPorts:false,ReadonlyRootfs:false,SecurityOpt:a.includes('--security-opt')?[flag('--security-opt')]:null,UTSMode:'',UsernsMode:'',ShmSize:67108864,Runtime:'runc',Isolation:'',CpuShares:0,Memory:flag('--memory')==='768m'?805306368:0,NanoCpus:Number(flag('--cpus'))*1e9,CgroupParent:'',BlkioWeight:0,CpuPeriod:0,CpuQuota:0,CpusetCpus:'',CpusetMems:'',Devices:[],DeviceCgroupRules:null,DeviceRequests:null,MemoryReservation:0,MemorySwap:flag('--memory-swap')==='768m'?805306368:0,OomKillDisable:false,PidsLimit:Number(flag('--pids-limit')),Ulimits:null,MaskedPaths:['/proc/acpi'],ReadonlyPaths:['/proc/bus'],Sysctls:null,StorageOpt:null},Mounts:[],NetworkSettings:{Ports:{},Networks:{[network]:{IPAMConfig:null,Links:null,Aliases:null,MacAddress:'',DriverOpts:null,NetworkID:state.net.Id,EndpointID:'',Gateway:'172.23.0.1',IPAddress:'172.23.0.2',IPPrefixLen:16,IPv6Gateway:'',GlobalIPv6Address:'',GlobalIPv6PrefixLen:0,DNSNames:null}}}};
   state.net.Containers[state.container.Id]={Name:state.container.Name.slice(1),EndpointID:'',MacAddress:'',IPv4Address:'172.23.0.2/16',IPv6Address:''};return {stdout:state.container.Id};
  }
  if(a[0]==='container'&&a[1]==='start'){assert.equal(a[2],state.container.Id);state.container.State.Running=true;state.container.State.Status='running';state.container.NetworkSettings.Networks[state.net.Name].NetworkID=state.net.Id;state.net.Containers[state.container.Id]={Name:state.container.Name.slice(1),EndpointID:'',MacAddress:'',IPv4Address:'172.23.0.2/16',IPv6Address:''};state.container.NetworkSettings.Ports={'3000/tcp':[{HostIp:'127.0.0.1',HostPort:'49153'}]};return {stdout:state.container.Id};}
  if(a[0]==='container'&&a[1]==='stop'){assert.equal(a.at(-1),state.container.Id);state.container.State.Running=false;state.container.State.Status='exited';state.container.NetworkSettings.Ports={};return {stdout:state.container.Id};}
  if(a[0]==='container'&&a[1]==='rm'){assert.equal(a.at(-1),state.container.Id);delete state.net.Containers[state.container.Id];state.container=null;return {stdout:'removed'};}
  throw Error('Unexpected Docker command: '+JSON.stringify(a));
 };return state;
}
async function setup(t){assert.equal(typeof RealLabManager,'function');const dir=await fs.mkdtemp(path.join(os.tmpdir(),'campus-docker-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));const docker=engine();return {dir,docker,manager:new RealLabManager({dataDir:dir,runner:docker.runner,platform:'win32'})};}
function mutations(docker){return docker.calls.filter(a=>a.includes('create')||a.includes('start')||a.includes('stop')||a.includes('rm')||a.includes('pull'));}

test('doctor distinguishes missing executable from engine failure without leaking subprocess errors',async t=>{
 const {docker,manager}=await setup(t);docker.fail='ENOENT';assert.equal((await manager.doctor()).code,'docker_missing');docker.fail='ECONNREFUSED';const result=await manager.doctor();assert.equal(result.ready,false);assert.equal(result.code,'engine_unavailable');assert.equal(JSON.stringify(result).includes('sensitive-password'),false);
});
test('local lifecycle preserves stopped target and resets only the validated target',async t=>{
 const {dir,docker,manager}=await setup(t);assert.equal((await manager.doctor()).ready,true);assert.equal((await manager.status(PROFILE)).state,'missing');
 const running=await manager.start(PROFILE);assert.equal(running.state,'running');assert.equal(running.url,'http://127.0.0.1:49153/');assert.equal(running.imageVersion,'20.3.0');assert.equal(docker.net.Internal,true);assert.equal(docker.container.HostConfig.Memory,805306368);assert.equal(docker.container.HostConfig.NanoCpus,1e9);assert.equal(docker.container.HostConfig.PidsLimit,256);
 const labels=docker.container.Config.Labels;assert.equal(labels['ar.campus.ciberdefensa.profile'],PROFILE);assert.match(labels['ar.campus.ciberdefensa.instance'],/^[a-f0-9-]{36}$/);
 const restarted=new RealLabManager({dataDir:dir,runner:docker.runner,platform:'win32'});assert.equal((await restarted.stop(PROFILE)).state,'stopped');assert.equal((await manager.start(PROFILE)).state,'running');assert.equal(mutations(docker).filter(a=>a.includes('pull')).length,1);
 assert.equal((await manager.reset(PROFILE)).state,'running');assert.equal(mutations(docker).filter(a=>a.includes('rm')).length,1);assert.equal(mutations(docker).filter(a=>a.includes('create')&&a.includes('container')).length,2);
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
 const {docker,manager}=await setup(t);await assert.rejects(()=>manager.start('../foreign'));assert.equal(docker.calls.length,0);docker.delay=1;const result=await Promise.all([manager.start(PROFILE),manager.start(PROFILE)]);assert.deepEqual(result.map(x=>x.state),['running','running']);assert.equal(mutations(docker).filter(a=>a[2]==='container'&&a.includes('create')).length,1);
});

test('Docker name filters find slash-prefixed container names and network names',async t=>{
 const {docker,manager}=await setup(t);const runner=docker.runner;docker.runner=async()=>{};
 const checked=async(exe,args,options)=>{if(args.includes('ls')){const filter=args[args.indexOf('--filter')+1];const name=(docker.container?.Name||'').slice(1);if(args.includes('container')&&name)assert.equal(new RegExp(filter.slice(5)).test('/'+name),true);}return runner(exe,args,options);};
 const strict=new RealLabManager({dataDir:manager.dataDir,runner:checked});assert.equal((await strict.start(PROFILE)).state,'running');
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
  c=>{c.HostConfig.PortBindings['3000/tcp'][0].HostIp='0.0.0.0';},
  c=>{c.NetworkSettings.Ports['3000/tcp'].push({HostIp:'::',HostPort:'49153'});},
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
 const {dir,docker,manager}=await setup(t);const bad=new RealLabManager({dataDir:dir,runner:async()=>({stdout:'not json'})});assert.equal((await bad.doctor()).ready,false);
 const runner=docker.runner;const interrupted=new RealLabManager({dataDir:dir,runner:async(exe,args,options)=>{if(args.includes('start'))throw Error('password=secret');return runner(exe,args,options);}});const result=await interrupted.start(PROFILE);assert.equal(result.state,'error');assert.equal(JSON.stringify(result).includes('secret'),false);assert.equal((await manager.status(PROFILE)).state,'stopped');
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
 const runner=docker.runner;const timed=new RealLabManager({dataDir:dir,runner:async(exe,args,options)=>{if(args.includes('stop'))throw Object.assign(Error('stderr private-key'),{killed:true,signal:'SIGTERM'});return runner(exe,args,options);}});const result=await timed.stop(PROFILE);assert.equal(result.state,'error');assert.equal(JSON.stringify(result).includes('private-key'),false);assert.equal((await manager.status(PROFILE)).state,'running');
});

test('verified dead target offers reset and recreation removes only its inspected ID',async t=>{
 const {docker,manager}=await setup(t);await manager.start(PROFILE);await manager.stop(PROFILE);docker.container.State.Dead=true;docker.container.State.Status='dead';const deadId=docker.container.Id;
 const snapshot=await manager.status(PROFILE);assert.equal(snapshot.state,'error');assert.equal(snapshot.canReset,true);assert.equal(snapshot.url,undefined);const before=mutations(docker).length;
 const reset=await manager.reset(PROFILE);assert.equal(reset.state,'running');const performed=mutations(docker).slice(before);assert.deepEqual(performed.filter(args=>args.includes('rm')),[['--context','desktop-linux','container','rm',deadId]]);assert.equal(performed.some(args=>args.includes('create')&&args.includes('container')),true);
});
test('dead target with ownership drift never exposes reset capability or mutates resources',async t=>{
 const {docker,manager}=await setup(t);await manager.start(PROFILE);await manager.stop(PROFILE);docker.container.State.Dead=true;docker.container.State.Status='dead';docker.container.Config.Labels['ar.campus.ciberdefensa.owner']='foreign';const before=mutations(docker).length;
 for(const method of ['status','reset']){const result=await manager[method](PROFILE);assert.equal(result.state,'unsafe');assert.equal(result.canReset,undefined);}assert.equal(mutations(docker).length,before);
});
test('missing target and engine failures carry no reset capability',async t=>{
 const {docker,manager}=await setup(t);const missing=await manager.status(PROFILE);assert.equal(missing.state,'missing');assert.equal(missing.canReset,undefined);docker.fail='ECONNREFUSED';const unavailable=await manager.status(PROFILE);assert.equal(unavailable.state,'unavailable');assert.equal(unavailable.canReset,undefined);
});
