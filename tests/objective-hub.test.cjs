const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom'),axe=require('axe-core');
const root=path.join(__dirname,'..');
function setup(extra={}){
 const dom=new JSDOM('<!doctype html><html lang="es"><title>Campus</title><body><main id="root"></main></body></html>',{runScripts:'outside-only'}),w=dom.window;
 for(const f of ['src/content/objectives.js','src/shared/objective-core.js','src/renderer/objective-hub.js'])w.eval(fs.readFileSync(path.join(root,f),'utf8'));
 let stored=extra.seed?w.JSON.parse(JSON.stringify(extra.seed)):null,id='profile-a',epoch=1;
 const hub=w.CampusObjectiveHub.create({getProfileId:()=>id,getProfileEpoch:()=>epoch,getRecord:()=>stored,saveRecord:async r=>{stored=r},...extra});
 const page=w.document.querySelector('#root');page.innerHTML=hub.render();hub.mount(page);
 return {dom,w,hub,page,stored:()=>stored,switchProfile:()=>{id='profile-b';epoch++;stored=null;page.innerHTML=hub.render();hub.mount(page)}};
}
const settle=()=>new Promise(r=>setImmediate(r));
function expand(h,id){const d=[...h.page.querySelectorAll('details[data-objective-id]')].find(d=>d.dataset.objectiveId===id);d.open=true;d.dispatchEvent(new h.w.Event('toggle'));return d}
test('objective matrix filters real content, expands lazily and persists labelled drafts and declarations',async()=>{
 const h=setup();assert.equal(h.page.querySelectorAll('[data-objective-id]').length,28);assert.equal(h.page.querySelectorAll('textarea').length,0);
 const cert=h.page.querySelector('[name="certificationId"]');cert.value='cc';cert.dispatchEvent(new h.w.Event('change',{bubbles:true}));await settle();
 assert.equal(h.page.querySelectorAll('[data-objective-id]').length,19);
 const d=expand(h,'cc:1.1');assert.equal(d.querySelectorAll('textarea').length,2);
 const note=d.querySelector('[name="note"]');note.value='<img src=x onerror=alert(1)> evidencia';note.dispatchEvent(new h.w.Event('input',{bubbles:true}));await settle();assert.equal(h.stored().draft.note,note.value);
 const status=d.querySelector('[name="status"]');status.value='demonstrated';status.dispatchEvent(new h.w.Event('change',{bubbles:true}));
 d.querySelector('form').dispatchEvent(new h.w.Event('submit',{bubbles:true,cancelable:true}));await settle();
 assert.equal(h.stored().objectives['cc:1.1'].status,'demonstrated');assert.equal(h.stored().draft,null);assert.equal(h.page.querySelector('img'),null);
 assert.match(h.page.textContent,/declarad/i);h.hub.dispose();h.dom.window.close();
});
test('failed saves expose retry and stale completions cannot paint or replace another profile',async()=>{
 let reject,resolve,call=0;const saves=[];
 const h=setup({saveRecord:(r,id,options)=>{saves.push({r,id,options});call++;return new Promise((res,rej)=>{resolve=res;reject=rej})}});
 let d=expand(h,'security-plus-701:1.1'),n=d.querySelector('[name="note"]');n.value='No perder';n.dispatchEvent(new h.w.Event('input',{bubbles:true}));reject(Error('Disco lleno'));await settle();
 assert.match(h.page.querySelector('[role="alert"]').textContent,/Disco lleno/);h.page.querySelector('[data-objective-retry]').click();assert.equal(call,2);assert.equal(saves[1].options.retry,true);
 h.switchProfile();resolve();await settle();assert.equal(h.page.querySelector('[role="alert"]').textContent,'');assert.equal(h.page.querySelector('[data-objective-save]').textContent.includes('guardados'),false);
 assert.equal(h.stored(),null);h.hub.dispose();h.dom.window.close();
});
test('objective matrix and open editor have no serious accessibility violations',async()=>{
 const h=setup();expand(h,'security-plus-701:1.1');h.w.eval(axe.source);
 const results=await h.w.axe.run(h.w.document,{rules:{'color-contrast':{enabled:false}}});assert.deepEqual(Array.from(results.violations,v=>({id:v.id,impact:v.impact})),[]);
 h.hub.dispose();h.dom.window.close();
});
test('a restored draft remains editable after navigation and can be discarded without changing the saved declaration',async()=>{
 const c=require('../src/shared/objective-core.js');
 const seed=c.setDraft(c.emptyRecord(),'security-plus-701:1.1',{status:'studying',note:'Pendiente',nextAction:'Comparar controles'});
 const h=setup({seed});
 const note=h.page.querySelector('[name="note"]');assert.ok(note);assert.equal(note.disabled,false);assert.equal(note.value,'Pendiente');
 h.page.querySelector('[data-objective-discard]').click();await settle();assert.equal(h.stored().draft,null);assert.equal(h.stored().objectives['security-plus-701:1.1'],undefined);
 h.hub.dispose();h.dom.window.close();
});
test('opening another objective keeps only one editor and cannot overwrite an unrelated draft',()=>{
 const h=setup();expand(h,'security-plus-701:1.1');expand(h,'security-plus-701:1.2');
 assert.equal(h.page.querySelectorAll('[data-objective-form]').length,1);
 const note=h.page.querySelector('[name="note"]');note.value='Mi borrador';note.dispatchEvent(new h.w.Event('input',{bubbles:true}));
 expand(h,'security-plus-701:1.3');assert.equal(h.page.querySelectorAll('[data-objective-form]').length,1);assert.equal(h.page.querySelector('[name="note"]').value,'Mi borrador');
 h.hub.dispose();h.dom.window.close();
});

