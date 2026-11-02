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
function labInput(arg,extra=[]){keys(arg,['profileId','labId',...extra]);v.id(arg.profileId);if(!['juice-shop','soc-response','database-fundamentals'].includes(arg.labId))throw new Error('Receta de laboratorio no permitida.');return arg;}
function actor(value){if(typeof value!=='string'||!value.trim()||value.length>100||/[\u0000-\u001f\u007f]/.test(value))throw new Error('Actor del caso inválido.');return value.trim();}
function validateCall(method,arg){switch(method){
 case 'vmDoctor':case 'systemPracticeInfo':if(arg!==undefined)throw new Error('La operación no acepta parámetros.');return;
 case 'vmStatus':case 'vmCreate':case 'vmStart':case 'vmStop':case 'vmSnapshot':case 'vmRestore':keys(arg,['profileId','templateId']);v.id(arg.profileId);if(!['windows','linux'].includes(arg.templateId))throw new Error('Plantilla de VM no permitida.');return arg;
 case 'observeSystem':keys(arg,['profileId','kind']);v.id(arg.profileId);if(!['processes','services','network','events','permissions'].includes(arg.kind))throw new Error('Observación no permitida.');return arg;
 case 'exportPortfolio':keys(arg,['profileId','format']);v.id(arg.profileId);if(!['pdf','html'].includes(arg.format))throw new Error('Formato de portafolio no permitido.');return arg;
 case 'getAppInfo':case 'listProfiles':case 'getActiveProfile':case 'getSystemLabInfo':case 'checkForUpdates':case 'installUpdate':case 'readyToClose':case 'realLabDoctor':case 'labCatalog':if(arg!==undefined)throw new Error('La operación no acepta parámetros.');return;
 case 'labStatus':case 'labStart':case 'labStop':case 'labReset':case 'labOpen':case 'labEvents':case 'labReplay':return labInput(arg);
 case 'labQuery':labInput(arg,['query']);if(arg.labId!=='database-fundamentals'||typeof arg.query!=='string'||!arg.query.trim()||Buffer.byteLength(arg.query)>8000)throw new Error('Consulta de sala inválida.');return arg;
 case 'labAssess':labInput(arg,['actor','failures']);if(arg.labId!=='soc-response'||!Number.isInteger(arg.failures)||arg.failures<0||arg.failures>300)throw new Error('Evaluación de caso inválida.');return {...arg,actor:actor(arg.actor)};
 case 'labContain':labInput(arg,['actor']);if(arg.labId!=='soc-response')throw new Error('Contención no disponible en esta receta.');return {...arg,actor:actor(arg.actor)};
 case 'createProfile':return v.name(arg);
 case 'selectProfile':case 'exportBackup':case 'importBackup':case 'realLabStatus':case 'startRealLab':case 'stopRealLab':case 'resetRealLab':case 'openRealLab':return v.id(arg);
 case 'renameProfile':keys(arg,['id','name']);return {id:v.id(arg.id),name:v.name(arg.name)};
 case 'saveProfile':keys(arg,['id','expectedRevision','study','labs']);v.id(arg.id);if(!Number.isSafeInteger(arg.expectedRevision)||arg.expectedRevision<1)throw new Error('Revisión inválida.');v.jsonData(arg.study,5*1024*1024);if(!v.plain(arg.labs))throw new Error('Laboratorios inválidos.');v.jsonData(arg.labs,1024*1024);return arg;
 case 'openMaterial':case 'exportMaterial':return material(arg);
 case 'runSqlLab':keys(arg,['query','taskId']);if(typeof arg.query!=='string'||!arg.query.trim()||Buffer.byteLength(arg.query)>8000||!['sql-investigation','failed-logins'].includes(arg.taskId))throw new Error('Consulta SQL inválida.');return arg;
 default:throw new Error('Operación desconocida.');
}}
module.exports={TRUSTED_URL,trustedMainUrl,trustedMaterialUrl,assertTrustedSender,resourcePath,validateCall,material,externalUrl};
