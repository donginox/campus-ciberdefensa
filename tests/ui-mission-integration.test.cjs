'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {boot,click,input,tick}=require('./ui-harness.cjs');
test('el mapa abre la sala vinculada y las notas/borradores se guardan con la cola real del renderer',async t=>{
 const c=await boot({missions:true});t.after(()=>c.w.close());click(c,'[data-view="competencies"]');assert.match(c.d.querySelector('h1').textContent,/Qué debo saber/);
 click(c,'[data-competency-open-mission="soc-investigation"]');await tick();assert.match(c.d.querySelector('h1').textContent,/contener/);assert.match(c.d.querySelector('[data-mission-status]').textContent,/Docker/);
 input(c,'[data-mission-notes]','Observaciones del caso, pendientes de revisión.');input(c,'[data-mission-actor]','sonda');
 click(c,'[data-view="roadmap"]');click(c,'[data-view="environments"]');await tick();assert.equal(c.d.querySelector('[data-mission-notes]').value,'Observaciones del caso, pendientes de revisión.');assert.equal(c.d.querySelector('[data-mission-actor]').value,'sonda');await c.close();
 assert.equal(c.records.get('one').labs['mission-soc-investigation'].notes,'Observaciones del caso, pendientes de revisión.');assert.equal(c.records.get('one').labs['mission-soc-investigation'].drafts.actor,'sonda');
});
test('el catálogo y las tres salas integradas conservan etiquetas y estructura accesible sin motor',async t=>{
 const c=await boot({missions:true});t.after(()=>c.w.close());c.w.eval(fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8'));
 for(const destination of ['competencies','environments','web-investigation','soc-investigation','sql-investigation']){
  if(destination==='competencies'||destination==='environments')click(c,`[data-view="${destination}"]`);else{click(c,'[data-view="competencies"]');const button=c.d.querySelector(`[data-competency-open-mission="${destination}"]`);if(button)button.click();else{click(c,'[data-view="environments"]');const back=c.d.querySelector('[data-mission-action="back"]');if(back)back.click();click(c,`[data-mission-room="${destination}"]`);}}
  await tick();const result=await c.w.axe.run(c.d,{rules:{'color-contrast':{enabled:false}}});assert.equal(result.violations.length,0,destination+': '+JSON.stringify(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))));
 }
});
test('reintentar desde el cuaderno recupera el guardado global después de un error de disco',async t=>{
 let fail=true;const c=await boot({missions:true,save:async(payload,records)=>{if(fail)throw new Error('Disco temporalmente lleno');const previous=records.get(payload.id);const next={...previous,study:payload.study,labs:payload.labs,revision:previous.revision+1};records.set(payload.id,next);return next;}});t.after(()=>c.w.close());
 click(c,'[data-view="environments"]');click(c,'[data-mission-room="web-investigation"]');input(c,'[data-mission-notes]','Conservar esta investigación');await tick();assert.match(c.d.querySelector('[data-mission-save-error]').textContent,/lleno/);
 fail=false;click(c,'[data-mission-action="retry-save"]');await tick();await c.close();assert.ok(c.calls.includes('closed'));assert.equal(c.records.get('one').labs['mission-web-investigation'].notes,'Conservar esta investigación');assert.equal(c.d.querySelector('[data-mission-save-error]').hidden,true);
});
