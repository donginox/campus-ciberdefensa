'use strict';
const path=require('node:path');const v=require('./validation.cjs');const materialList=require('../src/content/materials-manifest.json');const materials=new Set(materialList);
const TRUSTED_URL='campus://app/src/renderer/index.html';
function trustedMainUrl(raw){try{const url=new URL(raw);url.hash='';return url.href===TRUSTED_URL;}catch{return false;}}
function assertTrustedSender(event,contents){if(!contents||event.sender!==contents||event.senderFrame!==contents.mainFrame||!trustedMainUrl(event.senderFrame?.url))throw new Error('Remitente IPC no autorizado.');}
function material(relative){if(typeof relative!=='string'||!materials.has(relative))throw new Error('Material no permitido.');return relative;}
function trustedMaterialUrl(raw){
 if(typeof raw!=='string'||/%2e|%2f|%5c|\\/i.test(raw))return false;
 try{const url=new URL(raw),prefix='/assets/materials/';return url.protocol==='campus:'&&url.host==='app'&&!url.username&&!url.password&&!url.search&&url.pathname.startsWith(prefix)&&materials.has(decodeURIComponent(url.pathname.slice(prefix.length)));}catch{return false;}
}
function externalUrl(raw){if(typeof raw!=='string'||raw.length>2048||/[\u0000-\u0020\u007f]/.test(raw))return null;try{const url=new URL(raw);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}}
function resourcePath(raw,root){
 if(typeof raw!=='string'||/%2e|%2f|%5c|\\/i.test(raw))throw new Error('Ruta inválida.');const url=new URL(raw);if(url.protocol!=='campus:'||url.host!=='app'||url.search||url.hash||url.username||url.password)throw new Error('Recurso no permitido.');
 const relative=decodeURIComponent(url.pathname).replace(/^\//,'');
 if(relative.startsWith('assets/materials/'))material(relative.slice('assets/materials/'.length));else if(!/^(?:src\/(?:renderer|shared|labs|content)\/)[\w./-]+$/.test(relative)||relative.split('/').some(s=>s==='..'||s==='.')||!/\.(?:html|css|js|json|svg|png|jpg|woff2?)$/i.test(relative))throw new Error('Recurso no permitido.');
 const result=path.resolve(root,relative),base=path.resolve(root)+path.sep;if(!result.startsWith(base))throw new Error('Ruta inválida.');return result;
}
function keys(arg,allowed){if(!v.plain(arg)||Object.keys(arg).some(k=>!allowed.includes(k))||allowed.some(k=>!Object.hasOwn(arg,k)))throw new Error('Parámetros inválidos.');}
function validateCall(method,arg){switch(method){
 case 'getAppInfo':case 'listProfiles':case 'getActiveProfile':case 'getSystemLabInfo':case 'checkForUpdates':case 'installUpdate':case 'readyToClose':if(arg!==undefined)throw new Error('La operación no acepta parámetros.');return;
 case 'createProfile':return v.name(arg);
 case 'selectProfile':case 'exportBackup':case 'importBackup':return v.id(arg);
 case 'renameProfile':keys(arg,['id','name']);return {id:v.id(arg.id),name:v.name(arg.name)};
 case 'saveProfile':keys(arg,['id','expectedRevision','study','labs']);v.id(arg.id);if(!Number.isSafeInteger(arg.expectedRevision)||arg.expectedRevision<1)throw new Error('Revisión inválida.');v.jsonData(arg.study,5*1024*1024);if(!v.plain(arg.labs))throw new Error('Laboratorios inválidos.');v.jsonData(arg.labs,1024*1024);return arg;
 case 'openMaterial':case 'exportMaterial':return material(arg);
 case 'runSqlLab':keys(arg,['query','taskId']);if(typeof arg.query!=='string'||!arg.query.trim()||Buffer.byteLength(arg.query)>8000||!['sql-investigation','failed-logins'].includes(arg.taskId))throw new Error('Consulta SQL inválida.');return arg;
 default:throw new Error('Operación desconocida.');
}}
module.exports={TRUSTED_URL,trustedMainUrl,trustedMaterialUrl,assertTrustedSender,resourcePath,validateCall,material,externalUrl};
