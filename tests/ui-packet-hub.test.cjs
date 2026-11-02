const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const {JSDOM}=require('jsdom');
const base=path.join(__dirname,'..'),tick=()=>new Promise(r=>setTimeout(r,0));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}};
async function boot(options={}){
 const dom=new JSDOM('<!doctype html><html lang="es"><title>Campus</title><body><main></main></body></html>',{runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 for(const file of ['src/shared/packet-case-core.js','src/renderer/packet-hub.js']){assert.ok(fs.existsSync(path.join(base,file)),file+' is missing');w.eval(fs.readFileSync(path.join(base,file),'utf8'))}
 let profile='one',epoch=0;const records={},saves=[],calls=[];
 const view=w.PacketHub.create({getProfileId:()=>profile,getProfileEpoch:()=>epoch,getRecord:()=>records[profile+':packet-casework'],saveRecord:async(r,id,opts)=>{saves.push({r:JSON.parse(JSON.stringify(r)),id,opts});if(options.save)await options.save(r,id,opts);records[id+':packet-casework']=JSON.parse(JSON.stringify(r))},openMaterial:async p=>{calls.push(['open',p]);return options.open?options.open(p):{}},exportMaterial:async p=>{calls.push(['export',p]);return options.export?options.export(p):{}},announce:()=>{}});
 const root=w.document.querySelector('main'),mount=()=>{root.innerHTML=view.render();view.mount(root)};mount();await tick();
 return {w,d:w.document,view,root,mount,records,saves,calls,setProfile:(p,e=epoch)=>{profile=p;epoch=e},close:()=>{view.dispose();w.close()}};
}
const action=(c,id)=>{const el=c.d.querySelector('[data-packet-action="'+id+'"]');assert.ok(el,id);return el};
const input=(c,k,v)=>{const el=c.d.querySelector('[data-packet-field="'+k+'"]');el.value=v;el.dispatchEvent(new c.w.Event('input',{bubbles:true}))};
const fill=c=>{for(const k of ['filters','timeline','evidence','interpretation','alternative'])input(c,k,k==='evidence'?'Paquetes 1 y 2 contrastados con CSV.':'Una respuesta propia de más de veinte caracteres.')};
test('case reports persist separately and correction is enabled only after successful save',async t=>{
 let gate=null;const c=await boot({save:()=>gate?.promise});t.after(c.close);assert.equal(action(c,'correction-export').disabled,true);fill(c);await tick();
 gate=deferred();action(c,'submit').click();assert.equal(action(c,'correction-export').disabled,true);gate.resolve();await tick();assert.equal(action(c,'correction-export').disabled,false);assert.match(c.d.querySelector('details summary').textContent,/informe guardado/);
 action(c,'correction-export').click();await tick();assert.deepEqual(c.calls.at(-1),['export','packet-analysis/guiado/correccion.txt']);assert.equal(c.saves.at(-1).r.cases.guiado.guidanceUsed,true);
 c.d.querySelector('[data-packet-case="transferencia"]').click();assert.equal(c.d.querySelector('[data-packet-field="filters"]').value,'');assert.equal(action(c,'correction-export').disabled,true);
 c.d.querySelector('[data-packet-case="guiado"]').click();assert.match(c.d.querySelector('[data-packet-field="filters"]').value,/respuesta/);assert.equal(c.view.summary().declaredReports,1);
});
test('failed save retains draft and error across remount, retry completes declaration',async t=>{
 let fail=true;const c=await boot({save:()=>{if(fail)throw Error('Disco lleno')}});t.after(c.close);fill(c);action(c,'submit').click();await tick();c.mount();
 assert.match(c.d.querySelector('[data-packet-error]').textContent,/Disco lleno/);assert.match(c.d.querySelector('[data-packet-field="filters"]').value,/respuesta/);assert.equal(action(c,'correction-export').disabled,true);
 fail=false;action(c,'retry-save').click();await tick();assert.equal(action(c,'correction-export').disabled,false);assert.equal(c.d.querySelector('[data-packet-error]').hidden,true);
});
test('external actions use exact approved material paths and stale export completion cannot audit another profile',async t=>{
 const pending=deferred();const c=await boot({export:p=>p.endsWith('correccion.txt')?pending.promise:{}});t.after(c.close);action(c,'guide').click();await tick();action(c,'bundle').click();await tick();
 assert.deepEqual(c.calls.slice(0,2),[['open','packet-analysis.html'],['export','packet-analysis-pack.zip']]);fill(c);await tick();action(c,'submit').click();await tick();action(c,'correction-export').click();
 const count=c.saves.length;c.setProfile('one',1);c.mount();pending.resolve({});await tick();assert.equal(c.saves.length,count);assert.equal(c.view.summary().guidanceUsed,0);
});
test('export errors remain actionable after remount and cancellation does not claim assistance',async t=>{
 let fail=true;const c=await boot({export:()=>{if(fail)throw Error('Sin permiso');return {canceled:true}}});t.after(c.close);action(c,'bundle').click();await tick();c.mount();assert.match(c.d.querySelector('[data-packet-error]').textContent,/Sin permiso/);
 fail=false;action(c,'retry-action').click();await tick();assert.match(c.d.querySelector('[data-packet-status]').textContent,/cancelad/i);assert.equal(c.view.summary().guidanceUsed,0);
});
test('packet workflow has labelled fields, keyboard controls and no automated mastery claim',async t=>{
 const c=await boot();t.after(c.close);c.w.eval(require('axe-core').source);const result=await c.w.axe.run(c.d,{rules:{'color-contrast':{enabled:false}}});assert.equal(result.violations.length,0,result.violations.map(v=>v.id).join(', '));
 assert.match(c.root.textContent,/sintético/i);assert.match(c.root.textContent,/Wireshark/);assert.match(c.root.textContent,/dpkt/);assert.match(c.root.textContent,/dominio/i);
});
test('cancelled correction does not record help; opening it records only the chosen case',async t=>{
 const c=await boot({export:()=>({canceled:true})});t.after(c.close);fill(c);await tick();action(c,'submit').click();await tick();action(c,'correction-export').click();await tick();assert.equal(c.view.summary().guidanceUsed,0);
 action(c,'correction-open').click();await tick();assert.deepEqual(c.calls.at(-1),['open','packet-analysis/guiado/correccion.txt']);assert.equal(c.saves.at(-1).r.cases.guiado.guidanceOpened,true);assert.equal(c.saves.at(-1).r.cases.transferencia.guidanceUsed,false);
});
test('disposing an export ignores its late result and stale profile edits cannot persist',async t=>{
 const pending=deferred();const c=await boot({export:()=>pending.promise});t.after(c.close);fill(c);await tick();action(c,'submit').click();await tick();action(c,'correction-export').click();const count=c.saves.length;c.view.dispose();c.mount();pending.resolve({});await tick();assert.equal(c.saves.length,count);assert.equal(c.view.summary().guidanceUsed,0);
 c.setProfile('two');input(c,'filters','No debe aparecer en otro perfil local.');assert.equal(c.saves.length,count);c.mount();assert.equal(c.d.querySelector('[data-packet-field="filters"]').value,'');
});
test('guidance summary stays durable while its failed save remains pending and retryable',async t=>{
 let fail=false;const c=await boot({save:()=>{if(fail)throw Error('No se guardó la ayuda')}});t.after(c.close);fill(c);await tick();action(c,'submit').click();await tick();fail=true;action(c,'correction-open').click();await tick();
 assert.equal(c.records['one:packet-casework'].cases.guiado.guidanceUsed,false);assert.equal(c.view.summary().guidanceUsed,0);assert.equal(c.view.summary().cases.guiado.guidanceUsed,false);assert.match(c.root.textContent,/ayuda pendiente de guardar/);
 c.mount();assert.equal(c.view.summary().guidanceUsed,0);fail=false;action(c,'retry-save').click();await tick();assert.equal(c.view.summary().guidanceUsed,1);
});
test('failed correction retry keeps its original case after navigating to the other declared case',async t=>{
 let fail=true;const c=await boot({export:()=>{if(fail)throw Error('Reintentar el archivo original')}});t.after(c.close);fill(c);await tick();action(c,'submit').click();await tick();c.d.querySelector('[data-packet-case="transferencia"]').click();fill(c);await tick();action(c,'submit').click();await tick();c.d.querySelector('[data-packet-case="guiado"]').click();await tick();action(c,'correction-export').click();await tick();
 c.d.querySelector('[data-packet-case="transferencia"]').click();await tick();fail=false;action(c,'retry-action').click();await tick();
 assert.deepEqual(c.calls.at(-1),['export','packet-analysis/guiado/correccion.txt']);assert.equal(c.records['one:packet-casework'].cases.guiado.guidanceExported,true);assert.equal(c.records['one:packet-casework'].cases.transferencia.guidanceUsed,false);
});
