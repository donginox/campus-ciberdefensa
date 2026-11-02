const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const base=path.join(__dirname,'..');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject}};
const caps={start:false,open:true,stop:true,reset:true,replay:true,query:true,evidence:true,assess:true,contain:true};
const running=()=>({id:'soc-response',state:'running',message:'Servicio listo.',url:'http://127.0.0.1:43000/',capabilities:{...caps}});
async function boot(options={}){
 const dom=new JSDOM('<!doctype html><html lang="es"><title>Campus</title><body><main></main></body></html>',{runScripts:'outside-only',pretendToBeVisual:true,url:'https://campus.test'});
 const w=dom.window,calls=[],saved=[],announcements=[];let profileId='one';const records={};
 if(options.timer)w.setInterval=callback=>{options.timer.callback=callback;return 1};
 const api={labStatus:async args=>{calls.push(['status',args]);return running()},labStart:async()=>running(),labStop:async()=>({state:'stopped',capabilities:{start:true,reset:true}}),labReset:async()=>({canceled:true}),labOpen:async()=>({opened:true}),labEvents:async()=>({caseId:'SOC-3',events:[{id:'E1',time:'10:00',actor:'alfa',peer:'172.18.0.1',method:'POST',path:'/login',outcome:'failure',status:401}]}),labReplay:async()=>({caseId:'SOC-3',generated:6,events:[]}),labQuery:async()=>({caseId:'DB-3',columns:['source_ip','failures'],rows:[['192.0.2.9',4]],rowCount:1,assessment:{passed:true,feedback:'Agrupación correcta.'}}),labAssess:async()=>({caseId:'SOC-3',passed:true,feedback:'Correlación correcta.'}),labContain:async()=>({caseId:'SOC-3',blocked:true}),...options.api};
 assert.ok(fs.existsSync(path.join(base,'src/renderer/mission-hub.js')),'MissionHub UI module is missing');
 w.eval(fs.readFileSync(path.join(base,'src/content/missions.js'),'utf8'));w.eval(fs.readFileSync(path.join(base,'src/renderer/mission-hub.js'),'utf8'));
 const view=w.MissionHub.create({desktop:options.noDesktop?undefined:api,getProfileId:()=>profileId,getProgress:id=>records[profileId+':'+id],saveProgress:(id,record,expected)=>{saved.push({id,record:JSON.parse(JSON.stringify(record)),expected});records[expected+':'+id]=JSON.parse(JSON.stringify(record));return options.save?options.save(id,record,expected):Promise.resolve()},openLesson:id=>calls.push(['lesson',id]),openMaterial:id=>calls.push(['material',id]),announce:s=>announcements.push(s)});
 const root=w.document.querySelector('main');root.innerHTML=view.render();view.mount(root);
 const c={dom,w,d:w.document,view,root,api,calls,saved,records,announcements,setProfile:id=>{profileId=id},close:()=>{view.dispose();w.close()}};
 if(options.room)view.openRoom(options.room);await tick();return c;
}
function control(c,action){const node=c.d.querySelector(`[data-mission-action="${action}"]`);assert.ok(node,`missing ${action}`);return node}
function click(c,action){control(c,action).click()}
function input(c,selector,value){const el=c.d.querySelector(selector);assert.ok(el,selector);el.value=value;el.dispatchEvent(new c.w.Event('input',{bubbles:true}));return el}

test('three original mission rooms lead to staged tasks with answers hidden until a written attempt',async t=>{
 const c=await boot();t.after(c.close);assert.equal(c.d.querySelectorAll('[data-mission-room]').length,3);
 c.view.openRoom('web-investigation');await tick();assert.match(c.d.querySelector('h1').textContent,/web/i);
 const first=c.d.querySelector('[data-mission-task]'),id=first.dataset.missionTask;
 assert.equal(first.querySelector('[data-mission-action="hint"]').disabled,true);
 assert.equal(first.querySelector('[data-mission-action="solution"]').disabled,true);
 input(c,`[data-mission-answer="${id}"]`,'Mi hipótesis acotada.');
 first.querySelector('[data-mission-action="attempt"]').click();
 c.d.querySelector(`[data-mission-task="${id}"] [data-mission-action="hint"]`).click();
 assert.ok(c.d.querySelector(`[data-mission-task="${id}"] [data-mission-hint]`));
 c.d.querySelector(`[data-mission-task="${id}"] [data-mission-action="solution"]`).click();
 assert.ok(c.d.querySelector(`[data-mission-task="${id}"] [data-mission-solution]`));
 assert.equal(c.saved.at(-1).record.tasks[id].hintUsed,true);
 assert.equal(c.saved.at(-1).expected,'one');
});

