'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const {boot,click,tick}=require('./ui-harness.cjs');
let core;try{core=require('../src/shared/onboarding-core.js')}catch(e){if(e.code!=='MODULE_NOT_FOUND')throw e}
test('la guía normaliza entradas importadas y conserva flexibilidad sin inventar requisitos',()=>{
 assert.equal(typeof core?.normalize,'function');
 const r=core.normalize({step:99,certificationId:'BAD',availability:'flexible',environments:['linux-other','BAD','linux-other'],targetDate:'2026-02-31',checks:{docker:{state:'ready',message:'PRIVATE'}}});
 assert.equal(r.step,2);assert.equal(r.certificationId,'cc');assert.deepEqual(r.environments,['linux-other']);assert.equal(r.availability,'flexible');assert.equal(r.targetDate,'2026-12-15');assert.deepEqual(r.checks,{});
 assert.deepEqual(core.plan(r),{certificationId:'cc',targetDate:'2026-12-15',weeklyMinutes:360});
 assert.throws(()=>core.finish({...r,targetDate:'BAD'}),/fecha/i);
});
test('la guía aplica la certificación al plan y termina en el diagnóstico sin instalar motores',async t=>{
 const c=await boot({professional:true,missions:true});t.after(()=>c.w.close());click(c,'[data-view="onboarding"]');
 const field=c.d.querySelector('[name="onboarding-cert"]');field.value='btl1';field.dispatchEvent(new c.w.Event('change',{bubbles:true}));await tick();
 click(c,'[data-onboarding-action="next"]');await tick();click(c,'[data-onboarding-action="next"]');await tick();click(c,'[data-onboarding-action="finish"]');await tick();await c.close();
 assert.match(c.d.querySelector('h1').textContent,/Diagnóstico/);const labs=c.records.get('one').labs;assert.equal(labs['professional-onboarding'].completed,true);assert.equal(labs['professional-learning'].settings.certificationId,'btl1');assert.equal(labs['professional-learning'].settings.weeklyMinutes,360);
 assert.equal(c.calls.filter(x=>Array.isArray(x)&&/vm|doctor/.test(x[0])).length,0);
});
test('la guía guarda borradores, conserva errores al volver y no adopta checks de un perfil importado',async t=>{
 const dom=new JSDOM('<main></main>',{runScripts:'outside-only',pretendToBeVisual:true});t.after(()=>dom.window.close());const w=dom.window;
 w.eval(fs.readFileSync(path.resolve(__dirname,'../src/shared/onboarding-core.js'),'utf8'));w.eval(fs.readFileSync(path.resolve(__dirname,'../src/renderer/onboarding-hub.js'),'utf8'));
 let record={},generation=1,deny=true,resolve;const saved=[];let calls=0;
 const hub=w.OnboardingHub.create({getProfileId:()=> 'one',getProfileEpoch:()=>generation,getRecord:()=>record,saveRecord:async r=>{record=r;saved.push(r);if(deny)throw Error('disco ocupado');return true},applyPlan:async()=>{},navigate:()=>{},desktop:{vmDoctor:()=>{calls++;return new Promise(r=>resolve=r)}}});
 const main=w.document.querySelector('main');function mount(){main.innerHTML=hub.render();hub.mount(main)}mount();assert.equal(calls,0);
 const cert=main.querySelector('[name="onboarding-cert"]');cert.value='ejpt';cert.dispatchEvent(new w.Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,0));
 hub.dispose();mount();assert.match(main.textContent,/disco ocupado/);deny=false;main.querySelector('[data-onboarding-action="retry"]').click();await new Promise(r=>setTimeout(r,0));assert.ok(saved.length>=2);
 main.querySelector('[data-onboarding-action="next"]').click();await new Promise(r=>setTimeout(r,0));main.querySelector('[data-onboarding-check="vm"]').click();assert.equal(calls,1);
 generation++;record={step:1,checks:{},certificationId:'ccst'};hub.dispose();mount();resolve({ready:true,message:'VM lista'});await new Promise(r=>setTimeout(r,0));assert.equal(record.certificationId,'ccst');assert.deepEqual(record.checks,{});assert.doesNotMatch(main.textContent,/VM lista/);
});
test('borrar la fecha bloquea continuar hasta corregirla y nunca aplica la fecha anterior',async t=>{
 const c=await boot({professional:true});t.after(()=>c.w.close());click(c,'[data-view="onboarding"]');
 const date=c.d.querySelector('[name="onboarding-date"]');assert.equal(date.value,'2026-12-15');date.value='';date.dispatchEvent(new c.w.Event('change',{bubbles:true}));
 const cert=c.d.querySelector('[name="onboarding-cert"]');cert.value='btl1';cert.dispatchEvent(new c.w.Event('change',{bubbles:true}));await tick();
 click(c,'[data-onboarding-action="next"]');await tick();
 assert.ok(c.d.querySelector('[name="onboarding-date"]'),'la fecha vacía debe mantener el primer paso');assert.match(c.d.querySelector('[data-onboarding-error]').textContent,/fecha válida/i);assert.equal(c.records.get('one').labs['professional-learning'],undefined);
 date.value='2027-01-20';date.dispatchEvent(new c.w.Event('change',{bubbles:true}));await tick();click(c,'[data-onboarding-action="next"]');await tick();click(c,'[data-onboarding-action="next"]');await tick();click(c,'[data-onboarding-action="finish"]');await tick();await c.close();
 assert.equal(c.records.get('one').labs['professional-onboarding'].completed,true);assert.equal(c.records.get('one').labs['professional-learning'].settings.targetDate,'2027-01-20');
});
