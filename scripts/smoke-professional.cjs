'use strict';
// Run with Electron, not Node. Exercises the real campus:// protocol, preload,
// IPC and disk store in disposable userData. No VM mutations or native dialogs.
const {app,ipcMain}=require('electron');
// A software compositor lets hidden windows apply zoom and layout updates.
app.disableHardwareAcceleration();
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'campus-professional-smoke-'));
app.setPath('userData',dataDir);
app.getAppPath=()=>root;
const report={protocol:'campus://app',checks:[],accessibility:[],layout:[],screenshots:[],visual:{available:false,verified:false,reason:'No visual inspection was performed.',attempts:[]},runtimeErrors:[],forbiddenCalls:[]};
let main,started=false,finished=false;
const timer=setTimeout(()=>finish(new Error('Native professional smoke timed out.')),180000);
const nativeHandle=ipcMain.handle.bind(ipcMain);
ipcMain.handle=(channel,handler)=>nativeHandle(channel,(event,arg)=>{
 if(/^campus:(vm(Create|Start|Stop|Snapshot|Restore)|export|import|installUpdate|checkForUpdates|lab(Start|Stop|Reset|Open|Contain)|startRealLab|stopRealLab|resetRealLab|openRealLab|openMaterial)/.test(channel)){
  report.forbiddenCalls.push(channel);throw new Error('Native smoke forbids dialogs, external windows and mutations: '+channel);
 }
 return handler(event,arg);
});
function finish(error){
 if(finished)return;finished=true;clearTimeout(timer);
 if(error)report.checks.push({name:'harness',ok:false,error:error.stack||error.message});
 const ok=report.checks.every(c=>c.ok)&&report.accessibility.every(c=>c.violations.length===0)&&report.layout.every(c=>!c.overflow)&&report.runtimeErrors.length===0&&report.forbiddenCalls.length===0;
 console.log(ok?'CAMPUS_PROFESSIONAL_SMOKE_OK':'CAMPUS_PROFESSIONAL_SMOKE_FAIL',JSON.stringify(report));
 app.exit(ok?0:1);
}
const evaluate=source=>main.webContents.executeJavaScript(source);
async function waitFor(expression,label,timeout=8000){
 const end=Date.now()+timeout;
 do{const result=await evaluate(expression);if(result)return result;await new Promise(resolve=>setTimeout(resolve,30));}while(Date.now()<end);
 throw new Error('Timed out: '+label);
}
async function check(name,run){
 try{const evidence=await run();report.checks.push({name,ok:true,...(evidence===undefined?{}:{evidence})});}
 catch(error){report.checks.push({name,ok:false,error:error.stack||error.message});}
 console.log('CAMPUS_PROFESSIONAL_CHECK',JSON.stringify(report.checks.at(-1)));
}
async function click(selector){
 await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing control: '+${JSON.stringify(selector)});if(e.disabled)throw Error('Disabled control: '+${JSON.stringify(selector)});e.click();})()`);
}
async function input(selector,value){
 await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing input: '+${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
}
async function navigate(view){await click(`#navigation [data-view="${view}"]`);}
async function learning(view){await navigate('learning');if(view!=='today')await click(`[data-learning-view="${view}"]`);}
async function reload(){
 const loaded=new Promise((resolve,reject)=>{main.webContents.once('did-finish-load',resolve);main.webContents.once('did-fail-load',(_event,code,message)=>reject(Error(code+': '+message)));});
 main.webContents.reload();await loaded;
 await waitFor(`!!document.querySelector('#navigation [data-view="learning"]')`,'profile adoption after native reload');
 assert.match(main.webContents.getURL(),/^campus:\/\/app\/src\/renderer\/index\.html/);
}
async function prepare(target){
 if(['today','diagnostic','exam','calendar','review','diagnostic-active','exam-active'].includes(target)){
  const view=target.replace('-active','');await learning(view);
  if(target.endsWith('-active')){
   if(await evaluate(`!!document.querySelector('[data-learning-action="start-${view}"]')`))await click(`[data-learning-action="start-${view}"]`);
   await waitFor(`document.querySelectorAll('[data-learning-question]').length===24`,'active assessment');
  }
  return '.learning-hub';
 }
 if(['systems','practice','campaign'].includes(target)){
  await navigate('systems');await click('[data-practice-action="catalog"]');
  if(target==='practice')await click('[data-practice-open="win-processes"]');
  if(target==='campaign')await click('[data-campaign-open]');
  await waitFor(`!!document.querySelector('.system-practice-hub')`,'system practice mount');
  return '.system-practice-hub';
 }
 if(target==='search'){
  await navigate('home');await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true,cancelable:true}))`);
  await input('#campus-global-query','Windows procesos');return '[role="dialog"]';
 }
 await navigate(target);
 if(target==='vms')await waitFor(`document.querySelector('[data-vm-hub]')?.getAttribute('aria-busy')==='false'`,'read-only VM status',20000);
 return target==='vms'?'.vm-hub':'.portfolio-hub';
}
async function audit(target){
 const selector=await prepare(target);
 for(const theme of ['light','dark']){
  await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)};document.documentElement.dataset.motion='reduced'`);
  await new Promise(resolve=>setTimeout(resolve,80));
  const result=await evaluate(`(async()=>{const root=document.querySelector(${JSON.stringify(selector)});if(!root)throw Error('Missing audit root '+${JSON.stringify(selector)});const result=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});const button=root.querySelector('button');const style=button&&getComputedStyle(button);return {theme:document.documentElement.dataset.theme,motion:document.documentElement.dataset.motion,transition:style?.transitionDuration,violations:result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))};})()`);
  report.accessibility.push({target,...result});
 }
 await evaluate(`document.documentElement.dataset.theme='light';document.documentElement.dataset.motion='reduced'`);
 main.setContentSize(920,640);main.webContents.setZoomFactor(1.25);
 await waitFor(`Math.abs(innerWidth-736)<=2&&devicePixelRatio>=1.24`,'125% zoom applied to the minimum native viewport');
 await evaluate(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
 const layout=await evaluate(`(()=>{const e=document.documentElement;return {width:e.clientWidth,innerWidth:innerWidth,devicePixelRatio:devicePixelRatio,scroll:e.scrollWidth,overflow:e.scrollWidth>e.clientWidth+1}})()`);
 report.layout.push({target,zoom:main.webContents.getZoomFactor(),contentSize:main.getContentSize(),...layout});
 main.webContents.setZoomFactor(1);main.setContentSize(1440,940);
 if(target==='search')await click('[data-action="cancel-modal"]');
 if(target.endsWith('-active')){await click('[data-learning-action="request-abandon"]');await click('[data-learning-action="confirm-abandon"]');}
 assert.equal(layout.overflow,false,'Horizontal page overflow at minimum width and 125% zoom: '+target);
 const audits=report.accessibility.slice(-2);
 assert.ok(audits.every(result=>result.violations.length===0),'WCAG violations: '+JSON.stringify(audits.filter(result=>result.violations.length)));
}
async function capture(name,target){
 await prepare(target);await evaluate(`document.documentElement.dataset.theme='light';document.documentElement.dataset.motion='reduced';window.scrollTo(0,0)`);
 await new Promise(resolve=>setTimeout(resolve,80));
 const directory=path.resolve(root,'..','.campus-work');fs.mkdirSync(directory,{recursive:true});
 const filename=path.join(directory,'professional-native-'+name+'.png');
 let captureTimer;
 try{
  const image=await Promise.race([
   main.webContents.capturePage(undefined,{stayHidden:true,stayAwake:true}),
   new Promise((_resolve,reject)=>{captureTimer=setTimeout(()=>reject(Error('Native capture did not complete within 4 seconds.')),4000);})
  ]);
  if(image.isEmpty())throw Error('Native capture returned an empty image.');
  fs.writeFileSync(filename,image.toPNG());report.screenshots.push(filename);
  report.visual.available=true;report.visual.attempts.push({target,available:true,verified:false,path:filename});
 }catch(error){
  report.visual.attempts.push({target,available:false,verified:false,reason:String(error.message||error)});
 }finally{clearTimeout(captureTimer);}
}
async function run(){
 assert.match(main.webContents.getURL(),/^campus:\/\/app\/src\/renderer\/index\.html/);
 await waitFor(`!!window.campusDesktop&&!!window.ProfessionalShell&&!!document.getElementById('create-profile-form')`,'native professional entry');
 await input('#profile-name','QA profesional aislada');
 await evaluate(`document.getElementById('create-profile-form').requestSubmit()`);
 await waitFor(`!!document.querySelector('#navigation [data-view="learning"]')`,'profile creation');
 await check('native modules and isolated profile',async()=>{
  const profile=await evaluate('window.campusDesktop.getActiveProfile()');assert.ok(profile.id);assert.equal(profile.name,'QA profesional aislada');
  assert.equal(await evaluate(`typeof window.ProfessionalShell.create`),'function');return {profileCreated:true};
 });
 await check('diagnostic answer survives immediate navigation and native reload',async()=>{
  await learning('diagnostic');await click('[data-learning-action="start-diagnostic"]');
  assert.equal(await evaluate(`document.querySelectorAll('[data-learning-question]').length`),24);
  const first=await evaluate(`(()=>{const e=document.querySelector('[data-learning-answer]');e.click();return {id:e.dataset.learningAnswer,value:Number(e.value)}})()`);
  await navigate('portfolio');
  await waitFor(`(async()=>{const p=await window.campusDesktop.getActiveProfile();return p.labs['professional-learning']?.activeAttempt?.answers[${JSON.stringify(first.id)}]===${first.value}})()`,'persisted diagnostic answer');
  await reload();await learning('diagnostic');
  assert.deepEqual(await evaluate(`(()=>{const e=document.querySelector('[data-learning-answer]:checked');return {id:e?.dataset.learningAnswer,value:Number(e?.value)}})()`),first);
  return {questions:24,navigate:true,reload:true};
 });
 await check('diagnostic submission and review persist',async()=>{
  await learning('diagnostic');
  await evaluate(`for(const group of document.querySelectorAll('[data-learning-question]'))group.querySelector('input').click()`);
  await click('[data-learning-action="submit-attempt"]');
  await waitFor(`!!document.querySelector('[data-learning-feedback]')`,'diagnostic feedback');
  await waitFor(`(async()=>{const p=await window.campusDesktop.getActiveProfile();const r=p.labs['professional-learning'];return r?.diagnostic&&r.history.length===1&&!r.activeAttempt&&Object.keys(r.reviews).length===24})()`,'submitted diagnostic record');
  return {history:1,scheduledReviews:24};
 });
 await check('calendar session survives navigation and reload',async()=>{
  await learning('calendar');
  await input('[name="session-title"]','Sesión técnica native QA');await input('[name="session-date"]','2030-12-01');await input('[name="session-minutes"]','45');
  await evaluate(`document.querySelector('[data-learning-form="session"]').requestSubmit()`);
  await navigate('portfolio');
  await waitFor(`(async()=>{const p=await window.campusDesktop.getActiveProfile();return p.labs['professional-learning']?.sessions.some(s=>s.title==='Sesión técnica native QA'&&s.date==='2030-12-01'&&s.minutes===45)})()`,'calendar session persistence');
  await reload();await learning('calendar');
  assert.match(await evaluate(`document.querySelector('.learning-sessions').textContent`),/Sesión técnica native QA/);
  await click('[data-learning-edit-session]');assert.equal(await evaluate(`document.querySelector('[name="session-minutes"]').value`),'45');
  return {sessionCreated:true,nativeReload:true,editable:true};
 });
 await check('Ctrl+K search opens and navigates to the actual system practice',async()=>{
  await prepare('search');assert.equal(await evaluate('document.activeElement.id'),'campus-global-query');
  await evaluate(`(()=>{const button=[...document.querySelectorAll('[data-search-index]')].find(e=>e.textContent.includes('Práctica'));if(!button)throw Error('No practice search result');button.click()})()`);
  assert.equal(await evaluate(`!!document.querySelector('[role="dialog"]')`),false);
  assert.match(await evaluate(`document.querySelector('h1').textContent`),/Procesos/i);
  await input('#practice-notes','Observación local temporal, sin datos personales.');
  await navigate('portfolio');
  await waitFor(`(async()=>{const p=await window.campusDesktop.getActiveProfile();return p.labs['practice-win-processes']?.notes==='Observación local temporal, sin datos personales.'})()`,'practice notes persistence');
  return {keyboard:true,navigation:true,practiceNotesSaved:true};
 });
 await check('system observer reports availability and performs only read-only observation',async()=>{
  const info=await evaluate('window.campusDesktop.systemPracticeInfo()');assert.deepEqual(info.kinds,['processes','services','network','events','permissions']);assert.equal(info.source,'real-host');
  await prepare('practice');await waitFor(`!document.querySelector('[data-practice-action="observe"]').disabled`,'observer availability');
  await click('[data-practice-action="observe"]');
  await waitFor(`document.querySelector('[data-practice-runtime]')?.getAttribute('aria-busy')==='false'`,'read-only processes observation',20000);
  const result=await evaluate(`(()=>{const output=document.querySelector('[data-practice-output]');return {available:output.textContent.includes('Observación real del equipo'),unavailable:output.textContent.includes('Observación no disponible'),rowCount:output.querySelectorAll('tbody tr').length}})()`);
  assert.ok(result.available||result.unavailable);assert.ok(result.rowCount<=30);
  await click('[data-practice-action="clear"]');assert.equal(await evaluate(`document.querySelectorAll('[data-practice-output] tbody tr').length`),0);
  const profile=await evaluate('window.campusDesktop.getActiveProfile()');assert.ok(!JSON.stringify(profile.labs).includes('ProcessName'));
  return {platform:info.platform,infoAvailable:info.available,...result,temporaryRowsDiscarded:true};
 });
 await check('VM doctor and both template statuses are read-only',async()=>{
  const doctor=await evaluate('window.campusDesktop.vmDoctor()');assert.equal(typeof doctor.ready,'boolean');assert.equal(typeof doctor.code,'string');
  await prepare('vms');await click('[data-vm-template="windows"] [data-vm-action="check"]');
  await waitFor(`document.querySelector('[data-vm-hub]')?.getAttribute('aria-busy')==='false'`,'VM doctor refresh',20000);
  const states=await evaluate(`(async()=>{const p=await window.campusDesktop.getActiveProfile();return Promise.all(['windows','linux'].map(templateId=>window.campusDesktop.vmStatus({profileId:p.id,templateId})))})()`);
  for(const state of states){assert.ok(['missing','unavailable'].includes(state.state));assert.equal(state.canStart,false);assert.equal(state.canStop,false);assert.equal(state.canSnapshot,false);assert.equal(state.canRestore,false);}
  return {doctorReady:doctor.ready,doctorCode:doctor.code,states:states.map(s=>({templateId:s.templateId,state:s.state,canCreate:s.canCreate})),mutations:0};
 });
 await check('portfolio offers PDF and HTML controls without opening native dialogs',async()=>{
  await navigate('portfolio');assert.match(await evaluate(`document.querySelector('h1').textContent`),/portafolio/i);
  for(const format of ['pdf','html'])assert.equal(await evaluate(`document.querySelector('[data-action="export-portfolio-${format}"]')?.disabled`),false);
  return {pdfControl:true,htmlControl:true,exportInvoked:false};
 });
 await check('native capture availability (visual inspection remains unverified)',async()=>{
  await capture('learning-plan','today');await capture('system-practice','practice');await capture('virtual-machines','vms');
  if(!report.visual.available)report.visual.reason='Native capture unavailable: '+[...new Set(report.visual.attempts.map(attempt=>attempt.reason))].join('; ')+'. Visual inspection remains unverified.';
  return {available:report.visual.available,verified:false,count:report.screenshots.length,reason:report.visual.reason};
 });
 await evaluate(fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8'));
 for(const target of ['today','diagnostic','exam','calendar','review','diagnostic-active','exam-active','systems','practice','campaign','vms','portfolio','search'])await check('accessibility and responsive layout: '+target,()=>audit(target));
 await check('read-only native boundary preserved',async()=>{assert.deepEqual(report.forbiddenCalls,[]);assert.equal(report.runtimeErrors.length,0,report.runtimeErrors.join('; '));return {forbiddenCalls:0,rendererErrors:0};});
 finish();
}
app.on('browser-window-created',(_event,window)=>{
 window.hide();window.on('show',()=>window.hide());window.webContents.setBackgroundThrottling(false);
 window.webContents.on('preload-error',(_event,_file,error)=>report.runtimeErrors.push(error.message));
 window.webContents.on('render-process-gone',(_event,details)=>report.runtimeErrors.push('renderer exited: '+details.reason));
 window.webContents.on('did-fail-load',(_event,code,message,url)=>report.runtimeErrors.push(`${code}:${message}:${url}`));
 window.webContents.once('did-finish-load',()=>{if(started||!window.webContents.getURL().startsWith('campus://app/src/renderer/index.html'))return;started=true;main=window;run().catch(finish);});
});
require('../desktop/main.cjs');
