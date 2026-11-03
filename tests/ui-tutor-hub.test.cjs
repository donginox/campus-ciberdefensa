'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const {JSDOM}=require('jsdom');const axe=require('axe-core');
const {TutorExchange}=require('../desktop/tutor-exchange.cjs');
const Assessment=require('../src/shared/assessment-core.js');
const at='2026-11-02T10:00:00.000Z',tick=()=>new Promise(resolve=>setTimeout(resolve,5));
function profile(){const text='Síntesis propia con evidencia y límites documentados.';return {id:'one',revision:1,labs:{'independent-assessment':{attempts:[{id:'attempt-1',caseId:Assessment.CASES[0],startedAt:at,submittedAt:at,preflight:{environment:text,baseline:text,scope:text,scopeConfirmed:true},report:Object.fromEntries(Assessment.REPORT_FIELDS.map(k=>[k,text])),execution:'not-executed',independence:'independent',reviewStatus:'self-declared'}]}}}}
function review(packet){return {app:'campus-tutor-feedback',version:1,feedbackId:'feedback-ui',packageId:packet.packageId,contentHash:packet.contentHash,sourceId:packet.content.source.id,createdAt:at,reviewer:{name:'<img src=x onerror=alert(1)>',identity:'declared-unverified'},comments:[{section:'procedure',comment:'<script>alert(1)</script> Explicá el procedimiento.'}],rubric:[{criterion:'Evidencia',rating:'developing',comment:'Agregá trazabilidad.'}],nextPractice:'Trabajá con un caso nuevo.'}}
function setup(options={}){
 const file=path.join(__dirname,'../src/renderer/tutor-hub.js');assert.ok(fs.existsSync(file),'TutorHub must provide the local review interface');
 const dom=new JSDOM('<!doctype html><html lang="es"><head><title>Tutor local</title></head><body><main></main></body></html>',{runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;for(const f of ['shared/assessment-core.js','shared/packet-case-core.js','shared/tutor-core.js','renderer/tutor-hub.js'])w.eval(fs.readFileSync(path.join(__dirname,'../src',f),'utf8'));
 let current=profile(),epoch=1,record=null;const exchange=new TutorExchange();let commits=0;const announcements=[];
 const packet=exchange.exportPackage(current,'independent-assessment:attempt-1'),incoming=JSON.stringify(review(packet));
 const desktop={tutorExport:async()=>({canceled:false}),tutorPreview:async()=>exchange.preview(current,incoming),tutorCommit:async({profileId,previewId})=>{assert.equal(profileId,current.id);commits++;if(options.failCommit&&commits===1)throw Error('Disco lleno');const r=exchange.commit(current,previewId);record=r.record;current={...current,revision:current.revision+1,labs:{...current.labs,'tutor-reviews':record}};return {...r,profile:current}},exportMaterial:async()=>({canceled:false}),...options.desktop};
 const hub=w.TutorHub.create({getProfileId:()=>current?.id||null,getProfileEpoch:()=>epoch,getRecord:()=>record,getLabs:()=>current?.labs||{},desktop,onProfileUpdated:p=>{current=p},announce:m=>announcements.push(m)});
 const main=w.document.querySelector('main');const draw=()=>{main.innerHTML=hub.render();hub.mount(main)};draw();
 return {w,d:w.document,hub,desktop,announcements,draw,get commits(){return commits},get record(){return record},switchProfile(){current={id:'two',revision:1,labs:{}};record=null;epoch++;draw()},close(){hub.dispose();w.close()}};
}
function click(ctx,action){const el=ctx.d.querySelector('[data-tutor-action="'+action+'"]');assert.ok(el,'missing '+action);el.click()}
test('preview escapes all imported text and confirmation is required before a native save',async()=>{
 const c=setup();click(c,'import');await tick();
 assert.equal(c.commits,0);assert.ok(c.d.querySelector('[data-tutor-preview]'));
 assert.match(c.d.body.textContent,/<script>alert\(1\)<\/script>/);assert.equal(c.d.querySelector('script,img'),null);
 assert.match(c.d.body.textContent,/identidad declarada|sin verificar/i);
 click(c,'confirm');await tick();assert.equal(c.commits,1);assert.equal(c.record.reviews.length,1);
 assert.match(c.d.querySelector('[data-tutor-status]').textContent,/guardad/i);
 c.close();
});
test('a failed save keeps the preview and a deliberate retry can save it',async()=>{
 const c=setup({failCommit:true});click(c,'import');await tick();click(c,'confirm');await tick();
 assert.equal(c.record,null);assert.ok(c.d.querySelector('[data-tutor-preview]'));assert.match(c.d.querySelector('[role=alert]').textContent,/Disco lleno/);
 assert.equal(c.d.activeElement,c.d.querySelector('[role=alert]'));
 click(c,'confirm');await tick();assert.equal(c.record.reviews.length,1);assert.equal(c.commits,2);c.close();
});
test('cancel writes nothing and late preview responses cannot paint a newly selected profile',async()=>{
 let resolve;const c=setup({desktop:{tutorPreview:()=>new Promise(r=>{resolve=r})}});
 click(c,'import');await tick();c.switchProfile();resolve({previewId:'stale',feedback:{reviewer:{name:'OLD_PROFILE'}},packet:{}});await tick();
 assert.equal(c.d.querySelector('[data-tutor-preview]'),null);assert.equal(c.d.body.textContent.includes('OLD_PROFILE'),false);assert.equal(c.commits,0);c.close();
 const b=setup();click(b,'import');await tick();click(b,'cancel');assert.equal(b.commits,0);assert.equal(b.d.querySelector('[data-tutor-preview]'),null);b.close();
});
test('accessible empty, preview and saved views label controls and expose status/errors',async()=>{
 const c=setup();c.w.eval(axe.source);
 for(const stage of ['empty','preview','saved']){
  if(stage==='preview'){click(c,'import');await tick()}
  if(stage==='saved'){click(c,'confirm');await tick()}
  const result=await c.w.axe.run(c.d,{rules:{'color-contrast':{enabled:false}}});
  assert.deepEqual(Array.from(result.violations,v=>v.id),[],stage);
 }
 c.close();
});
test('a late successful save cannot adopt or display another profile after a profile switch',async()=>{
 let resolve;const c=setup({desktop:{tutorCommit:()=>new Promise(r=>{resolve=r})}});click(c,'import');await tick();click(c,'confirm');await tick();c.switchProfile();
 resolve({profile:{id:'one',revision:9,labs:{'tutor-reviews':{version:1,reviews:[]}}},record:{version:1,reviews:[]}});await tick();
 c.draw();assert.match(c.d.body.textContent,/Todavía no hay informes entregados/);assert.equal(c.d.querySelector('[data-tutor-preview]'),null);assert.equal(c.d.body.textContent.includes('Devolución guardada.'),false);c.close();
});
