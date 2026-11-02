const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const target=path.join(__dirname,'../src/shared/packet-case-core.js');
const load=()=>{assert.ok(fs.existsSync(target),'Packet case core is missing');return require(target)};
const report=()=>({filters:'Filtro dns y tcp revisado con criterio.',timeline:'Cronología UTC reconstruida con cuidado.',evidence:'Paquetes 1, 2 y 3 contrastados con los CSV.',interpretation:'Conclusión limitada a la evidencia visible.',alternative:'Hipótesis alternativa: falta otra fuente.'});
test('independent drafts and immutable declared reports never become an automatic grade',()=>{
 const c=load();let r=c.updateDraft(null,'guiado',report());r=c.submit(r,'guiado','2026-11-02T12:00:00.000Z');
 r=c.updateDraft(r,'guiado',{interpretation:'Revisión posterior con otra conclusión.'});
 assert.equal(r.cases.guiado.attempt.report.interpretation,'Conclusión limitada a la evidencia visible.');
 assert.equal(r.cases.transferencia.draft.filters,'');
 assert.equal(c.summary(r).declaredReports,1);assert.equal(c.summary(r).mastery,undefined);assert.equal(r.cases.guiado.attempt.passed,undefined);
 assert.throws(()=>c.submit(r,'transferencia'),/20/);
 assert.throws(()=>c.submit(c.updateDraft(null,'guiado',{...report(),evidence:'Evidencia descrita sin ningún número.'}),'guiado'),/paquete/i);
 assert.throws(()=>c.updateDraft(r,'other',report()),/caso/i);
});
test('normalization removes invented attempts, unknown properties and overlarge untrusted records',()=>{
 const c=load(),big=Object.fromEntries(['filters','timeline','evidence','interpretation','alternative'].map(k=>[k,'😀'.repeat(3000)]));
 const r=c.normalize({admin:true,cases:{guiado:{draft:big,attempt:{report:big,submittedAt:'bad',passed:true}},transferencia:{draft:big}},garbage:'x'.repeat(100000)});
 assert.equal(r.admin,undefined);assert.equal(r.cases.guiado.attempt,null);
 for(const id of ['guiado','transferencia'])for(const value of Object.values(r.cases[id].draft))assert.ok(value.length<=1500);
 assert.ok(Buffer.byteLength(JSON.stringify(r),'utf8')<=40000);
});
test('correction use is case-specific and accepted only following a declared report',()=>{
 const c=load();assert.throws(()=>c.markGuidance(null,'guiado','export'),/informe/i);
 let r=c.submit(c.updateDraft(null,'guiado',report()),'guiado','2026-11-02T12:00:00.000Z');r=c.markGuidance(r,'guiado','export');
 assert.equal(r.cases.guiado.guidanceUsed,true);assert.equal(r.cases.guiado.guidanceExported,true);assert.equal(r.cases.transferencia.guidanceUsed,false);
 assert.equal(c.summary(r).guidanceUsed,1);
});
test('dense Unicode never erases an existing declared report and malformed surrogate text stays safe',()=>{
 const c=load(),dense={...Object.fromEntries(['filters','timeline','interpretation','alternative'].map(k=>[k,'界'.repeat(1500)])),evidence:'Paquete 3: '+'界'.repeat(1400)};
 let r=c.submit(c.updateDraft(null,'guiado',dense),'guiado','2026-11-02T12:00:00.000Z');r=c.updateDraft(r,'transferencia',dense);
 try{const next=c.submit(r,'transferencia','2026-11-02T13:00:00.000Z');assert.ok(next.cases.guiado.attempt);assert.ok(Buffer.byteLength(JSON.stringify(next))<=40000)}catch(e){assert.match(e.message,/espacio|20/)}
 assert.ok(r.cases.guiado.attempt);assert.doesNotThrow(()=>c.updateDraft(r,'transferencia',{filters:'\ud800'}));
});
