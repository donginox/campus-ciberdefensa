'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{boot,click,tick,record}=require('./ui-harness.cjs');
test('un archivo dañado abre recuperación y la restauración adopta el perfil sin borrarlo primero',async t=>{
 let restored=false,restoreCalls=0;const recovered=record('restored','Ana recuperada'),candidate='12345678-1234-4234-8234-123456789abc';
 const c=await boot({active:false,professional:true,apiOverrides:{getActiveProfile:async()=>{throw Error('CORRUPT_STORE: damaged')},listProfiles:async()=>{if(!restored)throw Error('CORRUPT_STORE');return [{id:recovered.id,name:recovered.name}]},recoveryStatus:async()=>({state:'corrupt',preservedCopies:0,candidates:[{id:candidate,kind:'checkpoint',createdAt:'2026-11-02',profileCount:1,profiles:[{name:'Ana',updatedAt:'2026-11-02'}]}]}),recoverStore:async id=>{assert.equal(id,candidate);restoreCalls++;restored=true;return {canceled:false,profile:recovered}}}});t.after(()=>c.w.close());await tick();
 assert.match(c.d.querySelector('h1').textContent,/recuperación/i);assert.equal(c.calls.filter(x=>x?.study).length,0);
 click(c,'[data-recovery-id]');await tick();assert.equal(restoreCalls,1);assert.match(c.d.querySelector('#active-profile').textContent,/Ana recuperada/);assert.match(c.d.querySelector('h1').textContent,/próximo paso/);assert.equal(c.calls.filter(x=>x?.study).length,0);
});
test('cancelar desde el diálogo nativo conserva la pantalla y permite volver a inspeccionar',async t=>{
 const c=await boot({professional:true,apiOverrides:{recoveryStatus:async()=>({state:'healthy',preservedCopies:0,candidates:[{id:'backup',kind:'previous',createdAt:'2026-11-02',profileCount:1,profiles:[]}]}),recoverStore:async()=>({canceled:true})}});t.after(()=>c.w.close());click(c,'[data-view="recovery"]');await tick();click(c,'[data-recovery-id]');await tick();assert.match(c.d.querySelector('h1').textContent,/recuperación/i);assert.equal(c.d.querySelector('[data-recovery-action="refresh"]').disabled,false);assert.equal(c.calls.filter(x=>x?.study).length,0);
});
test('exportar desde recuperación abre el respaldo nativo del perfil activo',async t=>{
 const exported=[];const c=await boot({professional:true,apiOverrides:{recoveryStatus:async()=>({state:'healthy',preservedCopies:0,candidates:[]}),exportBackup:async id=>{exported.push(id);return {canceled:false}}}});t.after(()=>c.w.close());
 click(c,'[data-view="recovery"]');await tick();const button=[...c.d.querySelectorAll('.recovery-hub button')].find(el=>el.textContent==='Exportar mi respaldo JSON');assert.ok(button);button.click();await tick();
 assert.deepEqual(exported,['one']);assert.match(c.d.querySelector('h1').textContent,/recuperación/i);
});
