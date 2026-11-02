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
const timeout=setTimeout(()=>finish(new Error('La integración Electron no terminó a tiempo.')),45000);
function finish(error,result){if(finished)return;finished=true;clearTimeout(timeout);if(error){console.error('CAMPUS_SMOKE_FAIL',error.stack||error.message);app.exit(1);}else{console.log('CAMPUS_SMOKE_OK',JSON.stringify(result));app.exit(0);}}
app.on('browser-window-created',(_event,window)=>{
 window.hide();window.on('show',()=>window.hide());window.webContents.setBackgroundThrottling(false);
 window.webContents.on('preload-error',(_event,_file,error)=>errors.push(error.message));
 window.webContents.on('did-fail-load',(_event,code,description,url)=>errors.push(`${code}:${description}:${url}`));
 window.webContents.once('did-finish-load',async()=>{
  if(!window.webContents.getURL().includes('/src/renderer/index.html'))return;
  main=window;
  try{
   const ready=await main.webContents.executeJavaScript(`(async()=>{for(let i=0;i<100;i++){if(window.campusDesktop&&window.CAMPUS_CONTENT&&window.LabEngine&&document.getElementById('main').textContent.includes('perfil'))return true;await new Promise(r=>setTimeout(r,20));}return false;})()`);
   assert.equal(ready,true,'Renderer, contenido y preload cargan con CSP activo');
   const info=await main.webContents.executeJavaScript('window.campusDesktop.getAppInfo()');assert.ok(info.version);
   assert.equal(await main.webContents.executeJavaScript('typeof window.RealEnvironments.create'),'function');
   assert.equal(await main.webContents.executeJavaScript('typeof window.MissionHub.create'), 'function');
   assert.equal(await main.webContents.executeJavaScript('typeof window.CompetencyHub.create'), 'function');
   const catalog=await main.webContents.executeJavaScript('window.campusDesktop.labCatalog()');assert.equal(catalog.length,3);
   const realDoctor=await main.webContents.executeJavaScript('window.campusDesktop.realLabDoctor()');assert.equal(typeof realDoctor.ready,'boolean');assert.equal(typeof realDoctor.code,'string');
   const profile=await main.webContents.executeJavaScript(`(async()=>{document.getElementById('profile-name').value='Prueba técnica aislada';document.getElementById('create-profile-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));for(let i=0;i<100;i++){if(document.querySelector('[data-view=competencies]'))return window.campusDesktop.getActiveProfile();await new Promise(r=>setTimeout(r,20));}throw new Error('La UI no adoptó el perfil.');})()`);
   assert.equal(Object.keys(profile.study.lessons).length,24);
   const saved=await main.webContents.executeJavaScript(`(async()=>{document.querySelector('[data-lesson]').click();document.querySelector('[data-step=notes]').click();const field=document.getElementById('lesson-notes');field.value='Evidencia técnica aislada';field.dispatchEvent(new Event('input',{bubbles:true}));for(let i=0;i<100;i++){const p=await window.campusDesktop.getActiveProfile();if(p.study.lessons[Object.keys(p.study.lessons)[0]].notes==='Evidencia técnica aislada')return p;await new Promise(r=>setTimeout(r,20));}throw new Error('No se guardaron las notas de clase');})()`);
   assert.equal(saved.study.lessons[Object.keys(saved.study.lessons)[0]].notes,'Evidencia técnica aislada');
   await main.webContents.executeJavaScript(`location.hash='main';`);
   assert.equal((await main.webContents.executeJavaScript('window.campusDesktop.listProfiles()')).length,1,'IPC sigue funcionando tras skip link');
   const sql=await main.webContents.executeJavaScript(`window.campusDesktop.runSqlLab({taskId:'sql-investigation',query:'SELECT 1 AS prueba'})`);
   assert.deepEqual(sql.rows,[[1]]);
   const mission=await main.webContents.executeJavaScript(`(async()=>{document.querySelector('[data-view=environments]').click();document.querySelector('[data-mission-room=sql-investigation]').click();for(let i=0;i<100;i++){if(document.querySelector('[data-mission-status]').textContent.includes('Docker'))break;await new Promise(r=>setTimeout(r,20));}const field=document.querySelector('[data-mission-notes]');field.value='Evidencia de sala desde Electron';field.dispatchEvent(new Event('input',{bubbles:true}));return {title:document.querySelector('h1').textContent,queryDisabled:document.querySelector('[data-mission-action=query]').disabled,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,status:document.querySelector('[data-mission-status]').textContent};})()`);
   assert.match(mission.title,/datos|registros|SQL/i);if(!realDoctor.ready)assert.equal(mission.queryDisabled,true);assert.equal(mission.overflow,false);
   const map=await main.webContents.executeJavaScript(`(()=>{document.querySelector('[data-view=competencies]').click();return {rows:document.querySelectorAll('[data-competency-skill]').length,title:document.querySelector('h1').textContent};})()`);assert.equal(map.rows,5);assert.match(map.title,/saber/);
   main.setContentSize(920,700);main.webContents.setZoomFactor(1.25);
   const narrow=await main.webContents.executeJavaScript(`new Promise(resolve=>setTimeout(()=>resolve({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}),60))`);assert.ok(narrow.scroll<=narrow.width,'Mapa sin desborde al ampliar en ventana mínima');
   main.webContents.setZoomFactor(1);main.setContentSize(1440,940);
   await main.webContents.executeJavaScript(fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8'));
   const a11y=await main.webContents.executeJavaScript(`(async()=>{document.documentElement.dataset.motion='reduced';const results=[];for(const target of ['competencies','web-investigation','soc-investigation','sql-investigation']){if(target==='competencies')document.querySelector('[data-view=competencies]').click();else{document.querySelector('[data-view=environments]').click();document.querySelector('[data-mission-action=back]')?.click();document.querySelector('[data-mission-room="'+target+'"]').click();}for(const theme of ['light','dark']){document.documentElement.dataset.motion='reduced';document.documentElement.dataset.theme=theme;await new Promise(r=>setTimeout(r,200));const audit=await axe.run(document.querySelector(target==='competencies'?'.competency-hub':'.mission-hub'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});results.push({target,theme,computed:(()=>{const e=document.querySelector(target==='competencies'?'.competency-button':'.mission-button'),s=getComputedStyle(e);return {bg:s.backgroundColor,fg:s.color,paper:s.getPropertyValue('--paper'),motion:document.documentElement.dataset.motion,transition:s.transition}})(),violations:audit.violations.map(v=>({id:v.id,nodes:v.nodes.slice(0,1).map(n=>({target:n.target,summary:n.failureSummary}))}))});}}document.documentElement.dataset.theme='light';return results;})()`);assert.ok(a11y.every(r=>r.violations.length===0),JSON.stringify(a11y));
   const missionSaved=await main.webContents.executeJavaScript(`(async()=>{for(let i=0;i<100;i++){const p=await window.campusDesktop.getActiveProfile();if(p.labs['mission-sql-investigation']?.notes==='Evidencia de sala desde Electron')return true;await new Promise(r=>setTimeout(r,20));}return false;})()`);assert.equal(missionSaved,true);
   const {BrowserWindow}=require('electron');
   await main.webContents.executeJavaScript(`window.campusDesktop.openMaterial('blue-team.html')`);
   const child=BrowserWindow.getAllWindows().find(w=>w!==main);assert.ok(child);
   assert.equal(await child.webContents.executeJavaScript('typeof window.campusDesktop'),'undefined');
   await child.loadURL('campus://app/assets/materials/windows.html');
   assert.match(await child.webContents.executeJavaScript('document.title'),/Windows/i);
   assert.equal(errors.length,0,errors.join('; '));
   finish(null,{renderer:true,preload:true,profilePersistence:true,hashNavigation:true,sqlWorker:true,materialWindowIsolated:true,materialNavigation:true,realLabModule:true,missionHub:true,missionPersistence:true,competencyHub:true,missionLayout:true,nativeLearningContrast:true,dockerReady:realDoctor.ready,dockerCode:realDoctor.code,visualCheck:false});
  }catch(error){finish(error);}
 });
});
require('../desktop/main.cjs');