test('manual task completion persists a declaration and never grants runtime assessment',async t=>{
 const c=await boot({room:'web-investigation'});t.after(c.close);const checkbox=c.d.querySelector('[data-mission-done]');checkbox.click();
 assert.equal(c.saved.at(-1).record.tasks[checkbox.dataset.missionDone].done,true);
 assert.equal(c.saved.at(-1).record.lastExecution,undefined);
 assert.match(c.d.querySelector('[data-mission-declaration]').textContent,/declaración/i);
 assert.match(c.d.querySelector('[data-mission-declaration]').textContent,/certifica/i);
});

test('SQL response merges evidence into the latest notes and does not persist large tables',async t=>{
 const pending=deferred();let sent;const c=await boot({room:'sql-investigation',api:{labQuery:args=>{sent=args;return pending.promise}}});t.after(c.close);
 input(c,'[data-mission-query]','SELECT source_ip, COUNT(*) AS failures FROM auth_events GROUP BY source_ip;');click(c,'query');
 input(c,'[data-mission-notes]','Anotación escrita mientras SQLite responde.');
 pending.resolve({caseId:'DB-9',columns:['source_ip','failures'],rows:[['192.0.2.9',4]],rowCount:1,assessment:{passed:true,feedback:'Correcto.'}});await tick();
 assert.deepEqual(JSON.parse(JSON.stringify(sent)),{profileId:'one',labId:'database-fundamentals',query:'SELECT source_ip, COUNT(*) AS failures FROM auth_events GROUP BY source_ip;'});
 const saved=c.saved.at(-1).record;assert.equal(saved.notes,'Anotación escrita mientras SQLite responde.');assert.equal(saved.lastExecution.caseId,'DB-9');assert.equal(saved.lastExecution.passed,true);assert.equal(saved.lastExecution.rowCount,1);assert.equal(saved.rows,undefined);assert.equal(saved.events,undefined);
 assert.match(c.d.querySelector('[data-mission-output]').textContent,/192\.0\.2\.9/);assert.match(c.d.querySelector('[data-mission-result]').textContent,/formativa/i);
});

test('SOC uses real replay, shows actors separately from HTTP peers, and checks only explicit answers',async t=>{
 const c=await boot({room:'soc-investigation',api:{labAssess:async args=>{c.calls.push(['assess',args]);return {caseId:'SOC-3',passed:false,feedback:'Revisá el conteo.'}}}});t.after(c.close);
 click(c,'events');await tick();const output=c.d.querySelector('[data-mission-output]');assert.match(output.textContent,/Actor ficticio/);assert.match(output.textContent,/Peer HTTP real/);assert.match(output.textContent,/172\.18\.0\.1/);
 input(c,'[data-mission-actor]','alfa');input(c,'[data-mission-failures]','4');click(c,'assess');await tick();
 assert.deepEqual(JSON.parse(JSON.stringify(c.calls.find(x=>x[0]==='assess')[1])),{profileId:'one',labId:'soc-response',actor:'alfa',failures:4});assert.match(c.d.querySelector('[data-mission-result]').textContent,/Revisá el conteo/);
 assert.equal(c.saved.at(-1).record.lastEvidence.caseId,'SOC-3');assert.equal(c.saved.at(-1).record.events,undefined);
});

test('runtime controls honor validated capabilities and block duplicate operations while keeping drafts editable',async t=>{
 const pending=deferred();let count=0;const c=await boot({room:'soc-investigation',api:{labReplay:()=>{count++;return pending.promise}}});t.after(c.close);
 assert.equal(control(c,'start').disabled,true);click(c,'replay');click(c,'replay');assert.equal(count,1);assert.equal(control(c,'stop').disabled,true);assert.equal(c.d.querySelector('[data-mission-notes]').disabled,false);assert.equal(c.d.querySelector('[data-mission-runtime]').getAttribute('aria-busy'),'true');
 pending.resolve({caseId:'SOC-5',generated:8,events:[]});await tick();assert.equal(control(c,'replay').disabled,false);assert.match(c.d.querySelector('[data-mission-result]').textContent,/8/);
});

