'use strict';
const {createHash,randomUUID}=require('node:crypto');
const v=require('./validation.cjs');
const MAX_SOURCE=7*1024*1024;
const own=(o,k)=>Object.hasOwn(o,k);
const clone=x=>JSON.parse(JSON.stringify(x));
function canonical(x){if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';if(v.plain(x))return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';return JSON.stringify(x)}
const hash=x=>createHash('sha256').update(canonical(x)).digest('hex');
const sourceHash=text=>createHash('sha256').update(text).digest('hex');
const same=(a,b)=>hash(a)===hash(b);
const schemas={
 'professional-learning':{arrays:{history:20,sessions:100},maps:['reviews']},
 'preparation-ledger':{arrays:{entries:30},maps:[]},
 'independent-assessment':{arrays:{attempts:6},maps:['setupDrafts']},
 'packet-casework':{arrays:{},maps:['cases']},
 'merge-conflicts':{arrays:{records:200},maps:[]}
};
function arrayEntries(items){
 const out=new Map();for(const item of items){const id=v.plain(item)&&typeof item.id==='string'&&item.id?'id:'+item.id:'hash:'+hash(item);if(out.has(id))throw Error('La colección contiene identificadores repetidos. No se combinó.');out.set(id,item)}return out;
}
function validArchive(labs){
 const value=labs['merge-conflicts'];if(value===undefined)return [];
 if(!v.plain(value)||value.version!==1||!Array.isArray(value.records))throw Error('El archivo de conflictos no tiene un formato compatible.');
 for(const r of value.records)if(!v.plain(r)||typeof r.id!=='string'||!Array.isArray(r.path)||!r.path.every(p=>typeof p==='string')||typeof r.localHash!=='string'||typeof r.incomingHash!=='string'||!own(r,'incoming')||hash(r.incoming)!==r.incomingHash)throw Error('El archivo de conflictos contiene una alternativa inválida.');
 arrayEntries(value.records);return value.records;
}
class ProgressMerge{
 constructor({parseBackup,maxPending=8,ttlMs=15*60*1000,now=()=>Date.now(),maxConflictRecords=200}={}){this.parseBackup=parseBackup||require('./store.cjs').parseBackup;this.pending=new Map();this.maxPending=maxPending;this.ttlMs=ttlMs;this.now=now;this.maxConflictRecords=maxConflictRecords}
 preview(profile,text){
  if(typeof text!=='string'||Buffer.byteLength(text)>MAX_SOURCE)throw Error('El respaldo supera el límite de 7 MB.');
  v.jsonData(JSON.parse(text),MAX_SOURCE);profile=v.jsonData(profile,MAX_SOURCE);
  if(typeof profile.id!=='string'||!Number.isSafeInteger(profile.revision))throw Error('Perfil inválido.');
  const incoming=v.jsonData(this.parseBackup(text),MAX_SOURCE);if(!v.plain(incoming.study)||!v.plain(incoming.labs)||!v.plain(profile.study)||!v.plain(profile.labs))throw Error('El respaldo no contiene estudio y laboratorios válidos.');
  const source={name:v.name(incoming.name),savedAt:incoming.savedAt,hash:sourceHash(text)},counts={new:0,equal:0,conflict:0},conflicts=[],prior=validArchive(profile.labs);validArchive(incoming.labs);
  const atomic=(local,other,path,kind,hasLocal=true)=>{
   if(!hasLocal){counts.new++;return {type:'value',value:other}}
   if(same(local,other)){counts.equal++;return {type:'value',value:local}}
   const localHash=hash(local),incomingHash=hash(other);
   if(prior.some(r=>same(r.path,path)&&r.localHash===localHash&&r.incomingHash===incomingHash)){counts.equal++;return {type:'value',value:local}}
   const id=randomUUID();counts.conflict++;conflicts.push({id,kind,label:path.join(' / '),local:clone(local),incoming:clone(other),choices:['local','incoming','both']});return {type:'conflict',id,path,kind,local,other,localHash,incomingHash};
  };
  const map=(local,other,path,child)=>{
   if(!v.plain(local)||!v.plain(other))return atomic(local,other,path,'registro');
   const fields=Object.fromEntries(Object.entries(local).map(([k,value])=>[k,{type:'value',value}]));
   for(const [k,value]of Object.entries(other))fields[k]=child(local[k],value,[...path,k],own(local,k));return {type:'object',fields};
  };
  const array=(local,other,path,kind)=>{
   if(!Array.isArray(local)||!Array.isArray(other))return atomic(local,other,path,kind);
   const left=arrayEntries(local),right=arrayEntries(other),items=[];
   for(const [id,item]of left)items.push(right.has(id)?atomic(item,right.get(id),[...path,id],kind):{type:'value',value:item});
   for(const [id,item]of right)if(!left.has(id))items.push(atomic(undefined,item,[...path,id],kind,false));return {type:'array',items};
  };
  const lab=(local,other,path,has)=>{
   const schema=schemas[path[1]];
   if(!schema||!has||!v.plain(local)||!v.plain(other)){
    if(schema&&v.plain(other))for(const field of Object.keys(schema.arrays))if(Array.isArray(other[field]))arrayEntries(other[field]);
    return atomic(local,other,path,'laboratorio',has);
   }
   // A different record version is an indivisible conflict; no mixed schemas.
   if(local.version!==other.version)return atomic(local,other,path,'laboratorio');
   return map(local,other,path,(a,b,p,exists)=>{
    const key=p.at(-1);if(own(schema.arrays,key)&&Array.isArray(b))return exists?array(a,b,p,key==='attempts'?'intento':'historial'):array([],b,p,'historial');
    if(schema.maps.includes(key)&&exists)return map(a,b,p,(x,y,q,e)=>atomic(x,y,q,key==='reviews'?'repaso':'borrador',e));
    return atomic(a,b,p,/draft|activeAttempt/i.test(key)?'borrador':'laboratorio',exists);
   });
  };
  const study=map(profile.study,incoming.study,['study'],(a,b,p,has)=>{
   if(p[1]==='updatedAt')return {type:'value',value:has?a:b};
   if(p[1]==='lessons'&&has)return map(a,b,p,(x,y,q,e)=>atomic(x,y,q,'clase',e));
   if(p[1]==='roadmap'&&has)return map(a,b,p,(x,y,q,e)=>e?map(x,y,q,(u,w,r,f)=>atomic(u,w,r,'ruta',f)):atomic(x,y,q,'ruta',false));
   if(p[1]==='final'&&has)return map(a,b,p,(x,y,q,e)=>q.at(-1)==='stations'&&e?map(x,y,q,(u,w,r,f)=>atomic(u,w,r,'evidencia',f)):atomic(x,y,q,'evidencia',e));
   return atomic(a,b,p,'estudio',has);
  });
  const labs=map(profile.labs,incoming.labs,['labs'],lab),id=randomUUID();
  for(const [key,entry]of this.pending)if(this.now()-entry.created>this.ttlMs)this.pending.delete(key);
  if(this.pending.size>=this.maxPending)throw Error('Hay demasiadas vistas previas abiertas. Cancelá una y volvé a intentar.');
  this.pending.set(id,{profileId:profile.id,revision:profile.revision,profileHash:hash(profile),source,sourceText:text,created:this.now(),study,labs,conflicts});
  return clone({id,profileId:profile.id,revision:profile.revision,source,counts,conflicts,alternatives:prior});
 }
 commit(profile,previewId,decisions){
  const p=this.pending.get(previewId);if(!p)throw Error('La vista previa no existe. Elegí el respaldo nuevamente.');
  if(this.now()-p.created>this.ttlMs){this.pending.delete(previewId);throw Error('La vista previa venció. Elegí el respaldo nuevamente.');}
  if(profile.id!==p.profileId||profile.revision!==p.revision||hash(profile)!==p.profileHash)throw Error('REVISION_CONFLICT: El perfil cambió. Generá una vista previa nueva.');
  if(sourceHash(p.sourceText)!==p.source.hash)throw Error('La fuente de la vista previa cambió.');
  v.jsonData(decisions,100000);
  if(!v.plain(decisions)||Object.keys(decisions).length!==p.conflicts.length||Object.keys(decisions).some(id=>!p.conflicts.some(c=>c.id===id))||p.conflicts.some(c=>!['local','incoming','both'].includes(decisions[c.id])))throw Error('Elegí una decisión válida para cada conflicto.');
  const additions=[];
  function resolve(node){
   if(node.type==='value')return node.value;
   if(node.type==='object')return Object.fromEntries(Object.entries(node.fields).map(([k,n])=>[k,resolve(n)]));
   if(node.type==='array')return node.items.map(resolve);
   const choice=decisions[node.id];if(choice==='incoming')return node.other;
   if(choice==='both')additions.push({id:hash({path:node.path,localHash:node.localHash,incomingHash:node.incomingHash}),path:node.path,kind:node.kind,localHash:node.localHash,incomingHash:node.incomingHash,incoming:node.other,source:p.source,retained:'local',savedAt:new Date(p.created).toISOString()});return node.local;
  }
  const study=clone(resolve(p.study)),labs=clone(resolve(p.labs)),archive=validArchive(labs),seen=new Set(archive.map(r=>r.id));
  for(const r of additions)if(!seen.has(r.id)){archive.push(r);seen.add(r.id)}
  if(archive.length>this.maxConflictRecords)throw Error('El archivo de conflictos alcanzó el límite de capacidad. Exportá y resolvé alternativas antes de combinar.');
  if(additions.length)labs['merge-conflicts']={version:1,records:archive};
  for(const [key,schema]of Object.entries(schemas)){
   const value=labs[key];if(!v.plain(value)||same(value,profile.labs[key]??null))continue;
   for(const [field,limit]of Object.entries(schema.arrays))if(Array.isArray(value[field])&&value[field].length>limit)throw Error(`El registro ${key} supera el límite de ${limit} ${field}. No se descartó ningún dato.`);
   if(key==='packet-casework'&&Buffer.byteLength(JSON.stringify(value))>40000)throw Error('El registro de paquetes supera el límite de capacidad. No se descartó ningún dato.');
  }
  v.jsonData(study,5*1024*1024);v.jsonData(labs,1024*1024);
  // The caller consumes the token with cancel only after its atomic write succeeds.
  return clone({study,labs,expectedRevision:p.revision});
 }
 cancel(id){this.pending.delete(id)}
}
module.exports={ProgressMerge};
