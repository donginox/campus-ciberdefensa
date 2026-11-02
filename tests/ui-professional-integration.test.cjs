'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');const {boot,click,input,tick}=require('./ui-harness.cjs');
async function until(check){for(let i=0;i<100;i++){if(check())return;await tick()}assert.ok(check(),'La operación integrada no terminó a tiempo.');}
test('las rutas nuevas guardan bitácora y análisis PCAP separados, y la prioridad actualiza el plan',async t=>{
 const c=await boot({professional:true,missions:true});t.after(()=>c.w.close());
 click(c,'[data-view="preparation"]');click(c,'[data-preparation-evidence="cc-controles"]');
 for(const [name,value]of Object.entries({environment:'VM propia de práctica',procedure:'Comparé dos muestras ficticias.',result:'El resultado fue reproducible.',interpretation:'La muestra no prueba autoría.',help:'independent',review:'pending'})){const el=c.d.querySelector('[name="'+name+'"]');el.value=value;el.dispatchEvent(new c.w.Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));}
 c.d.querySelector('.preparation-hub form').dispatchEvent(new c.w.Event('submit',{bubbles:true,cancelable:true}));await until(()=>c.records.get('one').labs['preparation-ledger']?.entries?.length===1);
 click(c,'[data-preparation-cert="ejpt"]');click(c,'[data-preparation-action="choose"]');await until(()=>c.records.get('one').labs['professional-learning']?.settings.certificationId==='ejpt'&&c.records.get('one').labs['preparation-ledger']?.selectedCertificationId==='ejpt');
 click(c,'[data-view="packet-analysis"]');for(const key of ['filters','timeline','evidence','interpretation','alternative'])input(c,'[data-packet-field="'+key+'"]',key==='evidence'?'Paquetes 1 y 2 contrastados con registros.':'Una interpretación propia de más de veinte caracteres.');click(c,'[data-packet-action="submit"]');await until(()=>!!c.records.get('one').labs['packet-casework']?.cases.guiado.attempt);assert.equal(c.d.querySelector('[data-packet-action="correction-export"]').disabled,false);
 click(c,'[data-view="assessment"]');assert.ok(c.d.querySelector('.assessment-hub'));click(c,'[data-view="learning"]');click(c,'[data-learning-view="history"]');assert.match(c.d.querySelector('h1').textContent,/avance/i);await c.close();assert.equal(c.records.get('one').labs['preparation-ledger'].entries.length,1);assert.equal(c.records.get('one').labs['packet-casework'].cases.transferencia.attempt,null);
});
test('la navegación integra plan, diagnóstico, sistemas, VM y portafolio con el perfil activo',async t=>{const c=await boot({professional:true,missions:true});t.after(()=>c.w.close());
 for(const [view,pattern]of [['learning',/plan|aprend|recorrido/i],['systems',/Windows.*Linux/i],['vms',/virtuales/i],['portfolio',/portafolio/i]]){click(c,`[data-view="${view}"]`);await tick();assert.match(c.d.querySelector('h1').textContent,pattern);}
 click(c,'[data-action="export-portfolio-pdf"]');await tick();const call=c.calls.find(x=>Array.isArray(x)&&x[0]==='portfolio');assert.equal(call[1].profileId,'one');assert.equal(call[1].format,'pdf');
});
test('buscar con CtrlK abre resultados de todo el campus y navega a la práctica encontrada',async t=>{const c=await boot({professional:true,missions:true});t.after(()=>c.w.close());c.d.dispatchEvent(new c.w.KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true,cancelable:true}));assert.equal(c.d.activeElement.id,'campus-global-query');input(c,'#campus-global-query','Windows procesos');assert.ok(c.d.querySelectorAll('[data-search-index]').length>0);const button=[...c.d.querySelectorAll('[data-search-index]')].find(e=>/Práctica/.test(e.textContent));assert.ok(button);button.click();await tick();assert.equal(c.d.querySelector('[role="dialog"]'),null);assert.match(c.d.querySelector('h1').textContent,/Procesos/);input(c,'#practice-notes','Conservé mi observación y sus límites.');await c.close();assert.equal(c.records.get('one').labs['practice-win-processes'].notes,'Conservé mi observación y sus límites.');});