test('unsafe or unavailable runtime never enables execution but room theory remains available',async t=>{
 const c=await boot({room:'soc-investigation',api:{labStatus:async()=>({state:'unsafe',message:'No es un recurso propio.',capabilities:{start:true,open:true,replay:true}})}});t.after(c.close);
 for(const action of ['start','open','stop','reset','replay','events','assess','contain'])assert.equal(control(c,action).disabled,true,action);
 assert.match(c.d.querySelector('[data-mission-status]').textContent,/recurso propio/);assert.ok(c.d.querySelector('[data-mission-answer]'));
});

test('profile change rejects stale SQL results and stale screen edits',async t=>{
 const pending=deferred();const c=await boot({room:'sql-investigation',api:{labQuery:()=>pending.promise}});t.after(c.close);
 click(c,'query');const before=c.saved.length;c.setProfile('two');input(c,'[data-mission-notes]','No debe guardarse en otro perfil.');
 pending.resolve({caseId:'OLD',columns:['secret'],rows:[['OLD RESULT']],rowCount:1,assessment:{passed:true,feedback:'old'}});await tick();
 assert.equal(c.saved.length,before);assert.doesNotMatch(c.root.textContent,/OLD RESULT/);
 c.root.innerHTML=c.view.render();c.view.mount(c.root);await tick();assert.equal(c.d.querySelector('[data-mission-notes]').value,'');
});

test('dispose and remount after an import discard pending results even with the same profile id',async t=>{
 const pending=deferred();const c=await boot({room:'sql-investigation',api:{labQuery:()=>pending.promise}});t.after(c.close);click(c,'query');
 c.view.dispose();c.records['one:sql-investigation']={version:1,tasks:{},notes:'Importado'};c.root.innerHTML=c.view.render();c.view.mount(c.root);await tick();
 pending.resolve({caseId:'STALE',columns:['old'],rows:[['old']],rowCount:1,assessment:{passed:true,feedback:'old'}});await tick();assert.equal(c.d.querySelector('[data-mission-notes]').value,'Importado');assert.equal(c.saved.filter(x=>x.record.lastExecution?.caseId==='STALE').length,0);
});

test('runtime error remains visible until a successful retry and native reset cancellation preserves notes',async t=>{
 let fails=true;const c=await boot({room:'soc-investigation',api:{labReplay:async()=>{if(fails)throw new Error('HTTP no responde.');return {caseId:'SOC-3',generated:3,events:[]}}}});t.after(c.close);
 input(c,'[data-mission-notes]','Preservar evidencia.');click(c,'replay');await tick();assert.equal(c.d.querySelector('[data-mission-error]').hidden,false);assert.match(c.d.querySelector('[data-mission-error]').textContent,/HTTP no responde/);assert.equal(c.d.activeElement,c.d.querySelector('[data-mission-error]'));
 click(c,'reset');await tick();assert.equal(c.d.querySelector('[data-mission-notes]').value,'Preservar evidencia.');fails=false;click(c,'replay');await tick();assert.equal(c.d.querySelector('[data-mission-error]').hidden,true);
});

test('save errors retain draft text, expose retry and enforce record limits',async t=>{
 let fail=true;const c=await boot({room:'web-investigation',save:()=>fail?Promise.reject(new Error('Disco lleno.')):Promise.resolve()});t.after(c.close);
 const id=c.d.querySelector('[data-mission-answer]').dataset.missionAnswer;input(c,`[data-mission-answer="${id}"]`,'x'.repeat(4100));input(c,'[data-mission-notes]','n'.repeat(20100));await tick();
 assert.equal(c.saved.at(-1).record.notes.length,20000);assert.equal(c.saved.at(-1).record.tasks[id].answer.length,4000);assert.match(c.d.querySelector('[data-mission-save-error]').textContent,/Disco lleno/);fail=false;click(c,'retry-save');await tick();assert.equal(c.d.querySelector('[data-mission-save-error]').hidden,true);
});

test('no native bridge reports desktop requirement',async t=>{
 const c=await boot({noDesktop:true,room:'soc-investigation'});t.after(c.close);assert.match(c.d.querySelector('[data-mission-status]').textContent,/escritorio/);assert.equal(control(c,'replay').disabled,true);
});

