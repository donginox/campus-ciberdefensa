const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const data=require('../src/content/competencies.json');
function boot(study={lessons:{}},labs={}){
 const dom=new JSDOM('<!doctype html><html lang="es"><title>Campus</title><body><main></main></body></html>',{runScripts:'outside-only'}),w=dom.window,calls=[];
 const source=path.join(__dirname,'../src/renderer/competency-hub.js');assert.ok(fs.existsSync(source),'CompetencyHub module missing');w.eval(fs.readFileSync(source,'utf8'));
 const view=w.CompetencyHub.create({data,getStudy:()=>study,getLabs:()=>labs,openLesson:id=>calls.push(['lesson',id]),openMission:id=>calls.push(['mission',id]),navigate:id=>calls.push(['navigate',id]),announce:s=>calls.push(['announce',s])});const root=w.document.querySelector('main');root.innerHTML=view.render();view.mount(root);
 return {w,d:w.document,view,calls,close:()=>{view.dispose();w.close()}};
}
function select(c,id){const e=c.d.querySelector('[data-competency-certification]');e.value=id;e.dispatchEvent(new c.w.Event('change',{bubbles:true}))}
test('certification selection exposes all 27 original competencies with domain weights and source attribution',t=>{
 const c=boot();t.after(c.close);let count=0;for(const id of ['cc','ccst','security-plus','btl1','ejpt']){select(c,id);count+=c.d.querySelectorAll('[data-competency-skill]').length;assert.ok(c.d.querySelector('[data-competency-version]').textContent.length>20);assert.ok(c.d.querySelectorAll('a[href^="https://"]').length)}assert.equal(count,27);
 select(c,'ccst');assert.match(c.d.querySelector('[data-competency-domain-weight]').textContent,/verificad/i);assert.match(c.d.querySelector('[data-competency-coverage]').textContent,/blueprint/i);
});
test('reading, simulated practice and recorded evidence are derived without awarding certification',t=>{
 const c=boot({lessons:{'fronteras-confianza':{read:true}}},{'windows-acl':{attempts:1,passed:true},'mission-soc-investigation':{version:1,tasks:{},notes:'Observación propia.',lastEvidence:{caseId:'SOC-1',summary:'HTTP',observedAt:'2026-11-02T12:00:00Z'}}});t.after(c.close);
 assert.match(c.d.querySelector('[data-competency-skill="cc-controles"] [data-competency-state]').textContent,/Lectura/);
 assert.match(c.d.querySelector('[data-competency-skill="cc-ciclo-identidad"] [data-competency-state]').textContent,/Práctica simulada/);
 assert.match(c.d.querySelector('[data-competency-skill="cc-triaje-datos"] [data-competency-state]').textContent,/Evidencia registrada/);
 assert.match(c.d.querySelector('[data-competency-limit]').textContent,/no certifica/i);
});
test('external competencies remain a visible gap even after a local room reports a successful assessment',t=>{
 const c=boot({lessons:{}},{'mission-soc-investigation':{version:1,tasks:{},notes:'Informe',lastEvidence:{caseId:'SOC-1',summary:'ok',observedAt:'2026-11-02'},lastExecution:{passed:true,caseId:'SOC-1'}}});t.after(c.close);select(c,'btl1');const skill=c.d.querySelector('[data-competency-skill="btl-disco-memoria"]');assert.match(skill.querySelector('[data-competency-gap]').textContent,/extern|disco|memoria/i);assert.match(skill.querySelector('[data-competency-state]').textContent,/Revisión pendiente/);assert.ok(skill.querySelector('[data-competency-open-mission]'));
});
test('competency actions open exact lessons, mission and existing roadmap',t=>{
 const c=boot();t.after(c.close);c.d.querySelector('[data-competency-open-lesson="fronteras-confianza"]').click();c.d.querySelector('[data-competency-open-mission="soc-investigation"]').click();c.d.querySelector('[data-competency-navigate="roadmap"]').click();assert.deepEqual(c.calls.filter(x=>x[0]!=='announce'),[['lesson','fronteras-confianza'],['mission','soc-investigation'],['navigate','roadmap']]);
});
