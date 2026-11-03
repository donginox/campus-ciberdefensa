'use strict';
const {createHash,randomUUID}=require('node:crypto');
const core=require('../src/shared/tutor-core.js');
const clone=v=>JSON.parse(JSON.stringify(v));
const sha=value=>createHash('sha256').update(core.canonical(value),'utf8').digest('hex');
const stale=()=>Error('El perfil o el informe cambió desde la vista previa. Elegí de nuevo el archivo y revisalo antes de guardar.');
class TutorExchange {
 constructor(){this.previews=new Map()}
 profile(profile){if(!profile||typeof profile.id!=='string'||!Number.isSafeInteger(profile.revision)||profile.revision<0)throw Error('Perfil inválido para la devolución.');return profile}
 exportPackage(profile,attemptId){
  this.profile(profile);const source=core.sources(profile.labs).find(s=>s.id===attemptId);if(!source)throw Error('Elegí un informe entregado con su origen válido. Los borradores no se exportan.');
  const content=core.content(source),contentHash=sha(content),packet={app:'campus-tutor-package',version:1,packageId:'pkg-'+contentHash,contentHash,content};
  return core.freeze(core.validatePacket(packet));
 }
 record(profile){const record=core.normalize(profile.labs?.['tutor-reviews']);for(const row of record.reviews){if(sha(row.packet.content)!==row.packet.contentHash||sha(row.feedback)!==row.feedbackHash)throw Error('La huella de una devolución guardada no coincide. Conservá el perfil y recuperá una copia íntegra.')}return record}
 fingerprint(profile){return sha({id:profile.id,revision:profile.revision,record:this.record(profile)})}
 candidate(profile,feedback){
  const packet=this.exportPackage(profile,feedback.sourceId);feedback=core.validateFeedback(feedback,packet);
  const record=this.record(profile),feedbackHash=sha(feedback),previous=record.reviews.find(row=>row.feedback.feedbackId===feedback.feedbackId);
  if(previous&&previous.feedbackHash!==feedbackHash)throw Error('Ese identificador de devolución ya existe con otro contenido. No se modificó el historial.');
  if(previous)return {packet,feedback,record,duplicate:true};
  if(record.reviews.length>=core.MAX_REVIEWS)throw Error('El perfil llegó al límite de 12 devoluciones. Conservá una copia antes de continuar en otro perfil.');
  record.reviews.push({packet,feedback,feedbackHash,importedAt:new Date().toISOString()});
  try{core.normalize(record)}catch(e){if(core.bytes(JSON.stringify(record))>core.MAX_RECORD_BYTES)throw Error('La devolución supera el espacio disponible del historial. No se descartaron informes ni revisiones anteriores.');throw e}
  return {packet,feedback,record,duplicate:false};
 }
 preview(profile,text){
  this.profile(profile);const candidate=this.candidate(profile,core.parseFeedback(text));
  for(const [id,item] of this.previews)if(Date.now()-item.at>15*60*1000)this.previews.delete(id);
  while(this.previews.size>=32)this.previews.delete(this.previews.keys().next().value);
  const previewId=randomUUID();this.previews.set(previewId,{at:Date.now(),profileId:profile.id,revision:profile.revision,fingerprint:this.fingerprint(profile),candidate:clone(candidate)});
  return clone({previewId,duplicate:candidate.duplicate,feedback:candidate.feedback,packet:candidate.packet,reviewCount:candidate.record.reviews.length});
 }
 commit(profile,previewId){
  this.profile(profile);const preview=this.previews.get(previewId);
  if(!preview||preview.profileId!==profile.id||preview.revision!==profile.revision||Date.now()-preview.at>15*60*1000||preview.fingerprint!==this.fingerprint(profile))throw stale();
  const current=this.exportPackage(profile,preview.candidate.feedback.sourceId);
  if(current.contentHash!==preview.candidate.packet.contentHash)throw stale();
  // Keep the token for a retry after a failed atomic store write. Revision checks prevent reuse after success.
  return {profileId:profile.id,expectedRevision:profile.revision,duplicate:preview.candidate.duplicate,record:core.freeze(clone(preview.candidate.record))};
 }
 discard(previewId){this.previews.delete(previewId)}
}
module.exports={TutorExchange};
