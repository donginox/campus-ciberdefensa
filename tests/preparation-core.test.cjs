const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const file=require('node:path').join(__dirname,'../src/shared/preparation-core.js');
const core=fs.existsSync(file)?require(file):{};
const entry=(patch={})=>({certificationId:'cc',competencyId:'cc-controles',date:'2026-11-02',environment:'VM Linux propia',procedure:'Comparé dos digests del archivo ficticio.',result:'Los digests fueron iguales.',interpretation:'La igualdad no prueba autoría.',help:'independent',review:'pending',reviewNotes:'',...patch});
test('normalization drops foreign competency links and host fields and bounds imported records',()=>{
 assert.equal(typeof core.normalize,'function');
 const r=core.normalize({version:9,selectedCertificationId:'evil',entryDraft:entry({procedure:'x'.repeat(3000),rows:[{private:'host'}]}),entries:[{...entry(),id:'valid'},{...entry({competencyId:'ejpt-pivoting'}),id:'foreign'}],rows:[1]});
 assert.equal(r.version,1);assert.equal(r.selectedCertificationId,'cc');assert.equal(r.entries.length,1);assert.equal(r.entryDraft.procedure.length,2000);assert.ok(!('rows' in r));assert.ok(!('rows' in r.entryDraft));
 assert.equal(core.normalize({entries:Array.from({length:40},(_,i)=>({...entry(),id:'e-'+i}))}).entries.length,30);
});
test('evidence requires an explicit assistance and review declaration and a valid local calendar date',()=>{
 assert.equal(typeof core.add,'function');
 for(const patch of [{help:''},{review:''},{date:'2026-02-30'},{certificationId:'ejpt'},{result:''},{procedure:'x'.repeat(2001)}])assert.throws(()=>core.add(null,entry(patch)));
 const initial=core.normalize();const added=core.add(initial,entry());assert.equal(initial.entries.length,0);assert.equal(added.entries.length,1);assert.equal(added.entries[0].review,'pending');assert.equal(added.entryDraft.procedure,'');
});
test('editing preserves identity, removing is explicit and full ledgers never silently evict evidence',()=>{
 assert.equal(typeof core.update,'function');let r=core.add(null,entry());const id=r.entries[0].id;r=core.update(r,id,entry({interpretation:'Revisé el límite.',review:'tutor',reviewNotes:'Revisión docente declarada por mí.'}));assert.equal(r.entries[0].id,id);assert.equal(r.entries[0].interpretation,'Revisé el límite.');assert.equal(r.entries[0].review,'tutor');
 for(let i=1;i<30;i++)r=core.add(r,entry());assert.throws(()=>core.add(r,entry()),/30/);r=core.remove(r,id);assert.equal(r.entries.length,29);assert.ok(!r.entries.some(e=>e.id===id));
});
test('summary separates declared assistance and review without inventing mastery from prior activity',()=>{
 assert.equal(typeof core.summary,'function');let r=core.add(null,entry());r=core.add(r,entry({help:'guided',review:'self'}));const s=core.summary(r);assert.equal(s.total,2);assert.equal(s.independent,1);assert.equal(s.pendingReview,1);assert.equal(s.selfReviewed,1);assert.equal(s.tutorReviewed,0);assert.equal(s.byCertification.cc.entries,2);assert.ok(!('mastery' in s));assert.ok(!('ready' in s));
});
test('clearing a draft and malformed imported drafts remain recoverable rather than throwing',()=>{
 for(const entryDraft of [null,42,'bad',[],false]){const r=core.normalize({entryDraft});assert.equal(r.entryDraft.procedure,'');assert.equal(r.entries.length,0)}
});
