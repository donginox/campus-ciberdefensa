const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../src/shared/study-core.js');
const course={modules:[{id:'m',lessons:[{id:'l',quiz:[{id:'a',options:['a','b'],correct:1},{id:'b',options:['a','b'],correct:0},{id:'c',options:['a','b'],correct:1}]}]}]};
function requireApi(name){assert.equal(typeof C[name],'function',`Falta ${name}`);return C[name];}
// Catch migration resetting real learner work or treating roadmap milestones as course completion.
test('estado anterior incorpora accesibilidad y roadmap conservando todo el trabajo',()=>{
 const old=C.createState(course);delete old.preferences;delete old.roadmap;
 old.lessons.l.notes='Mi resumen con acentos y\nsegunda línea.';old.lessons.l.answer='Mi evidencia de Windows y Linux.';
 old.final.stations.e2='ACL observada';
 const next=C.normalizeState(old,course);
 assert.deepEqual(next.preferences,{theme:'system',font:'standard',contrast:'standard',spacing:'standard',motion:'system',focusMode:false});
 assert.deepEqual(next.roadmap,{tasks:{},notes:{}});
 assert.equal(next.lessons.l.notes,old.lessons.l.notes);assert.equal(next.lessons.l.answer,old.lessons.l.answer);
 assert.equal(next.final.stations.e2,'ACL observada');assert.equal(C.summary(next,course).total,1);
});
// Catch accessibility changes mutating previous snapshots, accepting unsupported themes or dropping lab notes.
test('preferencias accesibles se actualizan sin mutar notas y rechazan valores inválidos',()=>{
 const update=requireApi('updatePreferences'),old=C.updateLesson(C.createState(course),'l',{notes:'Nota original'});
 const next=update(old,{theme:'dark',font:'xl',contrast:'high',spacing:'wide',motion:'reduced',focusMode:true});
 assert.equal(old.preferences.theme,'system');assert.equal(next.preferences.theme,'dark');assert.equal(next.preferences.font,'xl');
 assert.equal(next.lessons.l.notes,'Nota original');assert.equal(next.preferences.focusMode,true);
 for(const patch of [{theme:'neon'},{focusMode:'yes'},{font:'99px'},{unknown:true}])assert.throws(()=>update(next,patch),/preferencia|valor|campo|modo/i);
});
// Catch export/import forgetting certification work, or corrupt roadmap input poisoning progress.
test('pasos y notas de certificación sobreviven copia y restauración separados de las clases',()=>{
 const task=requireApi('updateRoadmapTask'),note=requireApi('updateRoadmapNote');
 const old=C.createState(course),next=note(task(old,'cert-cc-principios',true),'cc','Me falta justificar IAM con un caso propio.');
 assert.equal(old.roadmap.tasks['cert-cc-principios'],undefined);
 const restored=C.importBackup(C.exportBackup(next),course);
 assert.equal(restored.roadmap.tasks['cert-cc-principios'],true);assert.equal(restored.roadmap.notes.cc,'Me falta justificar IAM con un caso propio.');
 assert.equal(C.summary(restored,course).completed,0);
 assert.throws(()=>task(next,'__proto__',true),/clave|paso|válid/i);assert.throws(()=>task(next,'cc',1),/boolean|valor|paso/i);
 const malformed=structuredClone(restored);malformed.roadmap.tasks.cc='aprobado';assert.throws(()=>C.normalizeState(malformed,course),/paso|boolean|valor/i);
 const wrong=structuredClone(restored);wrong.preferences.theme='red';assert.throws(()=>C.normalizeState(wrong,course),/preferencia|valor|modo/i);
});
