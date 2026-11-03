'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const Core=require('../src/shared/study-studio-core.js');
const Study=require('../src/shared/study-core.js');
const {curriculum}=require('../src/content/campus.json');
const {ProgressMerge}=require('../desktop/progress-merge.cjs');
const {ProfileStore,parseBackup}=require('../desktop/store.cjs');
const at='2026-11-03T12:00:00.000Z';
const clone=value=>JSON.parse(JSON.stringify(value));
function record(origin){
 let r=Core.addIssue(null,{prompt:origin+' saved question',explanation:origin+' saved explanation',confidence:origin==='local'?1:5},at);
 if(origin==='incoming')r=Core.addIssue(r,{prompt:'incoming second question',explanation:'incoming history that must stay whole'},at);
 r=Core.createSession(r,{minutes:origin==='local'?30:90,lessonId:origin==='local'?'hardware-recursos':'bits-unidades'},at);
 r=Core.checkpointSession(r,r.activeSessionId,{reflection:origin+' private active reflection'},at);
 r=Core.setNotebookDraft(r,{prompt:origin+' private draft',explanation:origin+' draft explanation'});
 return Core.updateWorkspace(r,{mode:'split',ratio:origin==='local'?35:65});
}
const profile=()=>({id:'local',revision:1,name:'Perfil local',study:Study.createState(curriculum),labs:{'study-studio':record('local')}});
const backup=(study,studio)=>JSON.stringify({app:'campus-ciberdefensa-desktop',version:1,savedAt:at,profile:{name:'Origen entrante',study,labs:{'study-studio':studio}}});

test('studio preview is read only and exposes one whole-record conflict for different active sessions',()=>{
 const local=profile(),incoming=record('incoming'),before=clone(local),incomingBefore=clone(incoming),source=backup(local.study,incoming),service=new ProgressMerge();
 const view=service.preview(local,source);
 assert.equal(view.conflicts.length,1);assert.equal(view.conflicts[0].kind,'laboratorio');assert.equal(view.conflicts[0].label,'labs / study-studio');
 assert.deepEqual(view.conflicts[0].local,before.labs['study-studio']);assert.deepEqual(view.conflicts[0].incoming,incomingBefore);
 assert.deepEqual(local,before);assert.deepEqual(incoming,incomingBefore);assert.equal(source,backup(local.study,incoming));
 view.conflicts[0].incoming.sessions[0].reflection='tampered preview copy';
 const merged=service.commit(local,view.id,{[view.conflicts[0].id]:'incoming'});
 assert.equal(merged.labs['study-studio'].sessions[0].reflection,'incoming private active reflection');assert.deepEqual(local,before);
});

for(const choice of ['local','incoming','both'])test(`studio ${choice} choice keeps an entire valid record without mixing active sessions`,()=>{
 const local=profile(),incoming=record('incoming'),before=clone(local),incomingBefore=clone(incoming),service=new ProgressMerge(),view=service.preview(local,backup(local.study,incoming));
 const result=service.commit(local,view.id,{[view.conflicts[0].id]:choice});
 assert.deepEqual(result.labs['study-studio'],choice==='incoming'?incomingBefore:before.labs['study-studio']);
 assert.doesNotThrow(()=>Core.validateRecord(result.labs['study-studio']));
 assert.deepEqual(local,before);assert.deepEqual(incoming,incomingBefore);
 if(choice==='both'){
  const archive=result.labs['merge-conflicts'].records;assert.equal(archive.length,1);assert.deepEqual(archive[0].path,['labs','study-studio']);assert.deepEqual(archive[0].incoming,incomingBefore);assert.equal(archive[0].retained,'local');
  assert.match(archive[0].incomingHash,/^[a-f0-9]{64}$/);assert.equal(archive[0].source.name,'Origen entrante');assert.equal(archive[0].source.savedAt,at);
  const next={...local,...result,revision:2},again=service.preview(next,backup(local.study,incoming));assert.equal(again.conflicts.length,0);assert.deepEqual(service.commit(next,again.id,{}).labs,result.labs);
 }else assert.equal(result.labs['merge-conflicts'],undefined);
 result.labs['study-studio'].sessions[0].reflection='detached commit result';assert.deepEqual(local,before);assert.deepEqual(incoming,incomingBefore);
});

test('new or identical studio records stay intact without requesting field-level decisions',()=>{
 for(const hasLocal of [false,true]){
  const local=profile(),incoming=record('local');if(!hasLocal)local.labs={};const before=clone(local),service=new ProgressMerge(),view=service.preview(local,backup(local.study,incoming));
  assert.equal(view.conflicts.length,0);assert.deepEqual(service.commit(local,view.id,{}).labs['study-studio'],incoming);assert.deepEqual(local,before);
 }
});

test('unknown future studio versions remain whole when preserving both alternatives',()=>{
 const local=profile(),incoming={...record('incoming'),version:99,futureEvidence:{text:'ORIGINAL_FUTURE_EVIDENCE',items:[1,2,3]}},before=clone(incoming),service=new ProgressMerge(),view=service.preview(local,backup(local.study,incoming));
 assert.equal(view.conflicts.length,1);const result=service.commit(local,view.id,{[view.conflicts[0].id]:'both'});
 assert.deepEqual(result.labs['study-studio'],local.labs['study-studio']);assert.deepEqual(result.labs['merge-conflicts'].records[0].incoming,before);assert.deepEqual(incoming,before);
});

test('generic profile storage and JSON backup roundtrip complete studio records including drafts and unknown versions',async t=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'campus-studio-merge-'));
 t.after(async()=>{assert.equal(path.dirname(directory),path.resolve(os.tmpdir()));assert.ok(path.basename(directory).startsWith('campus-studio-merge-'));await fs.rm(directory,{recursive:true,force:true})});
 const store=new ProfileStore(directory);let local=await store.createProfile('Studio fixture');
 for(const studio of [record('incoming'),{version:99,futureEvidence:'FUTURE_ORIGINAL_UNCHANGED',notebook:[{raw:'RAW_MALFORMED_UNCHANGED'}]}]){
  const before=clone(studio);local=await store.saveProfile({id:local.id,expectedRevision:local.revision,study:local.study,labs:{'study-studio':studio}});
  const text=await store.exportBackup(local.id);assert.deepEqual(JSON.parse(text).profile.labs['study-studio'],before);assert.deepEqual(parseBackup(text).labs['study-studio'],before);
  const recipient=await store.createProfile('Studio recipient'),restored=await store.importBackup(recipient.id,text);
  assert.deepEqual(restored.labs['study-studio'],before);assert.deepEqual((await new ProfileStore(directory).getProfile(recipient.id)).labs['study-studio'],before);assert.deepEqual(studio,before);
 }
});
