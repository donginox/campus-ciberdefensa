(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./assessment-core.js'),require('./packet-case-core.js'));else root.TutorCore=factory(root.AssessmentCore,root.PacketCaseCore)})(typeof globalThis!=='undefined'?globalThis:this,function(Assessment,Packet){
 'use strict';
 const MAX_RECORD_BYTES=120000,MAX_FEEDBACK_BYTES=24000,MAX_PACKAGE_BYTES=48000,MAX_REVIEWS=12;
 const clone=v=>JSON.parse(JSON.stringify(v));
 const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
 const date=v=>typeof v==='string'&&/^20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
 function bytes(value){let count=0;for(const c of value){const n=c.codePointAt(0);count+=n<128?1:n<2048?2:n<65536?3:4}return count}
 function tree(value,maxBytes){
  let nodes=0;const seen=new Set(),forbidden=/^(?:__proto__|prototype|constructor|gh_token|github_token|accessToken|refreshToken|password|secret|apiKey|authorization)$/i;
  function visit(v,depth){if(depth>20||++nodes>10000)throw Error('El archivo supera el límite de complejidad.');if(v===null||typeof v==='boolean'||typeof v==='string'||typeof v==='number'&&Number.isFinite(v))return;if(!plain(v)&&!Array.isArray(v)||seen.has(v))throw Error('Formato JSON inválido.');seen.add(v);for(const key of Object.keys(v)){if(forbidden.test(key))throw Error('El archivo contiene una clave no permitida.');visit(v[key],depth+1)}seen.delete(v)}
  visit(value,0);if(bytes(JSON.stringify(value))>maxBytes)throw Error('El archivo supera el tamaño permitido.');return value;
 }
 function canonical(value){if(value===null||typeof value==='boolean'||typeof value==='string'||typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(!plain(value))throw Error('Formato JSON inválido.');return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}'}
 function keys(value,allowed){if(!plain(value)||Object.keys(value).length!==allowed.length||allowed.some(key=>!Object.hasOwn(value,key)))throw Error('Formato o campo no permitido.');return value}
 function text(value,max,required=true){if(typeof value!=='string'||value.length>max||required&&!value.trim()||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))throw Error('Texto inválido o supera el límite permitido.');return value}
 function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value)}return value}
 function sources(labs={}){
  const result=[];
  if(Assessment){for(const a of Assessment.normalize(labs['independent-assessment']).attempts){if(!a.submittedAt)continue;result.push({id:'independent-assessment:'+a.id,source:{id:'independent-assessment:'+a.id,kind:'independent-assessment',attemptId:a.id,caseId:a.caseId,submittedAt:a.submittedAt},sections:clone(a.report),declarations:{execution:a.execution,independence:a.independence,reviewStatus:a.reviewStatus,hasEvidence:a.hasEvidence}})}}
  if(Packet){const record=Packet.normalize(labs['packet-casework']);for(const id of Packet.caseIds){const c=record.cases[id];if(c.attempt)result.push({id:'packet-casework:'+id,source:{id:'packet-casework:'+id,kind:'packet-casework',attemptId:id,caseId:id,submittedAt:c.attempt.submittedAt},sections:clone(c.attempt.report),declarations:{guidanceUsed:c.guidanceUsed===true}})}}
  return result;
 }
 // Guidance can change after delivery; only the frozen report and submission facts identify a package.
 function content(source){return {origin:'Campus Ciberdefensa · informe entregado; declaraciones sin verificar',source:clone(source.source),sections:clone(source.sections)}}
 function validatePacket(raw){
  tree(raw,MAX_PACKAGE_BYTES);keys(raw,['app','version','packageId','contentHash','content']);
  if(raw.app!=='campus-tutor-package'||raw.version!==1)throw Error('Versión de paquete incompatible.');
  if(!hash(raw.contentHash)||raw.packageId!=='pkg-'+raw.contentHash)throw Error('Huella o identificador de paquete inválido.');
  const c=keys(raw.content,['origin','source','sections']),s=keys(c.source,['id','kind','attemptId','caseId','submittedAt']);
  if(c.origin!=='Campus Ciberdefensa · informe entregado; declaraciones sin verificar'||!date(s.submittedAt))throw Error('Origen o fecha de informe inválidos.');
  let fields;
  if(s.kind==='independent-assessment'&&Assessment&&Assessment.CASES.includes(s.caseId)&&/^attempt-[1-9]\d{0,5}$/.test(s.attemptId))fields=Assessment.REPORT_FIELDS;
  else if(s.kind==='packet-casework'&&Packet&&Packet.caseIds.includes(s.caseId)&&s.attemptId===s.caseId)fields=Packet.fields;
  else throw Error('Origen del informe no permitido.');
  if(s.id!==s.kind+':'+s.attemptId)throw Error('Identificador de informe inválido.');keys(c.sections,fields);for(const field of fields)text(c.sections[field],2000);
  return clone(raw);
 }
 function validateFeedback(raw,packet){
  tree(raw,MAX_FEEDBACK_BYTES);keys(raw,['app','version','feedbackId','packageId','contentHash','sourceId','createdAt','reviewer','comments','rubric','nextPractice']);
  if(raw.app!=='campus-tutor-feedback'||raw.version!==1)throw Error('Versión de devolución incompatible.');
  if(typeof raw.feedbackId!=='string'||!/^feedback-[a-zA-Z0-9-]{1,80}$/.test(raw.feedbackId)||!date(raw.createdAt))throw Error('Identificador o fecha de devolución inválidos.');
  if(!hash(raw.contentHash)||raw.contentHash!==packet.contentHash||raw.packageId!==packet.packageId||raw.sourceId!==packet.content.source.id)throw Error('La huella o el informe no coincide con el paquete entregado.');
  const reviewer=keys(raw.reviewer,['name','identity']);text(reviewer.name,100);if(reviewer.identity!=='declared-unverified')throw Error('La identidad del tutor debe ser declarada, sin verificar.');
  if(!Array.isArray(raw.comments)||raw.comments.length<1||raw.comments.length>Object.keys(packet.content.sections).length)throw Error('Incluí comentarios por sección, dentro del límite.');
  const seen=new Set();for(const row of raw.comments){keys(row,['section','comment']);if(!Object.hasOwn(packet.content.sections,row.section)||seen.has(row.section))throw Error('Sección de informe desconocida o repetida.');seen.add(row.section);text(row.comment,1200)}
  if(!Array.isArray(raw.rubric)||raw.rubric.length<1||raw.rubric.length>8)throw Error('Incluí entre uno y ocho criterios de rúbrica.');
  for(const row of raw.rubric){keys(row,['criterion','rating','comment']);text(row.criterion,100);text(row.comment,1000,false);if(!['pending','developing','meets','strong'].includes(row.rating))throw Error('Valor de rúbrica inválido.')}
  text(raw.nextPractice,2000);return clone(raw);
 }
 function normalize(raw){
  if(raw===null||raw===undefined)return {version:1,reviews:[]};tree(raw,MAX_RECORD_BYTES);keys(raw,['version','reviews']);
  if(raw.version!==1||!Array.isArray(raw.reviews)||raw.reviews.length>MAX_REVIEWS)throw Error('El historial supera el límite de 12 devoluciones o tiene una versión incompatible.');
  const result={version:1,reviews:[]},seen=new Set();
  for(const row of raw.reviews){keys(row,['packet','feedback','feedbackHash','importedAt']);const packet=validatePacket(row.packet),feedback=validateFeedback(row.feedback,packet);if(!hash(row.feedbackHash)||!date(row.importedAt)||seen.has(feedback.feedbackId))throw Error('Historial de devoluciones inválido o duplicado.');seen.add(feedback.feedbackId);result.reviews.push({packet,feedback,feedbackHash:row.feedbackHash,importedAt:row.importedAt})}
  return result;
 }
 function parseFeedback(value){if(typeof value!=='string'||bytes(value)>MAX_FEEDBACK_BYTES)throw Error('El archivo supera el tamaño permitido.');let parsed;try{parsed=JSON.parse(value)}catch{throw Error('El archivo no contiene JSON válido.')}return tree(parsed,MAX_FEEDBACK_BYTES)}
 return {sources,content,canonical,bytes,freeze,normalize,validatePacket,validateFeedback,parseFeedback,MAX_RECORD_BYTES,MAX_FEEDBACK_BYTES,MAX_PACKAGE_BYTES,MAX_REVIEWS};
});
