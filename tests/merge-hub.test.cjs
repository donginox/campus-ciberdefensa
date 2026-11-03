'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const {JSDOM}=require('jsdom');const axe=require('axe-core');
const tick=()=>new Promise(r=>setTimeout(r,0));
const view=()=>({id:'preview-1',profileId:'one',revision:1,source:{name:'Kali <img src=x onerror=alert(1)>',savedAt:'2026-11-02',hash:'a'.repeat(64)},counts:{new:2,equal:3,conflict:1},conflicts:[{id:'conflict-1',kind:'borrador',label:'labs / learning / draft',local:{answer:'local'},incoming:{answer:'<script>bad()</script>'},choices:['local','incoming','both']}],alternatives:[]});
function boot(options={}){
 const dom=new JSDOM('<!doctype html><html lang="es"><head><title>Combinar progreso</title></head><body><main></main></body></html>',{runScripts:'outside-only'}),w=dom.window;w.eval(fs.readFileSync(path.join(__dirname,'../src/renderer/merge-hub.js'),'utf8'));
 let profile='one',epoch=1,merged=null;const calls=[];
 const desktop={mergePreview:async input=>{calls.push(['preview',input]);return {canceled:false,preview:view()}},mergeCommit:async input=>{calls.push(['commit',input]);return {profile:{id:'one',revision:2}}},mergeCancel:async input=>calls.push(['cancel',input]),...options.desktop};
 const hub=w.MergeHub.create({desktop,getProfileId:()=>profile,getProfileEpoch:()=>epoch,onMerged:p=>{merged=p},getRecord:()=>options.record||null,announce:message=>calls.push(['announce',message])});
 const root=w.document.querySelector('main');root.innerHTML=hub.render();hub.mount(root);return {dom,w,d:w.document,root,hub,calls,get merged(){return merged},switchProfile(){profile='two';epoch++}};
}
test('preview requires explicit per-record selection, commits only opaque decisions and escapes source content',async()=>{
 const c=boot();c.d.querySelector('[data-merge-action="preview"]').click();await tick();assert.ok(c.d.querySelector('fieldset legend'));assert.equal(c.d.activeElement,c.d.querySelector('[data-merge-heading]'));assert.equal(c.d.querySelector('img'),null);assert.equal(c.d.querySelector('script'),null);assert.equal(c.d.querySelector('[data-merge-action="commit"]').disabled,true);
 const radio=c.d.querySelector('input[value="both"]');radio.checked=true;radio.dispatchEvent(new c.w.Event('change',{bubbles:true}));assert.equal(c.d.querySelector('[data-merge-action="commit"]').disabled,false);
 const details=c.d.querySelector('[data-merge-detail]');details.open=true;details.dispatchEvent(new c.w.Event('toggle'));assert.match(details.textContent,/<script>bad/);assert.equal(c.d.querySelector('script'),null);
 c.d.querySelector('[data-merge-action="commit"]').click();await tick();assert.equal(c.merged.revision,2);const commit=c.calls.find(x=>x[0]==='commit')[1];assert.deepEqual(JSON.parse(JSON.stringify(commit)),{profileId:'one',previewId:'preview-1',decisions:{'conflict-1':'both'}});
});
test('cancel returns to empty state and canceled native selection never commits',async()=>{
 const c=boot();c.d.querySelector('[data-merge-action="preview"]').click();await tick();c.d.querySelector('[data-merge-action="cancel"]').click();await tick();assert.equal(c.d.querySelector('fieldset'),null);assert.equal(c.calls.filter(x=>x[0]==='commit').length,0);assert.equal(c.calls.filter(x=>x[0]==='cancel').length,1);
 const canceled=boot({desktop:{mergePreview:async()=>({canceled:true})}});canceled.d.querySelector('[data-merge-action="preview"]').click();await tick();assert.match(canceled.root.textContent,/cancelad/i);assert.equal(canceled.d.querySelector('fieldset'),null);
});
test('profile changes and disposal prevent stale preview painting or profile adoption',async()=>{
 let resolve;const c=boot({desktop:{mergePreview:()=>new Promise(r=>resolve=r)}});c.d.querySelector('[data-merge-action="preview"]').click();c.switchProfile();resolve({preview:view()});await tick();assert.equal(c.d.querySelector('fieldset'),null);
 let finish;const b=boot({desktop:{mergeCommit:()=>new Promise(r=>finish=r)}});b.d.querySelector('[data-merge-action="preview"]').click();await tick();const radio=b.d.querySelector('input[value="local"]');radio.checked=true;radio.dispatchEvent(new b.w.Event('change',{bubbles:true}));b.d.querySelector('[data-merge-action="commit"]').click();b.hub.dispose();finish({profile:{id:'one',revision:9}});await tick();assert.equal(b.merged,null);
});
test('large conflict lists paginate and full archives remain available without injecting huge DOM',async()=>{
 const p=view();p.conflicts=Array.from({length:30},(_,i)=>({...p.conflicts[0],id:'c'+i}));p.counts.conflict=30;
 const c=boot({desktop:{mergePreview:async()=>({preview:p})},record:{version:1,records:[{id:'saved',path:['labs','draft'],incoming:{answer:'complete alternate'},source:{name:'Kali',hash:'a'.repeat(64)}}]}});
 assert.match(c.root.textContent,/alternativas/i);c.d.querySelector('[data-merge-action="preview"]').click();await tick();assert.equal(c.d.querySelectorAll('fieldset').length,12);assert.ok(c.d.querySelector('[data-merge-action="next"]'));
 assert.equal(c.d.querySelectorAll('pre').length,0);c.d.querySelector('[data-merge-action="next"]').click();assert.equal(c.d.querySelectorAll('fieldset').length,12);
});
test('preview and empty states have accessible labels and no serious axe violations',async()=>{
 const c=boot();c.w.eval(axe.source);let results=await c.w.axe.run(c.d,{rules:{'color-contrast':{enabled:false}}});assert.equal(results.violations.length,0,results.violations.map(x=>x.id).join(','));
 c.d.querySelector('[data-merge-action="preview"]').click();await tick();results=await c.w.axe.run(c.d,{rules:{'color-contrast':{enabled:false}}});assert.equal(results.violations.length,0,results.violations.map(x=>x.id).join(','));
});
