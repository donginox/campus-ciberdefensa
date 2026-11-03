'use strict';
const {createHash}=require('node:crypto');const {TextDecoder}=require('node:util');const v=require('./validation.cjs');
class ForensicActions{
 constructor({store,engine,chooseEvents,confirmReset,readNative,saveNative}){Object.assign(this,{store,engine,chooseEvents,confirmReset,readNative,saveNative});}
 async status({profileId}){await this.store.getProfile(profileId);return this.engine.status(profileId);}
 async ingest({profileId,datasetId}){await this.store.getProfile(profileId);return this.engine.ingest(profileId,{datasetId});}
 async query({profileId,...filters}){await this.store.getProfile(profileId);return this.engine.query(profileId,filters);}
 async import({profileId}){
  await this.store.getProfile(profileId);const bytes=await this.chooseEvents();if(bytes===null)return{canceled:true};
  if(!Buffer.isBuffer(bytes))throw Error('La fuente nativa debe conservar sus bytes originales.');
  if(bytes.length>2*1024*1024)throw Error('La fuente supera 2 MiB.');
  let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw Error('La fuente no es UTF-8 válido. Convertí una copia de forma explícita y conservá el original.');}
  const lines=text.split(/\r?\n/).filter(line=>line.trim());if(!lines.length||lines.length>5000)throw Error('La fuente debe contener entre 1 y 5000 eventos JSONL.');
  const events=v.jsonData(lines.map(line=>JSON.parse(line)),2*1024*1024);
  await this.store.getProfile(profileId);const result=await this.engine.ingest(profileId,{events});
  return{...result,canceled:false,sourceSha256:createHash('sha256').update(bytes).digest('hex')};
 }
 async reset({profileId}){await this.store.getProfile(profileId);if(!await this.confirmReset())return{canceled:true};await this.store.getProfile(profileId);return{canceled:false,...await this.engine.reset(profileId)};}
 async verify({profileId}){await this.store.getProfile(profileId);return this.engine.verifyArtifacts();}
 async exportNative({profileId}){await this.store.getProfile(profileId);return this.saveNative(await this.readNative());}
}
module.exports={ForensicActions};
