'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {ProgressMerge}=require('../desktop/progress-merge.cjs');
const clone=x=>JSON.parse(JSON.stringify(x));
const profile=()=>({id:'local',revision:1,study:{version:1,updatedAt:'2026-11-01T00:00:00Z',lessons:{a:{notes:'local'},b:{notes:'same'}}},labs:{}});
const backup=(study,labs={})=>JSON.stringify({name:'Kali <script>',savedAt:'2026-11-02T00:00:00Z',study,labs});
const service=options=>new ProgressMerge({parseBackup:JSON.parse,...options});
const choices=(p,value)=>Object.fromEntries(p.conflicts.map(c=>[c.id,value]));
test('preview is read only and merges separate lessons without timestamp winners',()=>{
 const p=profile(),before=clone(p),s=service(),view=s.preview(p,backup({...p.study,lessons:{a:{notes:'incoming'},b:{notes:'same'},c:{notes:'new'}}}));
 assert.deepEqual(p,before);assert.equal(view.counts.conflict,1);assert.equal(view.counts.new,1);assert.equal(view.conflicts[0].kind,'clase');
 assert.throws(()=>s.commit(p,view.id,{}),/decisi/i);
 const result=s.commit(p,view.id,choices(view,'local'));assert.equal(result.study.lessons.a.notes,'local');assert.equal(result.study.lessons.c.notes,'new');
});
test('history entries, attempts, sessions and reviews merge independently by stable identity',()=>{
 const p=profile();p.labs={'professional-learning':{version:1,history:[{id:'h1',score:1}],sessions:[{id:'s1',title:'one'}],reviews:{q1:{repetitions:1}},activeAttempt:{id:'a1',answers:{q1:1}}},'independent-assessment':{version:1,attempts:[{id:'a1',report:'local'}]}};
 const incoming=clone(p.labs);incoming['professional-learning'].history.push({id:'h2',score:2});incoming['professional-learning'].sessions.push({id:'s2',title:'two'});incoming['professional-learning'].reviews.q2={repetitions:0};incoming['professional-learning'].activeAttempt={id:'a2',answers:{q2:2}};incoming['independent-assessment'].attempts.push({id:'a2',report:'incoming'});
 const s=service(),v=s.preview(p,backup(p.study,incoming));assert.equal(v.conflicts.length,1);
 const result=s.commit(p,v.id,choices(v,'both'));assert.deepEqual(result.labs['professional-learning'].activeAttempt,{id:'a1',answers:{q1:1}});assert.equal(result.labs['professional-learning'].history.length,2);assert.equal(result.labs['professional-learning'].sessions.length,2);assert.equal(result.labs['independent-assessment'].attempts.length,2);assert.equal(result.labs['professional-learning'].reviews.q2.repetitions,0);
 assert.deepEqual(result.labs['merge-conflicts'].records[0].incoming,{id:'a2',answers:{q2:2}});
});
test('same ID with changed content requires a choice and both archives full alternate idempotently',()=>{
 const p=profile();p.labs={'preparation-ledger':{version:1,entries:[{id:'same',evidence:'local'}]}};
 const text=backup(p.study,{'preparation-ledger':{version:1,entries:[{id:'same',evidence:'<img src=x onerror=alert(1)>'}]}}),s=service(),v=s.preview(p,text);
 assert.equal(v.conflicts.length,1);const first=s.commit(p,v.id,choices(v,'both'));assert.equal(first.labs['preparation-ledger'].entries[0].evidence,'local');
 const archive=first.labs['merge-conflicts'].records[0];assert.equal(archive.incoming.evidence,'<img src=x onerror=alert(1)>');assert.match(archive.source.hash,/^[a-f0-9]{64}$/);assert.ok(archive.path);assert.match(archive.incomingHash,/^[a-f0-9]{64}$/);
 const p2={...p,...first,revision:2},again=s.preview(p2,text);assert.equal(again.conflicts.length,0);const second=s.commit(p2,again.id,{});assert.deepEqual(second.labs,first.labs);
 const fresh=s.preview(p,text);assert.equal(fresh.conflicts.length,1);
});
test('revision, profile content, opaque token and closed decisions reject tampering',()=>{
 const p=profile(),s=service(),v=s.preview(p,backup({...p.study,lessons:{a:{notes:'other'}}}));
 assert.throws(()=>s.commit({...p,revision:2},v.id,choices(v,'local')),/cambi|revisi/i);
 const changed=clone(p);changed.study.lessons.a.notes='edited';assert.throws(()=>s.commit(changed,v.id,choices(v,'local')),/cambi|revisi/i);
 assert.throws(()=>s.commit(p,'forged',{}),/preview|vista/i);
 assert.throws(()=>s.commit(p,v.id,{...choices(v,'local'),forged:'incoming'}),/decisi/i);
 assert.throws(()=>s.commit(p,v.id,choices(v,'newest')),/decisi/i);
 v.conflicts[0].incoming.notes='tampered';const result=s.commit(p,v.id,choices(v,'incoming'));assert.equal(result.study.lessons.a.notes,'other');
});
test('cancel invalidates preview without writing and expired tokens cannot commit',()=>{
 let time=0;const p=profile(),s=service({now:()=>time,ttlMs:10}),v=s.preview(p,backup(p.study));s.cancel(v.id);assert.throws(()=>s.commit(p,v.id,{}),/preview|vista/i);
 const next=s.preview(p,backup(p.study));time=11;assert.throws(()=>s.commit(p,next.id,{}),/venci|vista/i);assert.equal(p.revision,1);
});
test('caps fail clearly rather than truncating merged records',()=>{
 const p=profile();p.labs={'professional-learning':{history:Array.from({length:20},(_,i)=>({id:'h'+i}))}};const s=service(),v=s.preview(p,backup(p.study,{'professional-learning':{history:[{id:'h20'}]}}));
 assert.throws(()=>s.commit(p,v.id,{}),/l[ií]mite|capacidad/i);assert.equal(p.labs['professional-learning'].history.length,20);
 const large=service({maxConflictRecords:1}),conf=large.preview(p,backup({...p.study,lessons:{a:{notes:'other'},b:{notes:'also'}}},p.labs));assert.throws(()=>large.commit(p,conf.id,choices(conf,'both')),/l[ií]mite|capacidad/i);
});
test('untrusted keys, duplicate array IDs and unsupported collection shapes are rejected or conflict atomically',()=>{
 const p=profile(),s=service();assert.throws(()=>s.preview(p,'{"name":"x","study":{},"labs":{"__proto__":{}}}'),/clave/i);
 assert.throws(()=>s.preview(p,backup(p.study,{'professional-learning':{history:[{id:'x'},{id:'x',score:2}]}})),/repetid|duplicad/i);
 p.labs.unknown={history:[{id:'a'}]};const v=s.preview(p,backup(p.study,{unknown:{history:[{id:'b'}]}}));assert.equal(v.conflicts.length,1);
});
test('metadata counters do not cause future attempts to reuse IDs and source normalization does not mutate records',()=>{
 const p=profile();p.labs={'professional-learning':{version:1,attemptSequence:2,activeAttempt:null,history:[]}};const s=service(),v=s.preview(p,backup(p.study,{'professional-learning':{version:1,attemptSequence:9,activeAttempt:null,history:[]}}));
 assert.equal(v.conflicts.length,1);const r=s.commit(p,v.id,choices(v,'incoming'));assert.equal(r.labs['professional-learning'].attemptSequence,9);
});
test('a failed persistence can retry the same preview and archiving never mutates the source profile',()=>{
 const p=profile(),s=service(),text=backup({...p.study,lessons:{a:{notes:'incoming one'},b:{notes:'same'}}}),v=s.preview(p,text),decision=choices(v,'both');
 const first=s.commit(p,v.id,decision);assert.deepEqual(s.commit(p,v.id,decision),first);assert.equal(p.labs['merge-conflicts'],undefined);
 const p2={...p,...first,revision:2},before=clone(p2),next=s.preview(p2,backup({...p.study,lessons:{a:{notes:'incoming two'},b:{notes:'same'}}}));
 const result=s.commit(p2,next.id,choices(next,'both'));assert.equal(result.labs['merge-conflicts'].records.length,2);assert.deepEqual(p2,before);
 assert.throws(()=>s.commit(p2,v.id,decision),/cambi|revisi/i);
});
test('a forged archive ID cannot hide a newly selected incoming alternative',()=>{
 const p=profile(),s=service(),wanted=backup({...p.study,lessons:{a:{notes:'must remain recoverable'},b:{notes:'same'}}});
 const genuine=s.preview(p,wanted),saved=s.commit(p,genuine.id,choices(genuine,'both')).labs['merge-conflicts'].records[0];
 const different=s.preview(p,backup({...p.study,lessons:{a:{notes:'unrelated'},b:{notes:'same'}}})),forged=s.commit(p,different.id,choices(different,'both')).labs['merge-conflicts'].records[0];
 forged.id=saved.id;const malicious=backup({...p.study,lessons:{a:{notes:'must remain recoverable'},b:{notes:'same'}}},{'merge-conflicts':{version:1,records:[forged]}});
 assert.throws(()=>s.preview(p,malicious),/conflictos.*inválid|identidad|huella/i);assert.equal(p.study.lessons.a.notes,'local');assert.equal(p.labs['merge-conflicts'],undefined);
});
test('a colliding archive ID with changed origin metadata is rejected rather than skipping the new both copy',()=>{
 const p=profile(),s=service(),study={...p.study,lessons:{a:{notes:'incoming alternate'},b:{notes:'same'}}},first=s.preview(p,backup(study)),archive=s.commit(p,first.id,choices(first,'both')).labs['merge-conflicts'];
 archive.records[0].source.name='origin metadata changed';const next=s.preview(p,backup(study,{'merge-conflicts':archive}));
 assert.throws(()=>s.commit(p,next.id,choices(next,'both')),/colisi|identificador.*contenido/i);assert.equal(p.labs['merge-conflicts'],undefined);
});

