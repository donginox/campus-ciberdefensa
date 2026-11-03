(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('../content/objectives.json'));else root.CampusObjectivesCore=factory(root.CAMPUS_OBJECTIVES);})(typeof globalThis!=='undefined'?globalThis:this,function(catalog){
'use strict';
const LIMITS=Object.freeze({bytes:60000,note:400,nextAction:180,search:100}),statuses=['unreviewed','studying','practice-needed','demonstrated'];
const certifications=catalog.certifications,certMap=new Map(certifications.map(c=>[c.id,c]));
const all=certifications.flatMap(c=>c.domains.flatMap(d=>d.objectives.map(o=>({...o,certificationId:c.id,domainId:d.id,domainTitle:d.title}))));
const ids=new Set(all.map(o=>o.id));
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v)&&[Object.prototype,null].includes(Object.getPrototypeOf(v));
function inspect(v,depth=0){if(depth>8)throw Error('El registro supera la profundidad segura.');if(!v||typeof v!=='object')return;if(!Array.isArray(v)&&!plain(v))throw Error('El registro debe contener JSON simple.');for(const key of Object.keys(v)){if(['__proto__','prototype','constructor'].includes(key))throw Error('El registro contiene una clave no segura.');inspect(v[key],depth+1)}}
const byteSize=v=>typeof TextEncoder!=='undefined'?new TextEncoder().encode(JSON.stringify(v)).length:unescape(encodeURIComponent(JSON.stringify(v))).length;
function emptyRecord(){return {version:1,settings:{certificationId:'security-plus-701',domainId:'',status:'',search:''},objectives:{},draft:null}}
function checkedText(v,max,label){if(typeof v!=='string'||v.length>max)throw Error(label+' admite hasta '+max+' caracteres.');return v}
function entry(v){if(!plain(v))throw Error('El avance debe ser un objeto.');if(!statuses.includes(v.status))throw Error('El estado declarado no es válido.');return {status:v.status,note:checkedText(v.note??'',LIMITS.note,'La nota'),nextAction:checkedText(v.nextAction??'',LIMITS.nextAction,'La siguiente acción')}}
function validateRecord(raw){
 inspect(raw);if(!plain(raw)||raw.version!==1)throw Error('La versión del avance de objetivos no es compatible.');
 const r=emptyRecord(),s=raw.settings;if(!plain(s))throw Error('Faltan los filtros del mapa.');
 if(!certMap.has(s.certificationId))throw Error('La certificación no existe en este catálogo.');
 if(typeof s.domainId!=='string'||s.domainId&&!certMap.get(s.certificationId).domains.some(d=>d.id===s.domainId))throw Error('El dominio no pertenece a esta certificación.');
 if(s.status!==''&&!statuses.includes(s.status))throw Error('El estado del filtro no es válido.');
 r.settings={certificationId:s.certificationId,domainId:s.domainId,status:s.status,search:checkedText(s.search,LIMITS.search,'La búsqueda')};
 if(!plain(raw.objectives))throw Error('El avance debe ser un objeto por objetivo.');
 for(const [id,value]of Object.entries(raw.objectives)){if(!ids.has(id))throw Error('El objetivo '+id+' no existe en este catálogo.');r.objectives[id]=entry(value)}
 if(raw.draft!=null){if(!plain(raw.draft)||!ids.has(raw.draft.objectiveId))throw Error('El borrador no tiene un objetivo válido.');r.draft={objectiveId:raw.draft.objectiveId,...entry(raw.draft)}}
 if(byteSize(raw)>LIMITS.bytes||byteSize(r)>LIMITS.bytes)throw Error('El avance supera 60 KB. Exportá o abreviá notas antes de guardar; no se recorta evidencia.');return r;
}
function normalize(raw){return raw==null?emptyRecord():validateRecord(raw)}
function updateObjective(raw,id,patch){if(!ids.has(id))throw Error('El objetivo no existe.');const r=normalize(raw);r.objectives[id]=entry({...r.objectives[id]||{status:'unreviewed',note:'',nextAction:''},...patch});r.draft=null;return validateRecord(r)}
function updateSettings(raw,patch){const r=normalize(raw),s={...r.settings,...patch};if(s.certificationId!==r.settings.certificationId)s.domainId='';r.settings=s;return validateRecord(r)}
function setDraft(raw,id,value){const r=normalize(raw);if(!ids.has(id))throw Error('El objetivo no existe.');r.draft={objectiveId:id,...entry(value)};return validateRecord(r)}
function filterObjectives(raw,filters={}){const r=normalize(raw),s={...r.settings,...filters},query=String(s.search||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();return all.filter(o=>o.certificationId===s.certificationId&&(!s.domainId||o.domainId===s.domainId)&&(!s.status||(r.objectives[o.id]?.status||'unreviewed')===s.status)&&(!query||[o.id,o.title,o.domainTitle,o.description].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(query)))}
function summarize(raw,certificationId){const r=normalize(raw),list=all.filter(o=>o.certificationId===(certificationId||r.settings.certificationId));return {total:list.length,contentMapped:list.filter(o=>o.materialAnchor||o.lessonIds.length).length,relatedPractice:list.filter(o=>o.practiceCoverage==='related-partial').length,documentaryOnly:list.filter(o=>o.practiceCoverage==='documentary-only').length,declaredDemonstrated:list.filter(o=>r.objectives[o.id]?.status==='demonstrated').length,declaredStarted:list.filter(o=>r.objectives[o.id]&&r.objectives[o.id].status!=='unreviewed').length,note:'Contenido mapeado y avance declarado son independientes. No hay cálculo automático de preparación ni aprobación.'}}
return {catalog,LIMITS,statuses,emptyRecord,normalize,validateRecord,updateObjective,updateSettings,setDraft,filterObjectives,summarize};
});
