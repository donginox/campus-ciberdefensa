const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
let Store; try { ({ ProfileStore: Store } = require('../desktop/store.cjs')); } catch {}
const core = require('../src/shared/study-core.js');
const {curriculum} = require('../src/content/campus.json');
async function setup(t) { assert.equal(typeof Store, 'function', 'ProfileStore must implement persistent profiles'); const dir = await fs.mkdtemp(path.join(os.tmpdir(),'campus-store-')); t.after(()=>fs.rm(dir,{recursive:true,force:true})); return {dir,store:new Store(dir)}; }
test('persists separate profiles and active selection across reopen', async t => {
 const {dir,store}=await setup(t); assert.deepEqual(await store.listProfiles(),[]);
 const a=await store.createProfile('Ana'),b=await store.createProfile('Luis');
 const study=core.createState(curriculum); study.preferences.theme='dark';
 const saved=await store.saveProfile({id:a.id,expectedRevision:a.revision,study,labs:{sql:{complete:true}}});
 assert.equal(saved.revision,2); await store.selectProfile(a.id);
 const reopened=new Store(dir); assert.equal((await reopened.getActiveProfile()).id,a.id); assert.deepEqual((await reopened.getProfile(b.id)).labs,{}); assert.equal((await reopened.getProfile(a.id)).labs.sql.complete,true);
});
test('serializes concurrent saves and rejects stale revision without losing winner', async t => {
 const {store}=await setup(t), p=await store.createProfile('Ana');
 const results=await Promise.allSettled([1,2].map(n=>store.saveProfile({id:p.id,expectedRevision:1,study:p.study,labs:{n}})));
 assert.equal(results.filter(x=>x.status==='fulfilled').length,1); assert.match(results.find(x=>x.status==='rejected').reason.message,/REVISION_CONFLICT/);
 assert.equal((await store.getProfile(p.id)).labs.n,1);
});
test('corrupt store is preserved and cannot be silently overwritten', async t => {
 const {dir,store}=await setup(t); await store.createProfile('Ana'); const file=path.join(dir,'profiles.json'); await fs.writeFile(file,'{broken');
 await assert.rejects(()=>new Store(dir).createProfile('Otra'),/CORRUPT_STORE/); assert.equal(await fs.readFile(file,'utf8'),'{broken');
 assert.ok(JSON.parse(await fs.readFile(file+'.bak','utf8')).profiles);
});
test('validates backup formats and strips local ids on export', async t => {
 const {store}=await setup(t),p=await store.createProfile('Ana'); const exported=JSON.parse(await store.exportBackup(p.id)); assert.equal(exported.app,'campus-ciberdefensa-desktop'); assert.equal(exported.profile.id,undefined);
 const imported=await store.importBackup(p.id,core.exportBackup(p.study)); assert.equal(imported.id,p.id); assert.equal(imported.revision,2);
 await assert.rejects(()=>store.importBackup(p.id,JSON.stringify({...exported,profile:{...exported.profile,labs:JSON.parse('{"__proto__":{}}')}})),/clave|key/i);
});
test('rejects oversized lab payloads, invalid study, and credentials', async t => {
 const {store}=await setup(t),p=await store.createProfile('Ana');
 for(const labs of [{a:'x'.repeat(1024*1024)},{accessToken:'secret'},JSON.parse('{"constructor":{}}')]) await assert.rejects(()=>store.saveProfile({id:p.id,expectedRevision:1,study:p.study,labs}));
 await assert.rejects(()=>store.saveProfile({id:p.id,expectedRevision:1,study:{version:99},labs:{}}));
 assert.equal((await store.getProfile(p.id)).revision,1);
});
test('malformed active-profile pointers are corruption and never get overwritten',async t=>{
 const {dir,store}=await setup(t);await store.createProfile('Ana');const file=path.join(dir,'profiles.json');const data=JSON.parse(await fs.readFile(file,'utf8'));data.activeProfileId='toString';const broken=JSON.stringify(data);await fs.writeFile(file,broken);
 await assert.rejects(()=>new Store(dir).createProfile('Otra'),/CORRUPT_STORE/);assert.equal(await fs.readFile(file,'utf8'),broken);
});