test('query and SOC form drafts survive leaving the room without claiming they were executed',async t=>{
 const c=await boot({room:'sql-investigation'});t.after(c.close);input(c,'[data-mission-query]','SELECT source_ip FROM auth_events;');input(c,'[data-mission-notes]','Borrador conservado.');
 c.view.dispose();c.root.innerHTML=c.view.render();c.view.mount(c.root);await tick();assert.equal(c.d.querySelector('[data-mission-query]').value,'SELECT source_ip FROM auth_events;');assert.equal(c.d.querySelector('[data-mission-notes]').value,'Borrador conservado.');assert.equal(c.saved.at(-1).record.lastExecution,undefined);
 c.view.openRoom('soc-investigation');await tick();input(c,'[data-mission-actor]','sonda');input(c,'[data-mission-failures]','7');c.view.openRoom('web-investigation');c.view.openRoom('soc-investigation');await tick();assert.equal(c.d.querySelector('[data-mission-actor]').value,'sonda');assert.equal(c.d.querySelector('[data-mission-failures]').value,'7');
});

test('a pending SQL result preserves a newer query draft and records the query actually executed',async t=>{
 const pending=deferred();const c=await boot({room:'sql-investigation',api:{labQuery:()=>pending.promise}});t.after(c.close);input(c,'[data-mission-query]','SELECT * FROM auth_events LIMIT 3;');click(c,'query');input(c,'[data-mission-query]','SELECT * FROM users LIMIT 2;');
 pending.resolve({caseId:'DB-4',columns:['a'],rows:[[1]],rowCount:1,assessment:{passed:false,feedback:'Revisá.'}});await tick();assert.equal(c.d.querySelector('[data-mission-query]').value,'SELECT * FROM users LIMIT 2;');assert.equal(c.saved.at(-1).record.lastExecution.query,'SELECT * FROM auth_events LIMIT 3;');assert.equal(c.saved.at(-1).record.drafts.query,'SELECT * FROM users LIMIT 2;');
});

test('query drafts enforce a byte limit while notes and failed saves stay recoverable',async t=>{
 const c=await boot({room:'sql-investigation'});t.after(c.close);input(c,'[data-mission-query]','á'.repeat(5000));const draft=c.saved.at(-1).record.drafts.query;assert.ok(Buffer.byteLength(draft,'utf8')<=8000);assert.equal(c.d.querySelector('[data-mission-query]').value,draft);
});

test('automatic status polling preserves an operation error until an explicit successful retry',async t=>{
 const timer={};const c=await boot({room:'soc-investigation',timer,api:{labReplay:async()=>{throw new Error('Falló HTTP.')}}});t.after(c.close);click(c,'replay');await tick();timer.callback();await tick();assert.equal(c.d.querySelector('[data-mission-error]').hidden,false);assert.match(c.d.querySelector('[data-mission-error]').textContent,/Falló HTTP/);click(c,'check');await tick();assert.equal(c.d.querySelector('[data-mission-error]').hidden,true);
});

test('runtime data is escaped and never becomes an HTML control',async t=>{
 const c=await boot({room:'sql-investigation',api:{labQuery:async()=>({caseId:'DB-4',columns:['<img src=x>'],rows:[['<button data-mission-action="reset">Injected</button>']],rowCount:1,assessment:{passed:false,feedback:'<script>bad()</script>'}})}});t.after(c.close);click(c,'query');await tick();assert.equal(c.d.querySelector('[data-mission-output] button'),null);assert.equal(c.d.querySelector('[data-mission-output] img'),null);assert.match(c.d.querySelector('[data-mission-output]').textContent,/<button/);assert.equal(c.d.querySelector('[data-mission-result] script'),null);
});

test('rooms and revealed guidance preserve labelled controls and a valid landmark hierarchy',async t=>{
 const c=await boot({noDesktop:true});t.after(c.close);c.w.eval(require('axe-core').source);
 for(const id of [null,'web-investigation','soc-investigation','sql-investigation']){
  if(id){c.view.openRoom(id);const task=c.d.querySelector('[data-mission-task]');input(c,'[data-mission-answer]','Intento para revisar el concepto.');task.querySelector('[data-mission-action="attempt"]').click();c.d.querySelector('[data-mission-action="hint"]').click();c.d.querySelector('[data-mission-action="solution"]').click()}
  const result=await c.w.axe.run(c.d,{rules:{'color-contrast':{enabled:false}}});assert.equal(result.violations.length,0,(id||'catalog')+': '+result.violations.map(v=>v.id).join(', '));
 }
});
