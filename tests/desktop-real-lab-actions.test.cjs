const {test}=require('node:test');const assert=require('node:assert/strict');const security=require('../desktop/security.cjs');
let Actions;try{Actions=require('../desktop/real-lab-actions.cjs').RealLabActions;}catch(e){if(e.code!=='MODULE_NOT_FOUND')throw e;}
const id='12345678-1234-4234-8234-123456789abc';
function make(options={}){assert.equal(typeof Actions,'function','Falta el controlador de acciones reales');const target={state:'running',url:'http://127.0.0.1:49153',resets:0,starts:0};const store={async getProfile(value){if(value!==id)throw new Error('Perfil inexistente');return{id,name:'Estudiante'};}};const manager={async doctor(){return{ready:true};},async status(){return{state:target.state,url:target.url};},async start(){target.starts++;return{state:'running'};},async stop(){target.state='stopped';return{state:target.state};},async reset(){target.resets++;return{state:'running'};}};const opened=[];const actions=new Actions({manager,store,confirmReset:async()=>false,openExternal:async url=>{opened.push(url);},...options});return{actions,target,opened};}
// Catch exposing arbitrary command strings through IPC or accepting untyped resource selectors.
test('los métodos de entorno real solo aceptan ids de perfiles y ningún comando',()=>{
 assert.equal(security.validateCall('realLabDoctor'),undefined);
 for(const method of ['realLabStatus','startRealLab','stopRealLab','resetRealLab','openRealLab']){
  assert.equal(security.validateCall(method,id),id);
  for(const value of ['juice-shop; cmd /c whoami',{profileId:id,image:'custom'},null,'../otro'])assert.throws(()=>security.validateCall(method,value));
 }
});
// Catch destructive reset happening before confirmation or touching nonexistent profiles.
test('cancelar restablecimiento conserva el objetivo y un perfil ajeno no lo inicia',async()=>{
 const {actions,target}=make();assert.deepEqual(await actions.reset(id),{canceled:true});assert.equal(target.resets,0);
 await assert.rejects(actions.start('00000000-0000-4000-8000-000000000000'),/Perfil inexistente/);assert.equal(target.starts,0);
});
// Catch opening an unverified remote URL, a stopped target or a deceptive loopback URL.
test('abrir exige objetivo activo y URL loopback exacta proveniente del controlador',async()=>{
 const {actions,target,opened}=make();assert.deepEqual(await actions.open(id),{opened:true});assert.deepEqual(opened,['http://127.0.0.1:49153']);
 for(const url of ['https://example.com','http://127.0.0.1.evil.test:49153','http://127.0.0.1:49153/path','http://user@127.0.0.1:49153','http://0.0.0.0:49153']){target.url=url;await assert.rejects(actions.open(id));}
 target.url='http://127.0.0.1:49153';target.state='stopped';await assert.rejects(actions.open(id));assert.equal(opened.length,1);
});
test('confirmar restablecimiento devuelve el estado nuevo sin modificar notas del campus',async()=>{
 const {actions,target}=make({confirmReset:async()=>true});assert.deepEqual(await actions.reset(id),{canceled:false,snapshot:{state:'running'}});assert.equal(target.resets,1);
});
test('recupera un objetivo muerto solo si el controlador validó explícitamente que es restablecible',async()=>{
 const target={state:'error',message:'Objetivo muerto',canReset:true};let resetCount=0;
 const actions=make({manager:{status:async()=>target,reset:async()=>{resetCount++;return{state:'running'};}},confirmReset:async()=>true}).actions;
 assert.equal((await actions.reset(id)).canceled,false);assert.equal(resetCount,1);
 delete target.canReset;await assert.rejects(actions.reset(id));assert.equal(resetCount,1);
 target.state='unsafe';target.canReset=true;await assert.rejects(actions.reset(id));assert.equal(resetCount,1);
});
