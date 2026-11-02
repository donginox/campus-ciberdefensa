'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),security=require('../desktop/security.cjs');
let actions;try{actions=require('../desktop/recovery-actions.cjs')}catch(e){if(e.code!=='MODULE_NOT_FOUND')throw e}
const id='12345678-1234-4234-8234-123456789abc';
test('recuperación IPC solo acepta capacidades opacas, nunca rutas ni texto de backup',()=>{
 for(const method of ['recoveryStatus','recoverFromBackup','openRecoveryFolder'])assert.equal(security.validateCall(method),undefined);
 assert.equal(security.validateCall('recoverStore',id),id);assert.throws(()=>security.validateCall('recoverStore','C:/profiles.json'));
 assert.throws(()=>security.validateCall('recoverFromBackup',{path:'C:/private.json'}));
});
test('cancelar recuperación o respaldo no muta; confirmar requiere el preview inspeccionado',async()=>{
 assert.equal(typeof actions?.RecoveryActions,'function');let confirmed=false,chosen=null;const calls=[];
 const store={recoveryStatus:async()=>({state:'corrupt',candidates:[{id,createdAt:'2026-11-02',profileCount:1,profiles:[{name:'Ana'}]}]}),recover:async value=>{calls.push(['recover',value]);return{id:'profile'}},inspectExternalBackup:async text=>{calls.push(['inspect',text]);return{name:'Ana',savedAt:'2026-11-02'}},recoverExternalBackup:async text=>{calls.push(['external',text]);return{id:'new'}}};
 const a=new actions.RecoveryActions({store,confirmRestore:async()=>confirmed,chooseExternal:async()=>chosen,confirmExternal:async()=>confirmed,openFolder:async()=>true});
 await assert.rejects(a.recover(id),/inspeccionar/i);await a.status();assert.deepEqual(await a.recover(id),{canceled:true});assert.equal(calls.length,0);assert.deepEqual(await a.external(),{canceled:true});
 chosen='JSON';assert.deepEqual(await a.external(),{canceled:true});assert.deepEqual(calls,[['inspect','JSON']]);confirmed=true;assert.equal((await a.recover(id)).profile.id,'profile');await assert.rejects(a.recover(id),/inspeccionar/i);
});
test('errores de filesystem se reducen a mensajes sin rutas del host',async()=>{
 const a=new actions.RecoveryActions({store:{recoveryStatus:async()=>{throw Error("EACCES C:/Users/private/profiles.json")}}});
 await assert.rejects(a.status(),e=>!e.message.includes('C:/')&&/recuperación/i.test(e.message));
});