const {record}=require('./ui-harness.cjs');
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};}
test('seleccionar perfil bloquea navegación y entradas desde antes del flush hasta adoptar',async t=>{
 const pendingSave=deferred(),selected=deferred();const c=await boot({professional:true,save:async(payload,records)=>{await pendingSave.promise;const next={...records.get(payload.id),study:payload.study,labs:payload.labs,revision:1};records.set(payload.id,next);return next;}});t.after(()=>c.w.close());
 c.records.set('two',record('two','Beto'));let selections=0;c.api.selectProfile=async()=>{selections++;await selected.promise;return c.records.get('two')};
 click(c,'[data-lesson]');click(c,'[data-step="notes"]');input(c,'#lesson-notes','Borrador previo a cambiar perfil');click(c,'[data-view="profiles"]');await tick();click(c,'[data-select-profile="two"]');
 assert.equal(c.d.querySelector('[data-view="learning"]').disabled,true);assert.equal(c.d.querySelector('#profile-name').disabled,true);assert.match(c.d.querySelector('#save-status').textContent,/Cambiando perfil/);
 click(c,'[data-view="learning"]');assert.ok(c.d.querySelector('#create-profile-form'));assert.equal(selections,0);pendingSave.resolve();await tick();assert.equal(selections,1);
 click(c,'[data-select-profile="two"]');c.d.querySelector('#create-profile-form').dispatchEvent(new c.w.Event('submit',{bubbles:true,cancelable:true}));assert.equal(selections,1);assert.equal(c.d.querySelector('#profile-name').disabled,true);
 selected.resolve();await tick();assert.match(c.d.querySelector('#active-profile').textContent,/Beto/);assert.equal(c.records.get('one').study.lessons['hardware-recursos'].notes,'Borrador previo a cambiar perfil');assert.equal(c.d.querySelector('[data-view="learning"]').disabled,false);
});
test('importar y renombrar también serializan navegación y operaciones de perfil',async t=>{
 const c=await boot({professional:true});t.after(()=>c.w.close());const imported=deferred();c.api.importBackup=async()=>imported.promise;
 click(c,'[data-view="settings"]');click(c,'[data-action="confirm-import"]');click(c,'[data-action="apply-import"]');await tick();assert.equal(c.d.querySelector('[data-view="profiles"]').disabled,true);click(c,'[data-view="profiles"]');assert.ok(c.d.querySelector('#pref-theme'));
 imported.resolve({canceled:true});await tick();assert.equal(c.d.querySelector('[data-view="profiles"]').disabled,false);
 click(c,'[data-view="profiles"]');await tick();const renamed=deferred();c.api.renameProfile=async()=>renamed.promise;input(c,'#rename-profile','Ana nueva');c.d.querySelector('#rename-profile-form').dispatchEvent(new c.w.Event('submit',{bubbles:true,cancelable:true}));await tick();assert.equal(c.d.querySelector('[data-view="learning"]').disabled,true);renamed.resolve({...c.records.get('one'),name:'Ana nueva'});await tick();assert.match(c.d.querySelector('#active-profile').textContent,/Ana nueva/);
});

test('un fallo al abrir perfil conserva el borrador anterior y desbloquea sus controles',async t=>{
 const c=await boot({professional:true});t.after(()=>c.w.close());c.records.set('two',record('two','Beto'));c.api.selectProfile=async()=>{throw Error('No se pudo leer el perfil')};
 click(c,'[data-view="systems"]');click(c,'[data-practice-open="win-processes"]');input(c,'#practice-notes','Observación que debe permanecer en Ana');click(c,'[data-view="profiles"]');await tick();click(c,'[data-select-profile="two"]');await tick();assert.match(c.d.querySelector('#active-profile').textContent,/Ana/);assert.equal(c.d.querySelector('[data-view="systems"]').disabled,false);click(c,'[data-view="systems"]');assert.equal(c.d.querySelector('#practice-notes').value,'Observación que debe permanecer en Ana');
});
test('un resultado SQL anterior a importar el mismo perfil no escribe en el nuevo alcance',async t=>{
 const c=await boot({professional:true});t.after(()=>c.w.close());const result=deferred();c.api.runSqlLab=()=>result.promise;c.api.importBackup=async()=>({profile:{...record('one','Ana'),revision:8}});
 click(c,'[data-view="labs"]');click(c,'[data-lab="sql-investigation"]');c.d.querySelector('#lab-form').dispatchEvent(new c.w.Event('submit',{bubbles:true,cancelable:true}));await tick();click(c,'[data-view="settings"]');click(c,'[data-action="confirm-import"]');click(c,'[data-action="apply-import"]');await tick();result.resolve({columns:['name'],rows:[['old result']],rowCount:1,truncated:false,elapsedMs:1});await tick();assert.equal(c.calls.filter(call=>call&&typeof call==='object'&&call.labs?.['sql-investigation']).length,0);
});
