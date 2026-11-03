const test=require('node:test'),assert=require('node:assert/strict');const{boot,click,tick}=require('./ui-harness.cjs');
test('review and progress exchange are reachable local campus views with profile-scoped native APIs',async t=>{
 const invoked=[];const c=await boot({professional:true,missions:true,advanced:true,apiOverrides:{mergePreview:async input=>{assert.equal(input.profileId,'one');invoked.push('merge');return{canceled:true}},tutorPreview:async input=>{assert.equal(input.profileId,'one');invoked.push('tutor');return{canceled:true}}}});t.after(()=>c.w.close());
 click(c,'[data-view="tutor"]');assert.match(c.d.querySelector('h1').textContent,/Devolución/);assert.match(c.d.querySelector('main').textContent,/informe|entrega/i);click(c,'[data-tutor-action="import"]');await tick();
 click(c,'[data-view="merge"]');assert.match(c.d.querySelector('h1').textContent,/Combinar/);click(c,'[data-merge-action="preview"]');await tick();assert.equal(c.records.get('one').revision,0);assert.equal(c.calls.length,0);assert.deepEqual(invoked,['tutor','merge']);
});
test('forensic workspace scopes the index API and stores its report draft in the active profile',async t=>{
 let observed=false;const c=await boot({professional:true,missions:true,advanced:true,apiOverrides:{forensicStatus:async({profileId})=>{assert.equal(profileId,'one');observed=true;return{ok:true,eventCount:0,detectionCount:0,nativeAvailable:false}},forensicIngest:async()=>({eventCount:8,detectionCount:2}),forensicQuery:async()=>({events:[],detections:[]})}});t.after(()=>c.w.close());
 click(c,'[data-view="forensics"]');await tick();assert.match(c.d.querySelector('h1').textContent,/Forense.*SIEM/);assert.equal(observed,true);
 const field=c.d.querySelector('[data-forensic-field="custody"]');assert.ok(field);field.value='Conservé una copia y su hash para documentar la custodia.';field.dispatchEvent(new c.w.Event('input',{bubbles:true}));
 for(let i=0;i<20&&!c.records.get('one').labs['forensic-casework'];i++)await tick();assert.ok(c.records.get('one').labs['forensic-casework']);
});
test('official objective matrix is reachable and retains its own draft through the profile save queue',async t=>{
 const c=await boot({professional:true,missions:true,advanced:true});t.after(()=>c.w.close());
 click(c,'[data-view="objectives"]');assert.match(c.d.querySelector('h1').textContent,/objetivos/i);
 assert.ok(c.d.querySelector('select'));assert.match(c.d.querySelector('main').textContent,/701|801/);
 assert.equal(c.calls.length,0);
 const detail=c.d.querySelector('details[data-objective-id]');detail.open=true;detail.dispatchEvent(new c.w.Event('toggle'));
 const note=detail.querySelector('textarea[name="note"]');assert.ok(note);note.value='Evidencia propia que quiero retomar en Kali.';note.dispatchEvent(new c.w.Event('input',{bubbles:true}));
 for(let i=0;i<20&&!c.records.get('one').labs['objective-progress']?.draft;i++)await tick();
 assert.equal(c.records.get('one').labs['objective-progress'].draft.note,note.value);
 click(c,'[data-view="home"]');click(c,'[data-view="objectives"]');assert.match(c.d.querySelector('main').textContent,/borrador/i);
});
test('network topology is reachable and reads only the active profile',async t=>{
 let observed=false;const c=await boot({professional:true,missions:true,advanced:true,apiOverrides:{topologyDoctor:async()=>({ready:false,message:'Motor de prueba'}),topologyStatus:async({profileId})=>{assert.equal(profileId,'one');observed=true;return{nodes:['workstation','router','server'].map(nodeId=>({nodeId,state:'missing',canCreate:true})),guestReady:false}},topologyCreate:async()=>{},topologyStart:async()=>{},topologyStop:async()=>{},topologySnapshot:async()=>{},topologyRestore:async()=>{}}});t.after(()=>c.w.close());
 click(c,'[data-view="topology"]');await tick();assert.match(c.d.querySelector('h1').textContent,/red|topología|Windows, salto/i);assert.equal(c.d.querySelectorAll('[data-topology-node]').length,3);assert.equal(observed,true);
});
