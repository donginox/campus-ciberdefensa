'use strict';
const fs=require('node:fs/promises'); const path=require('node:path'); const {randomUUID}=require('node:crypto');
const core=require('../src/shared/study-core.js'); const {curriculum}=require('../src/content/campus.json'); const v=require('./validation.cjs');
const MAX_BACKUP=7*1024*1024, MAX_STORE=128*1024*1024;
function study(value){v.jsonData(value,5*1024*1024);const normalized=core.normalizeState(value,curriculum);core.exportBackup(normalized);return normalized;}
function labs(value){if(!v.plain(value))throw new Error('Los laboratorios deben ser un objeto.');return v.jsonData(value,1024*1024);}
function clone(value){return JSON.parse(JSON.stringify(value));}
const CHECKPOINT=/^profiles\.checkpoint\.[a-f0-9-]{36}\.json$/;
const PRESERVED=/^profiles\.preserved\.[0-9T-]+\.[a-f0-9-]{36}\.json$/;
const DAY=24*60*60*1000;
function recoveryError(){return new Error('RECOVERY_INVALID: La copia cambió o no es segura. Volvé a inspeccionar las copias.');}
function emptyStore(){return {schemaVersion:1,activeProfileId:null,profiles:{}};}
function validateStoreTree(data){
 // Schema-1 complexity limits apply per study/labs payload, not across all profiles.
 // The full byte-bounded JSON tree still receives unsafe-key and numeric checks.
 const pending=[data],forbidden=new Set(['__proto__','prototype','constructor']);
 const credentials=/^(?:gh_token|github_token|accessToken|refreshToken|password|secret|apiKey|authorization)$/i;
 while(pending.length){
  const value=pending.pop();
  if(value===null||typeof value==='string'||typeof value==='boolean')continue;
  if(typeof value==='number'){if(!Number.isFinite(value))throw new Error('Datos JSON inv\u00e1lidos.');continue;}
  for(const key of Object.keys(value)){
   if(forbidden.has(key)||credentials.test(key))throw new Error('Los datos contienen una clave no permitida.');
   pending.push(value[key]);
  }
 }
}
function validateStore(text){
 if(Buffer.byteLength(text)>MAX_STORE)throw new Error('RECOVERY_INVALID: La copia supera 128 MiB. No se modificaron los datos.');
 const data=JSON.parse(text);
 validateStoreTree(data);
 if(!v.plain(data)||data.schemaVersion!==1||!v.plain(data.profiles))throw new Error('schema');
 for(const [key,p] of Object.entries(data.profiles)){
  v.id(key);if(!v.plain(p)||p.id!==key||!Number.isSafeInteger(p.revision)||p.revision<1||typeof p.createdAt!=='string'||typeof p.updatedAt!=='string'||!Number.isFinite(Date.parse(p.createdAt))||!Number.isFinite(Date.parse(p.updatedAt)))throw new Error('record');
  v.name(p.name);study(p.study);labs(p.labs);
 }
 if(data.activeProfileId!==null){v.id(data.activeProfileId);if(!Object.hasOwn(data.profiles,data.activeProfileId))throw new Error('active');}
 return data;
}
function parseBackup(text){
 if(typeof text!=='string'||Buffer.byteLength(text)>MAX_BACKUP)throw new Error('El respaldo supera 7 MB.');
 const parsed=JSON.parse(text);v.jsonData(parsed,MAX_BACKUP);
 if(parsed.app==='academia-ciberdefensa')return {name:'Perfil recuperado',savedAt:parsed.savedAt,legacy:true,study:core.importBackup(text,curriculum),labs:{}};
 if(parsed.app!=='campus-ciberdefensa-desktop'||parsed.version!==1||!v.plain(parsed.profile)||typeof parsed.savedAt!=='string'||!Number.isFinite(Date.parse(parsed.savedAt)))throw new Error('Formato de respaldo incompatible.');
 return {name:v.name(parsed.profile.name),savedAt:parsed.savedAt,legacy:false,study:study(parsed.profile.study),labs:labs(parsed.profile.labs)};
}
function identity(stat){return [stat.dev,stat.ino,stat.size,stat.mtimeMs,stat.ctimeMs].join(':');}
class ProfileStore {
 constructor(directory){this.directory=path.resolve(directory);this.file=path.join(this.directory,'profiles.json');this.queue=Promise.resolve();this.candidates=new Map();}
 serialize(action){const result=this.queue.then(action);this.queue=result.catch(()=>{});return result;}
 flush(){return this.queue;}
 async safeDirectory(){
  const stat=await fs.lstat(this.directory);const real=await fs.realpath(this.directory);
  const normalize=value=>process.platform==='win32'?value.toLowerCase():value;
  if(!stat.isDirectory()||stat.isSymbolicLink()||normalize(real)!==normalize(this.directory))throw recoveryError();
 }
 async safeFile(file){
  if(path.dirname(file)!==this.directory)throw recoveryError();
  await this.safeDirectory();const stat=await fs.lstat(file);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||stat.size>MAX_STORE)throw recoveryError();
  const handle=await fs.open(file,require('node:fs').constants.O_RDONLY|(require('node:fs').constants.O_NOFOLLOW||0));
  try{
   const before=await handle.stat();if(identity(before)!==identity(stat))throw recoveryError();
   // Bound the read even if another process grows the file after lstat.
   const buffer=Buffer.alloc(before.size+1);let offset=0;
   while(offset<buffer.length){const {bytesRead}=await handle.read(buffer,offset,buffer.length-offset,null);if(!bytesRead)break;offset+=bytesRead;}
   const after=await handle.stat();if(offset!==before.size||identity(before)!==identity(after)||identity(await fs.lstat(file))!==identity(after))throw recoveryError();
   const bytes=buffer.subarray(0,offset);return {bytes,stat:after,identity:identity(after),hash:require('node:crypto').createHash('sha256').update(bytes).digest('hex')};
  }finally{await handle.close();}
 }
 async read(){
  try{return validateStore((await this.safeFile(this.file)).bytes.toString('utf8'));}
  catch(e){if(e.code==='ENOENT')return emptyStore();throw new Error('CORRUPT_STORE: El archivo de perfiles está dañado. No se modificó. Abrí el centro de recuperación.');}
 }
 async syncDirectory(){
  // Windows does not support opening directories for fsync. File data is synced on all platforms.
  if(process.platform==='win32')return;
  const handle=await fs.open(this.directory,'r');try{await handle.sync();}finally{await handle.close();}
 }
 async atomicWrite(target,text){
  if(path.dirname(target)!==this.directory)throw recoveryError();
  await fs.mkdir(this.directory,{recursive:true});await this.safeDirectory();
  try{const stat=await fs.lstat(target);if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1)throw recoveryError();}catch(e){if(e.code!=='ENOENT')throw e;}
  const temporary=target+'.'+randomUUID()+'.tmp';
  try{const handle=await fs.open(temporary,'wx',0o600);try{await handle.writeFile(text);await handle.sync();}finally{await handle.close();}await this.safeDirectory();await fs.rename(temporary,target);await this.syncDirectory();}
  finally{await fs.rm(temporary,{force:true}).catch(()=>{});}
 }
 async checkpointFiles(){
  let names;try{await this.safeDirectory();names=await fs.readdir(this.directory);}catch(e){if(e.code==='ENOENT')return [];throw e;}
  const files=[];for(const name of names.filter(n=>CHECKPOINT.test(n))){try{const stat=await fs.lstat(path.join(this.directory,name));if(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1)files.push({name,mtime:stat.mtimeMs});}catch(e){if(e.code!=='ENOENT')throw e;}}
  return files.sort((a,b)=>b.mtime-a.mtime||b.name.localeCompare(a.name));
 }
 async checkpoint(previous,mandatory=false){
  if(!previous)return;validateStore(previous.bytes.toString('utf8'));const files=await this.checkpointFiles();
  if(!mandatory&&files[0]&&Date.now()-files[0].mtime<DAY)return;
  // Leave room before writing so a failed prune cannot grow storage on every retry.
  for(const old of files.slice(4))await fs.unlink(path.join(this.directory,old.name));
  const name='profiles.checkpoint.'+randomUUID()+'.json';await this.atomicWrite(path.join(this.directory,name),previous.bytes);
 }
 async write(data,{checkpoint=false}={}){
  const text=JSON.stringify(data,null,2);if(Buffer.byteLength(text)>MAX_STORE)throw new Error('El archivo de perfiles supera 128 MB.');validateStore(text);
  await this.read();let previous;try{previous=await this.safeFile(this.file);}catch(e){if(e.code!=='ENOENT')throw e;}
  await this.checkpoint(previous,checkpoint);
  await this.atomicWrite(this.file+'.bak',previous?previous.bytes:text);await this.atomicWrite(this.file,text);
 }
 recoveryStatus(){return this.serialize(async()=>{
  this.candidates.clear();let state;try{const d=await this.read();state=Object.keys(d.profiles).length?'healthy':'empty';}catch{state='corrupt';}
  const files=await this.checkpointFiles();const candidates=[];
  for(const entry of [{name:'profiles.json.bak',kind:'previous'},...files.slice(0,5).map(f=>({...f,kind:'checkpoint'}))]){
   try{const source=await this.safeFile(path.join(this.directory,entry.name));const data=validateStore(source.bytes.toString('utf8'));const id=randomUUID();this.candidates.set(id,{name:entry.name,identity:source.identity,hash:source.hash});
    candidates.push({id,kind:entry.kind,createdAt:source.stat.mtime.toISOString(),profileCount:Object.keys(data.profiles).length,profiles:Object.values(data.profiles).slice(0,5).map(p=>({name:v.name(p.name),updatedAt:p.updatedAt})),activeProfileName:data.activeProfileId?v.name(data.profiles[data.activeProfileId].name):null});
   }catch{/* Invalid, linked or truncated copies are never offered. */}
  }
  let names=[];try{names=await fs.readdir(this.directory);}catch(e){if(e.code!=='ENOENT')throw e;}
  return {state,candidates,preservedCopies:names.filter(n=>PRESERVED.test(n)).length};
 });}
 async replaceRecovered(data){
  // A valid compact candidate can exceed MAX_STORE when pretty-printed. Validate
  // the exact compact replacement before preserving or writing any file.
  const text=JSON.stringify(data);validateStore(text);let previous;
  try{previous=await this.safeFile(this.file);}catch(e){if(e.code!=='ENOENT')throw e;}
  if(previous){
   if((await fs.readdir(this.directory)).filter(n=>PRESERVED.test(n)).length>=5)throw new Error('RECOVERY_CAPACITY: Ya hay cinco originales conservados. Guardalos fuera de la carpeta de datos antes de restaurar otra copia.');
   const name='profiles.preserved.'+new Date().toISOString().replace(/[:.Z]/g,'-')+'.'+randomUUID()+'.json';await this.atomicWrite(path.join(this.directory,name),previous.bytes);
   const current=await this.safeFile(this.file);if(current.identity!==previous.identity||current.hash!==previous.hash)throw recoveryError();
  }
  await this.atomicWrite(this.file,text);this.candidates.clear();return data.activeProfileId?clone(data.profiles[data.activeProfileId]):null;
 }
 recover(candidateId){return this.serialize(async()=>{
  if(typeof candidateId!=='string'||!this.candidates.has(candidateId))throw recoveryError();
  const candidate=this.candidates.get(candidateId);let source;
  try{source=await this.safeFile(path.join(this.directory,candidate.name));if(source.identity!==candidate.identity||source.hash!==candidate.hash)throw recoveryError();validateStore(source.bytes.toString('utf8'));}catch{throw recoveryError();}
  return this.replaceRecovered(validateStore(source.bytes.toString('utf8')));
 });}
 inspectExternalBackup(text){return this.serialize(async()=>{const {name,savedAt,legacy}=parseBackup(text);return {name,savedAt,legacy};});}
 recoverExternalBackup(text){return this.serialize(async()=>{
  const backup=parseBackup(text);let current;try{current=await this.read();}catch(e){if(!e.message.startsWith('CORRUPT_STORE:'))throw e;}
  if(current&&Object.keys(current.profiles).length)throw new Error('RECOVERY_INVALID: Usá Importar desde el perfil existente.');
  const data=emptyStore(),id=randomUUID(),at=new Date().toISOString();data.activeProfileId=id;data.profiles[id]={id,name:backup.name,createdAt:at,updatedAt:at,revision:1,study:backup.study,labs:backup.labs};return this.replaceRecovered(data);
 });}
 get(data,id){v.id(id);const p=data.profiles[id];if(!p)throw new Error('Perfil inexistente.');return p;}
 listProfiles(){return this.serialize(async()=>Object.values((await this.read()).profiles).map(({id,name,updatedAt})=>({id,name,updatedAt})));}
 getActiveProfile(){return this.serialize(async()=>{const d=await this.read();return d.activeProfileId?clone(d.profiles[d.activeProfileId]):null;});}
 getProfile(id){return this.serialize(async()=>clone(this.get(await this.read(),id)));}
 createProfile(name){return this.serialize(async()=>{name=v.name(name);const d=await this.read(),id=randomUUID(),at=new Date().toISOString();const p={id,name,createdAt:at,updatedAt:at,revision:1,study:core.createState(curriculum),labs:{}};d.profiles[id]=p;d.activeProfileId=id;await this.write(d);return clone(p);});}
 selectProfile(id){return this.serialize(async()=>{const d=await this.read(),p=this.get(d,id);d.activeProfileId=id;await this.write(d);return clone(p);});}
 renameProfile({id,name}){return this.serialize(async()=>{const d=await this.read(),p=this.get(d,id);p.name=v.name(name);p.updatedAt=new Date().toISOString();p.revision++;await this.write(d);return clone(p);});}
 saveProfile(input){return this.serialize(async()=>{const d=await this.read(),p=this.get(d,input.id);if(input.expectedRevision!==p.revision)throw new Error('REVISION_CONFLICT: El perfil cambió. Volvé a abrirlo antes de guardar.');const nextStudy=study(input.study),nextLabs=labs(input.labs);p.study=nextStudy;p.labs=nextLabs;p.revision++;p.updatedAt=new Date().toISOString();await this.write(d);return clone(p);});}
 exportBackup(id){return this.serialize(async()=>{const p=this.get(await this.read(),id);return JSON.stringify({app:'campus-ciberdefensa-desktop',version:1,savedAt:new Date().toISOString(),profile:{name:p.name,study:p.study,labs:p.labs}},null,2);});}
 importBackup(id,text){return this.serialize(async()=>{const backup=parseBackup(text);
  const d=await this.read(),p=this.get(d,id);p.study=backup.study;p.labs=backup.labs;p.revision++;p.updatedAt=new Date().toISOString();await this.write(d,{checkpoint:true});return clone(p);});}
}
module.exports={ProfileStore};
