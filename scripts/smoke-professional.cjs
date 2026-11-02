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
const {createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..');
const nextBatch=process.argv.includes('--next-batch');
const offscreen=process.argv.includes('--offscreen');
const minimumViewport=process.argv.includes('--minimum-viewport');
const permissionsOnly=process.argv.includes('--permissions-only');
const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'campus-professional-smoke-'));
app.setPath('userData',dataDir);
app.getAppPath=()=>root;
const report={protocol:'campus://app',windowMode:offscreen?'native-offscreen':'native-hidden',initialViewport:minimumViewport?{contentSize:[920,640],zoomFactor:1.25,adaptation:'Test-only in-memory BrowserWindow constructor options before first native load.'}:null,scope:permissionsOnly?'fresh permissions observation':nextBatch?'T7-T12 plus native functional regression':'all professional views',checks:[],accessibility:[],layout:[],screenshots:[],visual:{available:false,verified:false,reason:'Capture skipped; no visual inspection was performed.',attempts:[]},runtimeErrors:[],forbiddenCalls:[],nativeCalls:{}};
let main,started=false,finished=false;
const timer=setTimeout(()=>finish(new Error('Native professional smoke timed out.')),nextBatch?180000:300000);
const nativeHandle=ipcMain.handle.bind(ipcMain);
ipcMain.handle=(channel,handler)=>nativeHandle(channel,(event,arg)=>{
 report.nativeCalls[channel]=(report.nativeCalls[channel]||0)+1;
 if(/^campus:(recoverStore|recoverFromBackup|openRecoveryFolder|vm(Create|Start|Stop|Snapshot|Restore)|export|import|installUpdate|checkForUpdates|lab(Start|Stop|Reset|Open|Contain)|startRealLab|stopRealLab|resetRealLab|openRealLab|openMaterial)/.test(channel)){
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
async function change(selector,value){
 await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing input: '+${JSON.stringify(selector)});if(e.type==='checkbox')e.checked=${JSON.stringify(value)};else e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
}
async function settled(){await waitFor(`document.getElementById('save-status').textContent.includes('Guardado')`,'profile disk save');}
function dataSnapshot(){
 const result={};function visit(directory){if(!fs.existsSync(directory))return;for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);if(entry.isDirectory())visit(file);else{const stat=fs.statSync(file);result[path.relative(dataDir,file)]={bytes:stat.size,mtime:stat.mtimeMs,sha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex')};}}}visit(path.join(dataDir,'campus-data'));return result;
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
 if(target.startsWith('onboarding-')){
  await navigate('onboarding');const step=Number(target.slice(-1));
  for(let i=0;i<3;i++){const current=await evaluate(`Number(document.querySelector('.onboarding-panel h2').textContent[0])`);if(current===step)break;await click(`[data-onboarding-action="${current>step?'previous':'next'}"]`);await waitFor(`Number(document.querySelector('.onboarding-panel h2').textContent[0])===${current+(current>step?-1:1)}`,'onboarding step');}
  assert.equal(await evaluate(`Number(document.querySelector('.onboarding-panel h2').textContent[0])`),step);return '.onboarding-hub';
 }
 if(target.startsWith('preparation-')){
  await navigate('preparation');const certificate=target==='preparation-editor'?'cc':target.slice('preparation-'.length);
  await click(`[data-preparation-cert="${certificate}"]`);
  if(target==='preparation-editor')await click('[data-preparation-edit]');return '.preparation-hub';
 }
 if(target.startsWith('assessment-')){
  await navigate('assessment');const id=target.endsWith('-soc')?'soc-containment-review':'web-control-review';
  await click(`[data-assessment-action="case-${id}"]`);
  if(target.startsWith('assessment-preflight-')){if(await evaluate(`!!document.querySelector('[data-assessment-action="new"]')`))await click('[data-assessment-action="new"]');}
  else if(target==='assessment-draft'){
   if(await evaluate(`!!document.querySelector('[data-assessment-action="new"]')`))await click('[data-assessment-action="new"]');
   await fillPreflight();await click('[data-assessment-action="start"]');
   await waitFor(`!!document.querySelector('[data-assessment-report-form]')`,'assessment audit draft');
  }else await click(`[data-assessment-action="attempt-${id==='web-control-review'?'attempt-1':'attempt-2'}"]`);
  return '.assessment-hub';
 }
 if(target==='history'){await learning('history');return '.learning-hub';}
 if(target.startsWith('packet-')){await navigate('packet-analysis');await click(`[data-packet-case="${target.slice('packet-'.length)}"]`);await evaluate(`document.querySelector('[data-packet-attempt-summary]')?.closest('details').setAttribute('open','')`);return '.packet-hub';}
 if(target==='recovery'){await navigate('recovery');await waitFor(`document.querySelector('.recovery-panel')?.getAttribute('aria-busy')==='false'`,'recovery read-only status');return '.recovery-hub';}
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
 if(!minimumViewport){main.setContentSize(920,640);main.webContents.setZoomFactor(1.25);}
 if(main.webContents.isOffscreen()){main.webContents.startPainting();main.webContents.invalidate();}
 try{await waitFor(`Math.abs(innerWidth-736)<=2&&devicePixelRatio>=1.24`,'125% zoom applied to the minimum native viewport');}
 catch(error){error.message+=' '+JSON.stringify({nativeSize:main.getContentSize(),nativeZoom:main.webContents.getZoomFactor(),offscreen:main.webContents.isOffscreen(),renderer:await evaluate(`({innerWidth,devicePixelRatio})`)});throw error;}
 const renderedFrames=await evaluate(`Promise.race([new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(2)))),new Promise(resolve=>setTimeout(()=>resolve(0),300))])`);
 const layout=await evaluate(`(()=>{const e=document.documentElement;return {width:e.clientWidth,innerWidth:innerWidth,devicePixelRatio:devicePixelRatio,scroll:e.scrollWidth,overflow:e.scrollWidth>e.clientWidth+1}})()`);
 report.layout.push({target,zoom:main.webContents.getZoomFactor(),contentSize:main.getContentSize(),renderedFrames,...layout});
 if(!minimumViewport){main.webContents.setZoomFactor(1);main.setContentSize(1440,940);}
 if(target==='search')await click('[data-action="cancel-modal"]');
 if(target.endsWith('-active')){await click('[data-learning-action="request-abandon"]');await click('[data-learning-action="confirm-abandon"]');}
 if(target==='preparation-editor')await click('[data-preparation-action="clear-draft"]');
 assert.equal(layout.overflow,false,'Horizontal page overflow at minimum width and 125% zoom: '+target);
 const audits=report.accessibility.slice(-2);
 assert.ok(audits.every(result=>result.violations.length===0),'WCAG violations: '+JSON.stringify(audits.filter(result=>result.violations.length)));
}
async function fillPreflight(){
 for(const [name,value]of Object.entries({environment:'Caso sintético de QA sin ejecutar motores externos.',baseline:'Registro ficticio preparado para probar el guardado local.',scope:'Solo datos de prueba del perfil temporal y sin acciones externas.'}))await input('#assessment-'+name,value);
 await change('[name="scopeConfirmed"]',true);
}
async function permissionsObservation(){
 const directoryExisted=fs.existsSync(path.join(dataDir,'campus-data','system-practice'));
 assert.equal(directoryExisted,false,'The fresh profile must not pre-create the observer directory and mask first-use behavior.');
 const observation=await evaluate(`(async()=>{const p=await window.campusDesktop.getActiveProfile();const o=await window.campusDesktop.observeSystem({profileId:p.id,kind:'permissions'});return {kind:o.kind,platform:o.platform,source:o.source,state:o.state,rowCount:o.rows.length,columns:o.columns,limitations:o.limitations}})()`);
 assert.equal(observation.source,'real-host');assert.equal(observation.kind,'permissions');assert.ok(observation.rowCount<=30);
 assert.equal(observation.state,'available','Fresh native permissions observation must be available: '+JSON.stringify({directoryExisted,...observation}));
 return {directoryExisted,...observation};
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
  const modules=['ProfessionalShell','OnboardingHub','PreparationHub','AssessmentHub','PacketHub','RecoveryHub'];
  for(const module of modules)assert.equal(await evaluate(`typeof window[${JSON.stringify(module)}]?.create`),'function',module+' loaded by campus protocol');
  for(const method of ['recoveryStatus','recoverStore','recoverFromBackup','openRecoveryFolder'])assert.equal(await evaluate(`typeof window.campusDesktop[${JSON.stringify(method)}]`),'function');
  return {profileCreated:true,modules,recoveryBridgeMethods:4};
 });
 if(permissionsOnly){
  await check('fresh permissions observation is available through native IPC',permissionsObservation);
  await check('read-only native boundary preserved',async()=>{assert.deepEqual(report.forbiddenCalls,[]);assert.deepEqual(report.runtimeErrors,[]);return {forbiddenCalls:0,rendererErrors:0};});
  finish();return;
 }
 await check('three-step onboarding applies its certification plan without automatic engine checks',async()=>{
  const methods=['campus:vmDoctor','campus:realLabDoctor','campus:systemPracticeInfo','campus:observeSystem','campus:labStatus','campus:labCatalog'];
  const before=Object.fromEntries(methods.map(method=>[method,report.nativeCalls[method]||0]));
  await navigate('onboarding');await change('#onboarding-cert','ccst');await change('#onboarding-date','2030-12-01');await change('#onboarding-time','fixed');await change('#onboarding-minutes','420');
  await click('[data-onboarding-action="next"]');await waitFor(`document.querySelector('.onboarding-panel h2')?.textContent.startsWith('2.')`,'onboarding environments');
  await change('[name="onboarding-environment"][value="windows"]',true);
  await click('[data-onboarding-action="next"]');await waitFor(`document.querySelector('.onboarding-panel h2')?.textContent.startsWith('3.')`,'onboarding final step');
  await click('[data-onboarding-action="finish"]');await waitFor(`document.querySelector('#learning-title')?.textContent==='Diagnóstico personal'`,'onboarding plan and diagnosis');
  await waitFor(`(async()=>{const p=await window.campusDesktop.getActiveProfile();return p.labs['professional-onboarding']?.completed&&p.labs['professional-learning']?.settings.certificationId==='ccst'&&p.labs['professional-learning'].settings.weeklyMinutes===420})()`,'onboarding actual disk persistence');
  for(const method of methods)assert.equal(report.nativeCalls[method]||0,before[method],'onboarding must not call '+method+' automatically');
  return {steps:3,certification:'ccst',weeklyMinutes:420,automaticEngineChecks:0};
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
 await check('fresh permissions observation is available through native IPC',permissionsObservation);
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
 await check('five certification workspaces are read-only until an explicit plan choice',async()=>{
  await settled();const before=await evaluate('window.campusDesktop.getActiveProfile()');await navigate('preparation');
  let skills=0;for(const certificate of ['cc','ccst','security-plus','btl1','ejpt']){await click(`[data-preparation-cert="${certificate}"]`);const workspace=await evaluate(`({skills:document.querySelectorAll('[data-preparation-skill]').length,sources:document.querySelectorAll('[data-preparation-source]').length})`);skills+=workspace.skills;assert.ok(workspace.sources>0);}
  assert.equal(skills,27);const browsed=await evaluate('window.campusDesktop.getActiveProfile()');assert.equal(browsed.revision,before.revision,'Browsing certification workspaces must not write the profile');
  await click('[data-preparation-action="choose"]');await waitFor(`(async()=>{const p=await window.campusDesktop.getActiveProfile();return p.labs['professional-learning']?.settings.certificationId==='ejpt'&&p.labs['preparation-ledger']?.selectedCertificationId==='ejpt'})()`,'explicit certification plan save');
  return {certifications:5,selectedCompetencies:27,browseWrites:0,explicitPlanChoice:'ejpt'};
 });
 await check('preparation evidence drafts and edits persist through native store and reload',async()=>{
  await navigate('preparation');await click('[data-preparation-cert="cc"]');await click('[data-preparation-evidence="cc-controles"]');
  const procedure='Comparé dos copias ficticias en el perfil temporal de QA.';
  await input('[data-preparation-form] [name="procedure"]',procedure);await navigate('portfolio');
  await waitFor(`(async()=>{const p=await window.campusDesktop.getActiveProfile();return p.labs['preparation-ledger']?.entryDraft.procedure===${JSON.stringify(procedure)}})()`,'ledger draft on disk');
  await reload();await navigate('preparation');await click('[data-preparation-cert="cc"]');assert.equal(await evaluate(`document.querySelector('[data-preparation-form] [name="procedure"]').value`),procedure);
  for(const [name,value]of Object.entries({date:'2030-12-01',environment:'Sandbox ficticio del perfil temporal',result:'Las copias ficticias permitieron comprobar el flujo de guardado.',interpretation:'No demuestra ejecución externa ni dominio de la competencia.',help:'independent',review:'pending'}))await input(`[data-preparation-form] [name="${name}"]`,value);
  await evaluate(`document.querySelector('[data-preparation-form]').requestSubmit()`);
  await waitFor(`(async()=>{const p=await window.campusDesktop.getActiveProfile();return p.labs['preparation-ledger']?.entries.length===1})()`,'new ledger entry');
  await click('[data-preparation-edit]');const interpretation='Interpretación revisada: sigue pendiente contrastar evidencia y revisión externa.';
  await input('[data-preparation-form] [name="interpretation"]',interpretation);await evaluate(`document.querySelector('[data-preparation-form]').requestSubmit()`);await navigate('portfolio');
  await waitFor(`(async()=>{const p=await window.campusDesktop.getActiveProfile();const e=p.labs['preparation-ledger']?.entries[0];return e?.interpretation===${JSON.stringify(interpretation)}&&e.help==='independent'&&e.review==='pending'})()`,'ledger edited evidence');
  return {draftReload:true,entries:1,edited:true,review:'pending',help:'independent'};
 });
 await check('assessment preflight and report drafts survive remount and retain help declarations separately',async()=>{
  await navigate('assessment');await input('#assessment-environment','Entorno ficticio de QA sin ejecución del objetivo.');await navigate('portfolio');
  await waitFor(`(async()=>{const p=await window.campusDesktop.getActiveProfile();return p.labs['independent-assessment']?.setupDrafts['web-control-review'].environment==='Entorno ficticio de QA sin ejecución del objetivo.'})()`,'assessment preflight draft');
  await navigate('assessment');assert.equal(await evaluate(`document.querySelector('#assessment-environment').value`),'Entorno ficticio de QA sin ejecución del objetivo.');
  await fillPreflight();await click('[data-assessment-action="start"]');await waitFor(`!!document.querySelector('[data-assessment-report-form]')`,'assessment first attempt');
  const procedure='Probé únicamente el guardado del informe, sin ejecutar el objetivo externo.';
  await input('#assessment-procedure',procedure);await navigate('portfolio');
  await waitFor(`(async()=>{const p=await window.campusDesktop.getActiveProfile();return p.labs['independent-assessment']?.attempts[0]?.report.procedure===${JSON.stringify(procedure)}})()`,'assessment report draft');
  await navigate('assessment');assert.equal(await evaluate(`document.querySelector('#assessment-procedure').value`),procedure);
  const fields=['procedure','failedHypotheses','findings','reproducibleEvidence','impact','remediation','limitations','executiveSummary','assistanceLog','selfReview'];
  for(const field of fields)await input('#assessment-'+field,'Síntesis ficticia de QA: no ejecuté el objetivo y queda pendiente verificación externa.');
  await change('#assessment-independence','independent');await change('[name="reviewStatus"]',true);await click('[data-assessment-action="submit"]');
  await waitFor(`(async()=>{const p=await window.campusDesktop.getActiveProfile();return !!p.labs['independent-assessment']?.attempts[0]?.submittedAt})()`,'assessment submitted report');
  const original=await evaluate(`(async()=>{const p=await window.campusDesktop.getActiveProfile();return p.labs['independent-assessment'].attempts[0]})()`);
  assert.equal(await evaluate(`document.querySelector('#assessment-procedure').readOnly`),true);await click('[data-assessment-action="guidance"]');await waitFor(`!!document.querySelector('[data-assessment-guidance]')`,'post-submission guidance');
  await waitFor(`(async()=>{const p=await window.campusDesktop.getActiveProfile();return p.labs['independent-assessment']?.attempts[0]?.guidanceViews===1})()`,'guidance exposure on disk');
  const guided=await evaluate(`(async()=>{const p=await window.campusDesktop.getActiveProfile();return p.labs['independent-assessment'].attempts[0]})()`);
  assert.equal(guided.independence,'independent');assert.equal(guided.submittedAt,original.submittedAt);assert.deepEqual(guided.report,original.report);
  assert.match(await evaluate(`document.querySelector('[data-assessment-exposure]').textContent`),/Declaración original del alumno: sin ayuda/);assert.match(await evaluate(`document.querySelector('.assessment-history').textContent`),/Con orientación registrada/);
  await click('[data-assessment-action="case-soc-containment-review"]');await fillPreflight();await click('[data-assessment-action="start"]');
  for(const field of fields)await input('#assessment-'+field,'Segundo caso ficticio de QA con asistencia declarada; ninguna ejecución externa.');
  await change('#assessment-independence','assisted');await change('[name="reviewStatus"]',true);await click('[data-assessment-action="submit"]');
  await waitFor(`(async()=>{const p=await window.campusDesktop.getActiveProfile();const a=p.labs['independent-assessment']?.attempts;return a?.length===2&&!!a[1].submittedAt&&a[1].independence==='assisted'})()`,'second assessment with distinct help');
  return {preflightRemount:true,reportRemount:true,submittedReports:2,originalDeclarationPreserved:true,postSubmissionGuidance:1,secondDeclaration:'assisted',enginesExecuted:false};
 });
 await check('learning history separates question results from practical reports and is read-only',async()=>{
  await settled();const before=await evaluate('window.campusDesktop.getActiveProfile()');await learning('history');
  assert.match(await evaluate(`document.querySelector('h1').textContent`),/avance/);assert.ok(await evaluate(`!!document.querySelector('[data-learning-history-detail]')`));
  const practical=await evaluate(`document.querySelector('[data-learning-practical]').textContent`);assert.match(practical,/Práctica independiente/);assert.match(practical,/Con orientación registrada|guided|orientación/i);assert.match(practical,/asist|assisted/i);
  const after=await evaluate('window.campusDesktop.getActiveProfile()');assert.equal(after.revision,before.revision);assert.deepEqual(after.labs['professional-learning'],before.labs['professional-learning']);
  return {questionHistory:true,practicalHistory:true,combinedGrade:false,profileWrites:0};
 });
 await check('packet drafts and immutable first reports save before correction controls unlock',async()=>{
  const fields=['filters','timeline','evidence','interpretation','alternative'];
  for(const id of ['guiado','transferencia']){
   await navigate('packet-analysis');await click(`[data-packet-case="${id}"]`);
   assert.equal(await evaluate(`document.querySelector('[data-packet-action="correction-open"]').disabled`),true);
   for(const field of fields)await input(`[data-packet-field="${field}"]`,field==='evidence'?`Caso ${id}: paquete 3 y registros sintéticos; sin atribuir eventos del host.`:`Caso ${id}: síntesis ficticia de QA para comprobar borradores y sus límites.`);
   await navigate('portfolio');await waitFor(`(async()=>{const p=await window.campusDesktop.getActiveProfile();return p.labs['packet-casework']?.cases[${JSON.stringify(id)}].draft.evidence.includes('paquete 3')})()`,'packet draft on disk');
   await navigate('packet-analysis');await click(`[data-packet-case="${id}"]`);assert.match(await evaluate(`document.querySelector('[data-packet-field="evidence"]').value`),/paquete 3/);
   await click('[data-packet-action="submit"]');await waitFor(`(async()=>{const p=await window.campusDesktop.getActiveProfile();return !!p.labs['packet-casework']?.cases[${JSON.stringify(id)}].attempt})()`,'saved packet declaration');
   await waitFor(`!document.querySelector('[data-packet-action="correction-open"]').disabled&&!document.querySelector('[data-packet-action="correction-export"]').disabled`,'correction unlock after durable save');
   assert.match(await evaluate(`document.querySelector('[data-packet-attempt-status]').textContent`),/Guardado local confirmado/);
   const original=await evaluate(`(async()=>{const p=await window.campusDesktop.getActiveProfile();return p.labs['packet-casework'].cases[${JSON.stringify(id)}].attempt})()`);
   await input('[data-packet-field="interpretation"]','Revisión posterior del borrador: el primer informe debe permanecer inmutable.');await navigate('portfolio');
   await waitFor(`(async()=>{const p=await window.campusDesktop.getActiveProfile();return p.labs['packet-casework']?.cases[${JSON.stringify(id)}].draft.interpretation.startsWith('Revisión posterior')})()`,'packet revision on disk');
   const revised=await evaluate(`(async()=>{const p=await window.campusDesktop.getActiveProfile();return p.labs['packet-casework'].cases[${JSON.stringify(id)}]})()`);assert.deepEqual(revised.attempt,original);assert.equal(revised.guidanceUsed,false);
  }
  return {cases:2,draftsPersisted:true,firstReportsImmutable:true,correctionUnlockedAfterSave:true,correctionInvoked:false,exportInvoked:false};
 });
 await check('healthy recovery view and repeated native status are read-only',async()=>{
  await settled();const before=dataSnapshot();await prepare('recovery');const status=await evaluate('window.campusDesktop.recoveryStatus()');assert.equal(status.state,'healthy');
  await click('[data-recovery-action="refresh"]');await waitFor(`document.querySelector('.recovery-panel')?.getAttribute('aria-busy')==='false'`,'recovery refresh');
  assert.deepEqual(dataSnapshot(),before,'Recovery inspection must not modify files or mtimes');return {state:status.state,statusWrites:0,candidates:status.candidates.length};
 });
 if(process.argv.includes('--capture'))await check('native capture availability (visual inspection remains unverified)',async()=>{
  await capture('learning-plan','today');await capture('system-practice','practice');await capture('virtual-machines','vms');
  if(!report.visual.available)report.visual.reason='Native capture unavailable: '+[...new Set(report.visual.attempts.map(attempt=>attempt.reason))].join('; ')+'. Visual inspection remains unverified.';
  return {available:report.visual.available,verified:false,count:report.screenshots.length,reason:report.visual.reason};
 });
 await evaluate(fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8'));
 const legacyTargets=['today','diagnostic','exam','calendar','review','diagnostic-active','exam-active','systems','practice','campaign','vms','portfolio','search'];
 const newTargets=['onboarding-1','onboarding-2','onboarding-3','preparation-cc','preparation-ccst','preparation-security-plus','preparation-btl1','preparation-ejpt','preparation-editor','assessment-preflight-web','assessment-preflight-soc','assessment-report-web','assessment-report-soc','assessment-draft','history','packet-guiado','packet-transferencia','recovery'];
 for(const target of (nextBatch?newTargets:[...legacyTargets,...newTargets]))await check('accessibility and responsive layout: '+target,()=>audit(target));
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
if(offscreen||minimumViewport){
 // Only the test window's compositor mode changes. Keep its real source filename,
 // hardened webPreferences, protocol registration, preload, IPC trust and store.
 const Module=require('node:module'),filename=path.join(root,'desktop','main.cjs');
 let source=fs.readFileSync(filename,'utf8');const needle='webPreferences:{...preferences,preload:';
 assert.equal(source.split(needle).length,2,'Expected exactly one native main-window preferences block');
 if(minimumViewport){const size='width:1440,height:940,minWidth:920,minHeight:640,';assert.equal(source.split(size).length,2,'Expected exactly one native main-window size block');source=source.replace(size,'width:920,height:640,useContentSize:true,minWidth:920,minHeight:640,');}
 const nativeMain=new Module(filename,module);nativeMain.filename=filename;nativeMain.paths=Module._nodeModulePaths(path.dirname(filename));
 nativeMain._compile(source.replace(needle,'webPreferences:{...preferences,'+(offscreen?'offscreen:true,':'')+(minimumViewport?'zoomFactor:1.25,':'')+'preload:'),filename);
}else require('../desktop/main.cjs');
