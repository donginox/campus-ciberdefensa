'use strict';
// Integration harness: real Electron/protocol/preload/IPC, isolated disposable data, no visual QA.
const {app}=require('electron');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const temp=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'campus-native-smoke-'));
app.setPath('userData',temp);
// Electron launched with this script otherwise reports scripts/ as the application root.
app.getAppPath=()=>root;
let main,finished=false;const errors=[];
const timeout=setTimeout(()=>finish(new Error('La integración Electron no terminó a tiempo.')),25000);
function finish(error,result){if(finished)return;finished=true;clearTimeout(timeout);if(error){console.error('CAMPUS_SMOKE_FAIL',error.stack||error.message);app.exit(1);}else{console.log('CAMPUS_SMOKE_OK',JSON.stringify(result));app.exit(0);}}
app.on('browser-window-created',(_event,window)=>{
 window.hide();window.on('show',()=>window.hide());
 window.webContents.on('preload-error',(_event,_file,error)=>errors.push(error.message));
 window.webContents.on('did-fail-load',(_event,code,description,url)=>errors.push(`${code}:${description}:${url}`));
 window.webContents.once('did-finish-load',async()=>{
  if(!window.webContents.getURL().includes('/src/renderer/index.html'))return;
  main=window;
  try{
   const ready=await main.webContents.executeJavaScript(`(async()=>{for(let i=0;i<100;i++){if(window.campusDesktop&&window.CAMPUS_CONTENT&&window.LabEngine&&document.getElementById('main').textContent.includes('perfil'))return true;await new Promise(r=>setTimeout(r,20));}return false;})()`);
   assert.equal(ready,true,'Renderer, contenido y preload cargan con CSP activo');
   const info=await main.webContents.executeJavaScript('window.campusDesktop.getAppInfo()');assert.ok(info.version);
   const profile=await main.webContents.executeJavaScript(`window.campusDesktop.createProfile('Prueba técnica aislada')`);
   assert.equal(Object.keys(profile.study.lessons).length,24);
   const saved=await main.webContents.executeJavaScript(`(async()=>{const p=await window.campusDesktop.getActiveProfile();p.study.lessons[Object.keys(p.study.lessons)[0]].notes='Evidencia técnica aislada';return window.campusDesktop.saveProfile({id:p.id,expectedRevision:p.revision,study:p.study,labs:p.labs});})()`);
   assert.equal(saved.study.lessons[Object.keys(saved.study.lessons)[0]].notes,'Evidencia técnica aislada');
   await main.webContents.executeJavaScript(`location.hash='main';`);
   assert.equal((await main.webContents.executeJavaScript('window.campusDesktop.listProfiles()')).length,1,'IPC sigue funcionando tras skip link');
   const sql=await main.webContents.executeJavaScript(`window.campusDesktop.runSqlLab({taskId:'sql-investigation',query:'SELECT 1 AS prueba'})`);
   assert.deepEqual(sql.rows,[[1]]);
   const {BrowserWindow}=require('electron');
   await main.webContents.executeJavaScript(`window.campusDesktop.openMaterial('blue-team.html')`);
   const child=BrowserWindow.getAllWindows().find(w=>w!==main);assert.ok(child);
   assert.equal(await child.webContents.executeJavaScript('typeof window.campusDesktop'),'undefined');
   await child.loadURL('campus://app/assets/materials/windows.html');
   assert.match(await child.webContents.executeJavaScript('document.title'),/Windows/i);
   assert.equal(errors.length,0,errors.join('; '));
   finish(null,{renderer:true,preload:true,profilePersistence:true,hashNavigation:true,sqlWorker:true,materialWindowIsolated:true,materialNavigation:true,visualCheck:false});
  }catch(error){finish(error);}
 });
});
require('../desktop/main.cjs');
