const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const base=path.join(__dirname,'..');
function core(){return require('../src/shared/objective-core.js')}
test('declared objective progress stays separate from mapped content and rejects unsafe or oversized records',()=>{
 const c=core(),r=c.emptyRecord();
 assert.equal(r.settings.certificationId,'security-plus-701');
 const next=c.updateObjective(r,'cc:1.1',{status:'demonstrated',note:'Vi el riesgo',nextAction:'Contrastar controles'});
 assert.equal(next.objectives['cc:1.1'].status,'demonstrated');assert.equal(r.objectives['cc:1.1'],undefined);
 assert.equal(c.summarize(next,'cc').declaredDemonstrated,1);
 assert.equal(c.summarize(r,'cc').declaredDemonstrated,0);
 assert.throws(()=>c.updateObjective(r,'inventado',{status:'studying'}));
 assert.throws(()=>c.updateObjective(r,'cc:1.1',{note:'x'.repeat(401)}),/400/);
 assert.throws(()=>c.validateRecord(JSON.parse('{"version":1,"__proto__":{}}')),/segur|clave/i);
 assert.throws(()=>c.validateRecord({...r,version:2}),/versión/i);
 assert.throws(()=>c.validateRecord({...r,objectives:{'cc:1.1':{status:'passed'}}}),/estado/i);
 const many={...r,objectives:Object.fromEntries(c.catalog.certifications.flatMap(c=>c.domains.flatMap(d=>d.objectives.map(o=>[o.id,{status:'studying',note:'á'.repeat(400),nextAction:'x'.repeat(180)}]))))};
 assert.throws(()=>c.validateRecord(many),/60 KB/);assert.equal(many.objectives['cc:1.1'].note.length,400);
});
test('all public objectives retain honest provenance, useful learning and valid actionable mappings',()=>{
 const c=core(),data=c.catalog,old=require('../src/content/campus.json'),sp=require('../src/content/system-practices.json'),m=require('../src/content/missions.json');
 const lessons=new Set(old.curriculum.modules.flatMap(x=>x.lessons.map(y=>y.id))),practices=new Set(sp.practices.map(x=>x.id)),campaigns=new Set(sp.campaigns.map(x=>x.id)),missions=new Set(m.rooms.map(x=>x.id));
 const objectives=data.certifications.flatMap(x=>x.domains.flatMap(d=>d.objectives));assert.equal(objectives.length,156);assert.equal(new Set(objectives.map(o=>o.id)).size,156);
 const seenLessons=new Set(),seenPractices=new Set(),seenCampaigns=new Set(),seenMissions=new Set();
 const html=fs.readFileSync(path.join(base,'assets/materials/objective-bridges.html'),'utf8');
 for(const o of objectives){
  assert.ok(o.description.length>40,o.id);assert.ok(o.activity.length>50,o.id);assert.ok(o.evidence.length>50,o.id);assert.ok(o.gap.length>30,o.id);assert.ok(o.nextAction.length>20,o.id);
  assert.ok(o.sourceUrl.startsWith('https://'));assert.ok(o.materialAnchor&&html.includes('id="'+o.materialAnchor+'"'));
  for(const id of o.lessonIds){assert.ok(lessons.has(id),id);seenLessons.add(id)}
  for(const id of o.practiceIds){assert.ok(practices.has(id),id);seenPractices.add(id)}
  for(const id of o.campaignIds){assert.ok(campaigns.has(id),id);seenCampaigns.add(id)}
  for(const id of o.missionIds){assert.ok(missions.has(id),id);seenMissions.add(id)}
 }
 assert.equal(seenLessons.size,24);assert.equal(seenPractices.size,10);assert.equal(seenCampaigns.size,3);assert.equal(seenMissions.size,3);
 const ccst=data.certifications.find(c=>c.id==='ccst-course');assert.match(ccst.coverageNote,/provisional/i);assert.ok(ccst.domains.every(d=>d.objectives.every(o=>o.officialId===null)));
 assert.ok(data.certifications.find(c=>c.id==='security-plus-801').upcoming);
});
test('filters isolate certification versions and user declarations; browser data and core agree',()=>{
 const c=core(),r=c.updateObjective(c.emptyRecord(),'cc:1.1',{status:'studying'});
 assert.deepEqual(c.filterObjectives(r,{certificationId:'cc',status:'studying'}).map(x=>x.id),['cc:1.1']);
 assert.equal(c.filterObjectives(r,{certificationId:'cc',search:'privacidad'}).some(x=>x.id==='cc:1.1'),true);
 assert.equal(c.filterObjectives(r,{certificationId:'security-plus-701'}).length,28);
 const context=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(base,'src/content/objectives.js'),'utf8'),context);vm.runInContext(fs.readFileSync(path.join(base,'src/shared/objective-core.js'),'utf8'),context);
 assert.equal(JSON.stringify(context.CAMPUS_OBJECTIVES),JSON.stringify(c.catalog));assert.equal(JSON.stringify(context.CampusObjectivesCore.emptyRecord()),JSON.stringify(c.emptyRecord()));
});