test('byte-limit rejected evidence survives filters and navigation remount until corrected or explicitly discarded',async()=>{
 const core=require('../src/shared/objective-core.js'),seed=core.emptyRecord(),id='security-plus-701:1.1';
 seed.draft={objectiveId:id,status:'studying',note:'previous',nextAction:''};
 const objectives=core.catalog.certifications.flatMap(c=>c.domains.flatMap(d=>d.objectives));
 let last;for(const o of objectives){seed.objectives[o.id]={status:'studying',note:'x'.repeat(400),nextAction:'x'.repeat(180)};last=o.id;if(Buffer.byteLength(JSON.stringify(seed))>=59990)break}
 let excess=Buffer.byteLength(JSON.stringify(seed))-59990;for(const key of ['nextAction','note']){const trim=Math.min(excess,seed.objectives[last][key].length);seed.objectives[last][key]=seed.objectives[last][key].slice(trim);excess-=trim}
 assert.equal(Buffer.byteLength(JSON.stringify(core.validateRecord(seed))),59990);
 const h=setup({seed}),latest='previous with the newest evidence that must not vanish';
 let note=h.page.querySelector('[name="note"]');note.value=latest;note.dispatchEvent(new h.w.Event('input',{bubbles:true}));
 assert.match(h.page.querySelector('[role="alert"]').textContent,/60 KB/);assert.equal(h.stored().draft.note,'previous');
 const filter=h.page.querySelector('[name="filterStatus"]');filter.value='studying';filter.dispatchEvent(new h.w.Event('change',{bubbles:true}));await settle();
 assert.equal(h.page.querySelector('[name="note"]').value,latest);assert.match(h.page.querySelector('[role="alert"]').textContent,/60 KB/);assert.doesNotMatch(h.page.querySelector('[data-objective-save]').textContent,/Últimos cambios guardados/);
 h.hub.dispose();h.page.innerHTML='Otra vista';h.page.innerHTML=h.hub.render();h.hub.mount(h.page);
 assert.equal(h.page.querySelector('[name="note"]').value,latest);assert.match(h.page.querySelector('[data-objective-save]').textContent,/sin guardar/);
 note=h.page.querySelector('[name="note"]');note.value='ok';note.dispatchEvent(new h.w.Event('input',{bubbles:true}));await settle();assert.equal(h.stored().draft.note,'ok');assert.equal(h.page.querySelector('[role="alert"]').textContent,'');
 note.value=latest;note.dispatchEvent(new h.w.Event('input',{bubbles:true}));h.page.querySelector('[data-objective-discard]').click();await settle();assert.equal(h.stored().draft,null);assert.equal(h.page.querySelector('[role="alert"]').textContent,'');
 h.hub.dispose();h.dom.window.close();
});
