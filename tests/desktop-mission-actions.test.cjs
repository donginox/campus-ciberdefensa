'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const security=require('../desktop/security.cjs');
const id='12345678-1234-4234-8234-123456789abc';
test('el puente de salas limita recetas y esquemas antes de ejecutar',()=>{
 assert.equal(security.validateCall('labCatalog'),undefined);
 for(const method of ['labStatus','labStart','labStop','labReset','labOpen','labEvents','labReplay']){
  assert.deepEqual(security.validateCall(method,{profileId:id,labId:'soc-response'}),{profileId:id,labId:'soc-response'});
  for(const value of [{profileId:id,labId:'custom'},{profileId:id,labId:'soc-response',url:'http://example.com'},{profileId:'../../',labId:'soc-response'},null])assert.throws(()=>security.validateCall(method,value));
 }
 assert.equal(security.validateCall('labQuery',{profileId:id,labId:'database-fundamentals',query:'SELECT 1'}).query,'SELECT 1');
 for(const query of ['', 'a'.repeat(8001),42])assert.throws(()=>security.validateCall('labQuery',{profileId:id,labId:'database-fundamentals',query}));
 assert.throws(()=>security.validateCall('labAssess',{profileId:id,labId:'soc-response',actor:'a',failures:1.5}));
 assert.throws(()=>security.validateCall('labContain',{profileId:id,labId:'soc-response',actor:'a\nHeader:value'}));
});
function make(){const {MissionActions}=require('../desktop/mission-actions.cjs');const calls=[];const target={state:'running',url:'http://127.0.0.1:49155/',capabilities:{open:true,reset:true}};const manager={catalog:()=>[{id:'soc-response'}],status:async(...args)=>{calls.push(['status',...args]);return target;}};for(const method of ['start','stop','reset','events','replay','query','assess','contain'])manager[method]=async(...args)=>{calls.push([method,...args]);return{ok:true};};let confirm=false;const actions=new MissionActions({manager,store:{getProfile:async value=>{if(value!==id)throw new Error('Perfil inexistente');}},confirmReset:async lab=>{calls.push(['confirm',lab]);return confirm;},openExternal:async url=>calls.push(['open',url])});return{actions,calls,target,setConfirm:value=>{confirm=value}};}
test('las acciones comprueban perfil y pasan solo argumentos estructurados al manager',async()=>{
 const c=make();await assert.rejects(c.actions.start({profileId:'no',labId:'soc-response'}),/Perfil/);assert.equal(c.calls.length,0);
 await c.actions.query({profileId:id,labId:'database-fundamentals',query:'SELECT 1'});assert.deepEqual(c.calls.at(-1),['query',id,'database-fundamentals','SELECT 1']);
 await c.actions.assess({profileId:id,labId:'soc-response',actor:'sonda',failures:3});assert.deepEqual(c.calls.at(-1),['assess',id,'soc-response',{actor:'sonda',failures:3}]);
});
test('reset de sala exige capacidad validada y confirmación nombrada',async()=>{
 const c=make(),input={profileId:id,labId:'soc-response'};assert.deepEqual(await c.actions.reset(input),{canceled:true});assert.ok(!c.calls.some(x=>x[0]==='reset'));
 c.setConfirm(true);assert.deepEqual(await c.actions.reset(input),{canceled:false,snapshot:{ok:true}});assert.deepEqual(c.calls.find(x=>x[0]==='confirm'),['confirm','soc-response']);
 c.target.state='unsafe';await assert.rejects(c.actions.reset(input));c.target.state='running';c.target.capabilities.reset=false;await assert.rejects(c.actions.reset(input));
});
test('abrir sala exige capacidad y URL loopback limpia incluso si un servicio reporta otra dirección',async()=>{
 const c=make(),input={profileId:id,labId:'soc-response'};assert.deepEqual(await c.actions.open(input),{opened:true});
 for(const url of ['http://localhost:49155','http://127.0.0.1:49155/admin','https://127.0.0.1:49155','http://user@127.0.0.1:49155','http://127.0.0.1:49155/?remote=x']){c.target.url=url;await assert.rejects(c.actions.open(input));}
 c.target.url='http://127.0.0.1:49155/';c.target.capabilities.open=false;await assert.rejects(c.actions.open(input));assert.equal(c.calls.filter(x=>x[0]==='open').length,1);
});
