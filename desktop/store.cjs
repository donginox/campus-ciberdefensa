'use strict';
const fs=require('node:fs/promises'); const path=require('node:path'); const {randomUUID}=require('node:crypto');
const core=require('../src/shared/study-core.js'); const {curriculum}=require('../src/content/campus.json'); const v=require('./validation.cjs');
const MAX_BACKUP=7*1024*1024, MAX_STORE=128*1024*1024;
function study(value){v.jsonData(value,5*1024*1024);const normalized=core.normalizeState(value,curriculum);core.exportBackup(normalized);return normalized;}
function labs(value){if(!v.plain(value))throw new Error('Los laboratorios deben ser un objeto.');return v.jsonData(value,1024*1024);}
function clone(value){return JSON.parse(JSON.stringify(value));}
class ProfileStore {
 constructor(directory){this.directory=directory;this.file=path.join(directory,'profiles.json');this.queue=Promise.resolve();}
 serialize(action){const result=this.queue.then(action);this.queue=result.catch(()=>{});return result;}
 flush(){return this.queue;}
 async read(){
  let text;try{const stat=await fs.stat(this.file);if(stat.size>MAX_STORE)throw new Error('Tamaño inválido');text=await fs.readFile(this.file,'utf8');}catch(e){if(e.code==='ENOENT')return {schemaVersion:1,activeProfileId:null,profiles:{}};throw new Error('CORRUPT_STORE: No se pudo leer el archivo. Conservá profiles.json y profiles.json.bak para recuperarlo.');}
  try{const data=JSON.parse(text);if(data.schemaVersion!==1||!v.plain(data.profiles))throw new Error('schema');
   for(const [key,p] of Object.entries(data.profiles)){v.id(key);if(p.id!==key||!Number.isSafeInteger(p.revision)||p.revision<1||!Number.isFinite(Date.parse(p.createdAt))||!Number.isFinite(Date.parse(p.updatedAt)))throw new Error('record');v.name(p.name);study(p.study);labs(p.labs);}
   if(data.activeProfileId!==null){v.id(data.activeProfileId);if(!Object.hasOwn(data.profiles,data.activeProfileId))throw new Error('active');}return data;
  }catch(e){throw new Error('CORRUPT_STORE: El archivo de perfiles está dañado. No se modificó. Conservá profiles.json y profiles.json.bak para recuperarlo.');}
 }
 async atomicWrite(target,text){const temporary=target+'.'+randomUUID()+'.tmp';await fs.mkdir(this.directory,{recursive:true});try{const handle=await fs.open(temporary,'wx',0o600);try{await handle.writeFile(text,'utf8');await handle.sync();}finally{await handle.close();}await fs.rename(temporary,target);}finally{await fs.rm(temporary,{force:true}).catch(()=>{});}}
 async write(data){const text=JSON.stringify(data,null,2);if(Buffer.byteLength(text)>MAX_STORE)throw new Error('El archivo de perfiles supera 128 MB.');
  // read validates the current file before it can be replaced or copied to recovery.
  await this.read();let previous;try{previous=await fs.readFile(this.file,'utf8');}catch(e){if(e.code!=='ENOENT')throw e;}
  await this.atomicWrite(this.file+'.bak',previous||text);await this.atomicWrite(this.file,text);
 }
 get(data,id){v.id(id);const p=data.profiles[id];if(!p)throw new Error('Perfil inexistente.');return p;}
 listProfiles(){return this.serialize(async()=>Object.values((await this.read()).profiles).map(({id,name,updatedAt})=>({id,name,updatedAt})));}
 getActiveProfile(){return this.serialize(async()=>{const d=await this.read();return d.activeProfileId?clone(d.profiles[d.activeProfileId]):null;});}
 getProfile(id){return this.serialize(async()=>clone(this.get(await this.read(),id)));}
 createProfile(name){return this.serialize(async()=>{name=v.name(name);const d=await this.read(),id=randomUUID(),at=new Date().toISOString();const p={id,name,createdAt:at,updatedAt:at,revision:1,study:core.createState(curriculum),labs:{}};d.profiles[id]=p;d.activeProfileId=id;await this.write(d);return clone(p);});}
 selectProfile(id){return this.serialize(async()=>{const d=await this.read(),p=this.get(d,id);d.activeProfileId=id;await this.write(d);return clone(p);});}
 renameProfile({id,name}){return this.serialize(async()=>{const d=await this.read(),p=this.get(d,id);p.name=v.name(name);p.updatedAt=new Date().toISOString();p.revision++;await this.write(d);return clone(p);});}
 saveProfile(input){return this.serialize(async()=>{const d=await this.read(),p=this.get(d,input.id);if(input.expectedRevision!==p.revision)throw new Error('REVISION_CONFLICT: El perfil cambió. Volvé a abrirlo antes de guardar.');const nextStudy=study(input.study),nextLabs=labs(input.labs);p.study=nextStudy;p.labs=nextLabs;p.revision++;p.updatedAt=new Date().toISOString();await this.write(d);return clone(p);});}
 exportBackup(id){return this.serialize(async()=>{const p=this.get(await this.read(),id);return JSON.stringify({app:'campus-ciberdefensa-desktop',version:1,savedAt:new Date().toISOString(),profile:{name:p.name,study:p.study,labs:p.labs}},null,2);});}
 importBackup(id,text){return this.serialize(async()=>{if(typeof text!=='string'||Buffer.byteLength(text)>MAX_BACKUP)throw new Error('El respaldo supera 7 MB.');const parsed=JSON.parse(text);let nextStudy,nextLabs={};if(parsed.app==='academia-ciberdefensa')nextStudy=core.importBackup(text,curriculum);else{v.jsonData(parsed,MAX_BACKUP);if(parsed.app!=='campus-ciberdefensa-desktop'||parsed.version!==1||!v.plain(parsed.profile)||!Number.isFinite(Date.parse(parsed.savedAt)))throw new Error('Formato de respaldo incompatible.');nextStudy=study(parsed.profile.study);nextLabs=labs(parsed.profile.labs);}
  const d=await this.read(),p=this.get(d,id);p.study=nextStudy;p.labs=nextLabs;p.revision++;p.updatedAt=new Date().toISOString();await this.write(d);return clone(p);});}
}
module.exports={ProfileStore};