function tutorRows(count,{offset=0,large=false}={}){
 const Packet=require('../src/shared/packet-case-core.js'),{TutorExchange}=require('../desktop/tutor-exchange.cjs'),at='2026-11-02T10:00:00.000Z';
 const p=profile();let packetRecord=Packet.updateDraft(null,'guiado',Object.fromEntries(Packet.fields.map(k=>[k,'Análisis propio del paquete 3 con evidencia y límites documentados.'])));p.labs['packet-casework']=Packet.submit(packetRecord,'guiado',at);
 const exchange=new TutorExchange(),packet=exchange.exportPackage(p,'packet-casework:guiado');
 for(let i=0;i<count;i++){
  const feedback={app:'campus-tutor-feedback',version:1,feedbackId:'feedback-'+(offset+i),packageId:packet.packageId,contentHash:packet.contentHash,sourceId:packet.content.source.id,createdAt:at,reviewer:{name:'Tutor',identity:'declared-unverified'},comments:[{section:Packet.fields[0],comment:'Separá evidencia de interpretación.'}],rubric:large?Array.from({length:8},()=>({criterion:'Evidencia',rating:'developing',comment:'x'.repeat(1000)})):[{criterion:'Evidencia',rating:'developing',comment:'Explicá el procedimiento.'}],nextPractice:large?'x'.repeat(2000):'Compará otro caso propio.'};
  p.labs['tutor-reviews']=exchange.commit(p,exchange.preview(p,JSON.stringify(feedback)).previewId).record;p.revision++;
 }
 return clone(p.labs['tutor-reviews']);
}
test('valid tutor feedback histories merge by feedback ID and changed same-ID rows require explicit choice',()=>{
 const p=profile(),s=service();p.labs['tutor-reviews']=tutorRows(1);const incoming=tutorRows(1,{offset:1});
 const view=s.preview(p,backup(p.study,{'tutor-reviews':incoming}));assert.equal(view.conflicts.length,0);const merged=s.commit(p,view.id,{});
 assert.deepEqual(merged.labs['tutor-reviews'].reviews.map(r=>r.feedback.feedbackId),['feedback-0','feedback-1']);
 const changed=clone(p.labs['tutor-reviews']);changed.reviews[0].feedback.nextPractice='Una práctica distinta.';changed.reviews[0].feedbackHash=require('node:crypto').createHash('sha256').update(require('../src/shared/tutor-core.js').canonical(changed.reviews[0].feedback)).digest('hex');
 const conflict=s.preview(p,backup(p.study,{'tutor-reviews':changed}));assert.equal(conflict.conflicts.length,1);assert.match(conflict.conflicts[0].label,/reviews.*feedback-0/);const kept=s.commit(p,conflict.id,choices(conflict,'both'));assert.deepEqual(kept.labs['merge-conflicts'].records[0].incoming,changed.reviews[0]);
 const again=s.preview({...p,...merged,revision:p.revision+1},backup(p.study,{'tutor-reviews':incoming}));assert.equal(again.conflicts.length,0);assert.equal(s.commit({...p,...merged,revision:p.revision+1},again.id,{}).labs['tutor-reviews'].reviews.length,2);
});
test('tutor merge rejects tampered hashes, duplicate feedback IDs, row overflow and byte overflow without truncation',()=>{
 const p=profile(),s=service();p.labs['tutor-reviews']=tutorRows(7);let incoming=tutorRows(6,{offset:7});let view=s.preview(p,backup(p.study,{'tutor-reviews':incoming}));assert.throws(()=>s.commit(p,view.id,{}),/12|límite/);
 p.labs['tutor-reviews']=tutorRows(6,{large:true});incoming=tutorRows(6,{offset:6,large:true});view=s.preview(p,backup(p.study,{'tutor-reviews':incoming}));assert.throws(()=>s.commit(p,view.id,{}),/tamaño|límite|espacio/);assert.equal(p.labs['tutor-reviews'].reviews.length,6);
 const bad=tutorRows(1);bad.reviews[0].feedback.nextPractice='Alterado sin nueva huella';assert.throws(()=>s.preview(profile(),backup(p.study,{'tutor-reviews':bad})),/huella/);
 const duplicate=tutorRows(1);duplicate.reviews.push(clone(duplicate.reviews[0]));assert.throws(()=>s.preview(profile(),backup(p.study,{'tutor-reviews':duplicate})),/duplicad|repetid/);
});
test('merge accepts twelve assessment attempts and rejects a thirteenth or excess bytes without trimming',()=>{
 const p=profile(),s=service();p.labs['independent-assessment']={version:1,attempts:Array.from({length:6},(_,i)=>({id:'attempt-'+i}))};
 const labs={'independent-assessment':{version:1,attempts:Array.from({length:6},(_,i)=>({id:'attempt-'+(i+6)}))}},view=s.preview(p,backup(p.study,labs));assert.equal(s.commit(p,view.id,{}).labs['independent-assessment'].attempts.length,12);
 labs['independent-assessment'].attempts.push({id:'attempt-12'});const overflow=s.preview(p,backup(p.study,labs));assert.throws(()=>s.commit(p,overflow.id,{}),/12|límite/);
 labs['independent-assessment']={version:1,attempts:[{id:'large',report:'x'.repeat(350000)}]};const bytes=s.preview(profile(),backup(p.study,labs));assert.throws(()=>s.commit(profile(),bytes.id,{}),/350000|límite/);
});
test('native and legacy merge reject normalization that drops unknown lesson evidence before preview',()=>{
 const Study=require('../src/shared/study-core.js'),{curriculum}=require('../src/content/campus.json'),study=Study.createState(curriculum),p={...profile(),study},s=new ProgressMerge();
 const incoming=clone(study);incoming.lessons['future-lesson']={notes:'Only surviving copy of future lesson evidence.'};
 const native=JSON.stringify({app:'campus-ciberdefensa-desktop',version:1,savedAt:'2026-11-02T10:00:00.000Z',profile:{name:'Other machine',study:incoming,labs:{}}});
 const legacy=Study.exportBackup(incoming);
 for(const text of [native,legacy])assert.throws(()=>s.preview(p,text),/compatib.*future-lesson|future-lesson.*compatib/i);
 assert.equal(s.pending.size,0);assert.equal(p.study.lessons['future-lesson'],undefined);
 const compatible=JSON.stringify({app:'campus-ciberdefensa-desktop',version:1,savedAt:'2026-11-02T10:00:00.000Z',profile:{name:'Other machine',study,labs:{}}});assert.equal(s.preview(p,compatible).counts.conflict,0);
});
