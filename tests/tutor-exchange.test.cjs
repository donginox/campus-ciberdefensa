'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const fs=require('node:fs');
const vm=require('node:vm');
const Assessment=require('../src/shared/assessment-core.js');
const Packet=require('../src/shared/packet-case-core.js');
const modulePath='../desktop/tutor-exchange.cjs';
const load=()=>{assert.ok(fs.existsSync(require('node:path').join(__dirname,modulePath)),'TutorExchange must implement the review exchange');return require(modulePath)};
const at='2026-11-02T10:00:00.000Z';
const clone=v=>JSON.parse(JSON.stringify(v));
function fixture(){
 const setup={environment:'Entorno de laboratorio propio autorizado.',baseline:'Línea de base documentada para esta práctica.',scope:'Objetivo ficticio autorizado para la evaluación.',scopeConfirmed:true};
 let assessment=Assessment.start(null,Assessment.CASES[0],setup,at);
 assessment=Assessment.update(assessment,'attempt-1',Object.fromEntries(Assessment.REPORT_FIELDS.map(k=>[k,'Síntesis propia con evidencia y límites declarados.'])));
 assessment=Assessment.update(assessment,'attempt-1',{independence:'independent',reviewStatus:'self-declared'});
 assessment=Assessment.submit(assessment,'attempt-1',at);
 let packets=Packet.updateDraft(null,'guiado',Object.fromEntries(Packet.fields.map(k=>[k,k==='evidence'?'Observé el paquete 3 del laboratorio propio.':'Síntesis del análisis propio con límites documentados.'])));
 packets=Packet.submit(packets,'guiado',at);
 return {id:'profile-one',revision:3,labs:{'independent-assessment':assessment,'packet-casework':packets,'system-events':{rows:[{password:'HOST_SECRET'}]}}};
}
function feedback(packet,patch={}){return {app:'campus-tutor-feedback',version:1,feedbackId:'feedback-uno',packageId:packet.packageId,contentHash:packet.contentHash,sourceId:packet.content.source.id,createdAt:at,reviewer:{name:'Tutora declarada <img src=x>',identity:'declared-unverified'},comments:[{section:Object.keys(packet.content.sections)[0],comment:'Separá lo observado de la interpretación.'}],rubric:[{criterion:'Evidencia y trazabilidad',rating:'developing',comment:'Agregá una referencia reproducible.'}],nextPractice:'Repetí la práctica con un caso nuevo y documentá límites.',...patch};}
test('exports only submitted frozen sections and canonical SHA256 provenance, never drafts or host rows',()=>{
 const {TutorExchange}=load(),exchange=new TutorExchange(),profile=fixture(),before=clone(profile);
 profile.labs['independent-assessment'].attempts[0].hostRows=[{password:'secret'}];
 profile.labs['packet-casework'].cases.guiado.draft.evidence='DRAFT_SECRET';
 const packet=exchange.exportPackage(profile,'independent-assessment:attempt-1');
 const core=require('../src/shared/tutor-core.js');
 assert.equal(packet.content.source.id,'independent-assessment:attempt-1');
 assert.equal(packet.content.source.submittedAt,at);
 assert.equal(packet.contentHash,createHash('sha256').update(core.canonical(packet.content),'utf8').digest('hex'));
 assert.equal(packet.packageId,'pkg-'+packet.contentHash);
 assert.ok(Object.isFrozen(packet.content.sections));
 assert.equal(JSON.stringify(packet).includes('HOST_SECRET'),false);
 assert.equal(JSON.stringify(packet).includes('hostRows'),false);
 assert.equal(JSON.stringify(exchange.exportPackage(profile,'packet-casework:guiado')).includes('DRAFT_SECRET'),false);
 assert.deepEqual(profile.labs['independent-assessment'].attempts[0].report,before.labs['independent-assessment'].attempts[0].report);
 assert.deepEqual(exchange.exportPackage(profile,'independent-assessment:attempt-1'),packet,'re-export must keep the same review target');
 profile.labs['independent-assessment']=Assessment.guidance(profile.labs['independent-assessment'],'attempt-1',at);
 assert.deepEqual(exchange.exportPackage(profile,'independent-assessment:attempt-1'),packet,'later guidance cannot change the immutable review target');
});
test('drafts cannot be exported and reports with the same attempt ID in another source cannot receive feedback',()=>{
 const {TutorExchange}=load(),exchange=new TutorExchange(),profile=fixture();
 const packet=exchange.exportPackage(profile,'independent-assessment:attempt-1');
 assert.throws(()=>exchange.exportPackage(profile,'attempt-1'),/informe|entregado|origen/i);
 profile.labs['independent-assessment'].attempts[0].submittedAt=null;
 assert.throws(()=>exchange.exportPackage(profile,'independent-assessment:attempt-1'),/informe|entregado/i);
 assert.throws(()=>exchange.preview(profile,JSON.stringify(feedback(packet))),/informe|entregado/i);
});
test('preview is read-only, commit freezes the original report and feedback preserves declared/unverified identity',()=>{
 const {TutorExchange}=load(),exchange=new TutorExchange(),profile=fixture(),before=clone(profile);
 const packet=exchange.exportPackage(profile,'independent-assessment:attempt-1'),incoming=feedback(packet);
 const preview=exchange.preview(profile,JSON.stringify(incoming));
 assert.deepEqual(profile,before);
 assert.ok(preview.previewId&&!preview.duplicate);
 const result=exchange.commit(profile,preview.previewId);
 assert.equal(result.expectedRevision,3);
 assert.equal(result.record.reviews.length,1);
 assert.deepEqual(result.record.reviews[0].packet,packet);
 assert.equal(result.record.reviews[0].feedback.reviewer.identity,'declared-unverified');
 assert.deepEqual(profile,before,'only root is allowed to persist');
 incoming.comments[0].comment='CHANGED';preview.feedback.comments[0].comment='CHANGED';
 assert.notEqual(result.record.reviews[0].feedback.comments[0].comment,'CHANGED');
 const changed=clone(profile);changed.revision++;
 assert.throws(()=>exchange.commit(changed,preview.previewId),/cambi|preview|vista previa/i);
 const altered=clone(profile);altered.labs['independent-assessment'].attempts[0].report.findings='Cambio posterior del informe aunque no cambió la revisión.';
 assert.throws(()=>exchange.commit(altered,preview.previewId),/cambi|huella|informe/i);
 assert.throws(()=>exchange.commit({...profile,id:'profile-two'},preview.previewId),/perfil|previa/i);
});
test('rejects tampering, incompatible versions, unsafe keys, oversized feedback and unknown sections',()=>{
 const {TutorExchange}=load(),exchange=new TutorExchange(),profile=fixture();
 const packet=exchange.exportPackage(profile,'independent-assessment:attempt-1'),base=feedback(packet);
 for(const patch of [{version:2},{contentHash:'0'.repeat(64)},{packageId:'pkg-'+'0'.repeat(64)},{sourceId:'packet-casework:guiado'},{comments:[{section:'not-a-section',comment:'texto'}]},{reviewer:{name:'Tutor',identity:'verified'}}])assert.throws(()=>exchange.preview(profile,JSON.stringify({...base,...patch})),/versión|formato|huella|informe|sección|identidad|paquete/i);
 assert.throws(()=>exchange.preview(profile,JSON.stringify({...base,nextPractice:'x'.repeat(500000)})),/tamaño|supera|límite/i);
 assert.throws(()=>exchange.preview(profile,JSON.stringify(base).replace('"version":1','"version":1,"__proto__":{}')),/clave|permitid/i);
 assert.throws(()=>exchange.preview(profile,JSON.stringify({...base,hostRows:[]})),/campo|permitid|formato/i);
});
test('duplicate import is idempotent while conflicting feedback IDs and storage overflow never discard history',()=>{
 const {TutorExchange}=load(),exchange=new TutorExchange(),profile=fixture(),packet=exchange.exportPackage(profile,'packet-casework:guiado');
 const initial=feedback(packet),first=exchange.commit(profile,exchange.preview(profile,JSON.stringify(initial)).previewId);
 profile.labs['tutor-reviews']=first.record;profile.revision++;
 const repeat=exchange.preview(profile,JSON.stringify(initial));
 assert.equal(repeat.duplicate,true);
 assert.deepEqual(exchange.commit(profile,repeat.previewId).record,first.record);
 assert.throws(()=>exchange.preview(profile,JSON.stringify({...initial,nextPractice:'Una devolución distinta con el mismo identificador.'})),/identificador|duplicad|conflicto/i);
 for(let i=2;i<=12;i++){
  const p=exchange.preview(profile,JSON.stringify({...initial,feedbackId:'feedback-'+i}));
  profile.labs['tutor-reviews']=exchange.commit(profile,p.previewId).record;profile.revision++;
 }
 const before=clone(profile.labs['tutor-reviews']);
 assert.throws(()=>exchange.preview(profile,JSON.stringify({...initial,feedbackId:'feedback-13'})),/espacio|límite|doce|12/i);
 assert.deepEqual(profile.labs['tutor-reviews'],before);
});
test('browser UMD canonical serialization matches native for reordered keys and Unicode',()=>{
 load();const source=fs.readFileSync(require('node:path').join(__dirname,'../src/shared/tutor-core.js'),'utf8');
 const sandbox={AssessmentCore:Assessment,PacketCaseCore:Packet};vm.createContext(sandbox);vm.runInContext(source,sandbox);
 const value={z:'á 😀',a:{z:2,a:['<script>',true,null]}};
 assert.equal(sandbox.TutorCore.canonical(value),'{"a":{"a":["<script>",true,null],"z":2},"z":"á 😀"}');
 assert.equal(sandbox.TutorCore.canonical(value),require('../src/shared/tutor-core.js').canonical(value));
});
test('the byte budget rejects a large fourth review without truncating the original reports or earlier feedback',()=>{
 const {TutorExchange}=load(),exchange=new TutorExchange(),profile=fixture();
 for(const key of Assessment.REPORT_FIELDS)profile.labs['independent-assessment'].attempts[0].report[key]='x'.repeat(1950)+' evidencia propia documentada.';
 const packet=exchange.exportPackage(profile,'independent-assessment:attempt-1');
 const input=feedback(packet,{comments:Assessment.REPORT_FIELDS.map(section=>({section,comment:'x'.repeat(1000)}))});
 for(let i=1;i<=3;i++){const p=exchange.preview(profile,JSON.stringify({...input,feedbackId:'feedback-large-'+i}));profile.labs['tutor-reviews']=exchange.commit(profile,p.previewId).record;profile.revision++}
 const before=clone(profile.labs['tutor-reviews']);
 assert.throws(()=>exchange.preview(profile,JSON.stringify({...input,feedbackId:'feedback-large-4'})),/espacio|tamaño|límite/i);
 assert.deepEqual(profile.labs['tutor-reviews'],before);
 assert.equal(before.reviews[0].packet.content.sections.procedure,profile.labs['independent-assessment'].attempts[0].report.procedure);
});
module.exports={fixture,feedback};
