'use strict';
// Real campus:// main/preload/IPC/store recovery. Only the native confirmation
// and chooser adapters are replaced; no operating-system dialogs are displayed.
const {app,ipcMain,dialog}=require('electron');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const offscreen=process.argv.includes('--offscreen');
const userData=fs.mkdtempSync(path.join(os.tmpdir(),'campus-native-recovery-'));
const directory=path.join(userData,'campus-data');
const damaged='{damaged primary for isolated native recovery';
// Synchronous child setup finishes before Electron becomes ready and main
// registers its privileged protocol. The child uses the production ProfileStore.
const seedSource=`(async()=>{const fs=require('node:fs/promises');const path=require('node:path');const {ProfileStore}=require(${JSON.stringify(path.join(root,'desktop','store.cjs'))});const directory=process.env.CAMPUS_RECOVERY_SEED;const store=new ProfileStore(directory);let profile=await store.createProfile('Recuperación nativa aislada');profile=await store.saveProfile({id:profile.id,expectedRevision:profile.revision,study:profile.study,labs:{'native-recovery-evidence':{notes:'Evidencia conservada en la copia válida.'}}});await store.renameProfile({id:profile.id,name:profile.name});await store.flush();await fs.writeFile(path.join(directory,'profiles.json'),${JSON.stringify(damaged)});process.stdout.write(JSON.stringify({id:profile.id,name:profile.name,revision:profile.revision}));})().catch(error=>{console.error(error);process.exit(1)});`;
const expected=JSON.parse(execFileSync(process.execPath,['-e',seedSource],{encoding:'utf8',windowsHide:true,maxBuffer:1024*1024,env:{...process.env,ELECTRON_RUN_AS_NODE:'1',CAMPUS_RECOVERY_SEED:directory}}));
app.disableHardwareAcceleration();
app.setPath('userData',userData);
app.getAppPath=()=>root;
const report={protocol:'campus://app',windowMode:offscreen?'offscreen-native':'hidden-native',dialogAdapterStub:true,manualOSUI:false,visual:{available:false,verified:false,reason:'Native capture is intentionally omitted; visual inspection remains unverified.'},checks:[],accessibility:[],layout:[],dialogs:[],ipcCalls:[],forbiddenCalls:[],runtimeErrors:[]};
let main,started=false,finished=false;
const timeout=setTimeout(()=>finish(new Error('Native recovery smoke timed out.')),120000);
const responses=[0,1];
dialog.showMessageBox=async(_window,options)=>{
 assert.equal(options.message,'¿Restaurar la copia local elegida?','Only the recovery confirmation adapter is permitted.');
 assert.equal(options.defaultId,0);assert.equal(options.cancelId,0);
 const response=responses.shift();assert.ok(response===0||response===1,'Unexpected extra confirmation');
 report.dialogs.push({kind:'messageBox',adapter:'stub',response});return {response,checkboxChecked:false};
};
dialog.showOpenDialog=async(_window,options)=>{
 assert.match(options.title,/respaldo JSON/i,'Only the recovery chooser adapter is permitted.');
 report.dialogs.push({kind:'openDialog',adapter:'stub',canceled:true});return {canceled:true,filePaths:[]};
};
dialog.showSaveDialog=async()=>{report.forbiddenCalls.push('native save dialog');throw Error('Native save dialogs are forbidden in recovery smoke.');};
dialog.showErrorBox=(title,message)=>{report.runtimeErrors.push('Native error box prevented: '+title+': '+message);};
const allow=new Set(['getAppInfo','getActiveProfile','listProfiles','recoveryStatus','recoverStore','recoverFromBackup','readyToClose']);
const nativeHandle=ipcMain.handle.bind(ipcMain);
ipcMain.handle=(channel,handler)=>nativeHandle(channel,(event,arg)=>{
 const method=channel.replace(/^campus:/,'');report.ipcCalls.push(method);
 if(!allow.has(method)){report.forbiddenCalls.push(channel);throw Error('Operation forbidden in recovery smoke: '+channel);}
 return handler(event,arg);
});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function disk(){return Object.fromEntries(fs.readdirSync(directory).sort().map(name=>{const file=path.join(directory,name),stat=fs.lstatSync(file);return [name,{size:stat.size,mtime:stat.mtimeMs,type:stat.isFile()?'file':'directory',hash:stat.isFile()?hash(fs.readFileSync(file)):null}];}));}
const beforeBootstrap=disk();
function finish(error){
 if(finished)return;finished=true;clearTimeout(timeout);
 if(error)report.checks.push({name:'harness',ok:false,error:error.stack||error.message});
 const ok=report.checks.every(check=>check.ok)&&report.accessibility.every(audit=>audit.violations.length===0)&&report.layout.every(layout=>!layout.overflow)&&report.forbiddenCalls.length===0&&report.runtimeErrors.length===0;
 console.log(ok?'CAMPUS_RECOVERY_SMOKE_OK':'CAMPUS_RECOVERY_SMOKE_FAIL',JSON.stringify(report));app.exit(ok?0:1);
}
async function evaluate(source){let timer;try{return await Promise.race([main.webContents.executeJavaScript(source),new Promise((_resolve,reject)=>{timer=setTimeout(()=>reject(Error('Renderer evaluation did not complete within 15 seconds.')),15000);})]);}finally{clearTimeout(timer);}}
async function waitFor(expression,label,milliseconds=10000){const end=Date.now()+milliseconds;do{const value=await evaluate(expression);if(value)return value;await new Promise(resolve=>setTimeout(resolve,30));}while(Date.now()<end);throw Error('Timed out: '+label);}
async function check(name,operation){try{const evidence=await operation();report.checks.push({name,ok:true,...(evidence===undefined?{}:{evidence})});}catch(error){report.checks.push({name,ok:false,error:error.stack||error.message});}console.log('CAMPUS_RECOVERY_CHECK',JSON.stringify(report.checks.at(-1)));}
async function click(selector){await evaluate(`(()=>{const element=document.querySelector(${JSON.stringify(selector)});if(!element||element.disabled)throw Error('Missing or disabled recovery control: '+${JSON.stringify(selector)});element.click();})()`);}
async function idle(){await waitFor(`document.body.getAttribute('aria-busy')!=='true'&&document.querySelector('.recovery-panel')?.getAttribute('aria-busy')==='false'`,'recovery UI settles');}
async function audit(target){
 await evaluate(fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8'));
 for(const theme of ['light','dark']){
  await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)};document.documentElement.dataset.motion='reduced'`);
  await waitFor(`document.documentElement.dataset.theme===${JSON.stringify(theme)}&&getComputedStyle(document.querySelector('.recovery-hub')).display!=='none'`,'recovery theme styles applied');
  const result=await evaluate(`(async()=>{const result=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return {theme:document.documentElement.dataset.theme,motion:document.documentElement.dataset.motion,violations:result.violations.map(violation=>({id:violation.id,impact:violation.impact,nodes:violation.nodes.map(node=>({target:node.target,summary:node.failureSummary}))}))}})()`);
  report.accessibility.push({target,...result});
 }
 const beforeViewportReload=disk();
 main.setContentSize(920,640);main.webContents.setZoomFactor(1.25);
 // A native reload applies pending hidden-window visual properties. It also
 // rechecks corrupt/healthy bootstrap using the same real protocol and store.
 const loaded=new Promise(resolve=>main.webContents.once('did-finish-load',resolve));main.webContents.reload();await loaded;
 await waitFor(`!!document.querySelector('.recovery-hub')||!!document.querySelector('#navigation [data-view="recovery"]')`,'recovery viewport reload adopts current data');
 if(!await evaluate(`!!document.querySelector('.recovery-hub')`))await click('#navigation [data-view="recovery"]');
 await idle();assert.deepEqual(disk(),beforeViewportReload,'Viewport reload must not write recovery data.');
 await waitFor(`Math.abs(innerWidth-736)<=2&&devicePixelRatio>=1.24`,'minimum native viewport at 125%');
 const layout=await evaluate(`(()=>{const element=document.documentElement;return {innerWidth,devicePixelRatio,width:element.clientWidth,scroll:element.scrollWidth,overflow:element.scrollWidth>element.clientWidth+1}})()`);
 report.layout.push({target,zoom:main.webContents.getZoomFactor(),contentSize:main.getContentSize(),nativeReloadForViewport:true,storeWrites:0,...layout});
 main.webContents.setZoomFactor(1);main.setContentSize(1440,940);
 assert.equal(layout.overflow,false,'Recovery page overflow at minimum width and 125%.');assert.ok(report.accessibility.slice(-2).every(result=>result.violations.length===0),'Recovery WCAG violations: '+JSON.stringify(report.accessibility.slice(-2)));
}
async function run(){
 assert.match(main.webContents.getURL(),/^campus:\/\/app\/src\/renderer\/index\.html/);
 await waitFor(`!!window.campusDesktop&&!!window.RecoveryHub&&!!document.querySelector('.recovery-hub')`,'corrupt-store recovery bootstrap');await idle();
 await check('corrupt primary bootstraps recovery without creating or writing a profile',async()=>{
  assert.match(await evaluate(`document.querySelector('h1').textContent`),/recuperación/i);assert.equal(await evaluate(`document.querySelectorAll('#navigation [data-view]').length`),0);
  assert.equal(await evaluate(`document.querySelectorAll('[data-recovery-id]').length`)>0,true);
  assert.deepEqual(disk(),beforeBootstrap);assert.equal(fs.readFileSync(path.join(directory,'profiles.json'),'utf8'),damaged);return {bootstrapRecoveryHub:true,profileCreated:false,storeWrites:0};
 });
 await check('status inspection preserves every store file hash size and mtime',async()=>{
  const before=disk();const status=await evaluate('window.campusDesktop.recoveryStatus()');assert.equal(status.state,'corrupt');assert.ok(status.candidates.some(candidate=>candidate.profileCount===1&&candidate.activeProfileName===expected.name));
  assert.equal(JSON.stringify(status).includes(directory),false);assert.deepEqual(disk(),before);
  await click('[data-recovery-action="refresh"]');await idle();assert.deepEqual(disk(),before);return {state:status.state,candidates:status.candidates.length,storeWrites:0,hostPathsExposed:false};
 });
 await check('corrupt recovery accessibility and responsive layout',()=>audit('recovery-corrupt'));
 await check('canceling local restore through the dialog adapter preserves bytes and UI',async()=>{
  const before=disk();await click('[data-recovery-id]');await idle();assert.equal(report.dialogs.filter(dialog=>dialog.kind==='messageBox').length,1);assert.equal(report.dialogs[0].response,0);
  assert.deepEqual(disk(),before);assert.ok(await evaluate(`!!document.querySelector('.recovery-hub')`));return {canceled:true,storeWrites:0,dialogAdapterStub:true,manualOSUI:false};
 });
 await check('canceling the external chooser performs no store writes',async()=>{
  const before=disk();await click('[data-recovery-action="external"]');await idle();assert.ok(report.dialogs.some(dialog=>dialog.kind==='openDialog'&&dialog.canceled));assert.deepEqual(disk(),before);return {canceled:true,storeWrites:0,dialogAdapterStub:true,hostChooserDisplayed:false};
 });
 await check('confirmed local restore preserves corruption and adopts the recovered profile',async()=>{
  await evaluate(`window.__nativeRecoveryPriorHub=document.querySelector('.recovery-hub')`);
  await click('[data-recovery-id]');
  await waitFor(`document.body.getAttribute('aria-busy')!=='true'&&!!document.querySelector('#navigation [data-view="learning"]')`,'restored profile adoption');
  const recovered=await evaluate('window.campusDesktop.getActiveProfile()');assert.equal(recovered.id,expected.id);assert.equal(recovered.name,expected.name);assert.equal(recovered.revision,expected.revision);assert.equal(recovered.labs['native-recovery-evidence'].notes,'Evidencia conservada en la copia válida.');
  assert.equal(await evaluate(`window.__nativeRecoveryPriorHub.isConnected`),false);assert.match(await evaluate(`document.getElementById('active-profile').textContent`),/Recuperación nativa aislada/);
  const preserved=fs.readdirSync(directory).filter(name=>name.startsWith('profiles.preserved.'));assert.equal(preserved.length,1);assert.equal(fs.readFileSync(path.join(directory,preserved[0]),'utf8'),damaged);
  const current=JSON.parse(fs.readFileSync(path.join(directory,'profiles.json'),'utf8'));assert.equal(current.activeProfileId,expected.id);assert.equal(current.profiles[expected.id].labs['native-recovery-evidence'].notes,'Evidencia conservada en la copia válida.');
  assert.equal(report.dialogs.filter(dialog=>dialog.kind==='messageBox').at(-1).response,1);
  return {restored:true,profileAdopted:true,previousHubDetached:true,internalEpochNotExposed:true,corruptOriginalPreserved:true,dialogAdapterStub:true,manualOSUI:false};
 });
 await check('native reload reopens the restored store and healthy recovery remains read-only',async()=>{
  const loaded=new Promise(resolve=>main.webContents.once('did-finish-load',resolve));main.webContents.reload();await loaded;
  await waitFor(`!!document.querySelector('#navigation [data-view="recovery"]')`,'profile adoption after native reload');
  const before=disk();await click('#navigation [data-view="recovery"]');await idle();const status=await evaluate('window.campusDesktop.recoveryStatus()');assert.equal(status.state,'healthy');assert.deepEqual(disk(),before);
  assert.equal((await evaluate('window.campusDesktop.getActiveProfile()')).id,expected.id);await click('[data-recovery-action="refresh"]');await idle();assert.deepEqual(disk(),before);
  return {nativeReload:true,state:status.state,storeWritesAfterRestore:0,preservedCopies:status.preservedCopies};
 });
 await check('healthy recovery accessibility and responsive layout',()=>audit('recovery-healthy'));
 await check('recovery-only native boundary preserved',async()=>{assert.deepEqual(report.forbiddenCalls,[]);assert.deepEqual(report.runtimeErrors,[]);assert.equal(responses.length,0);return {unexpectedDialogs:0,VMCalls:0,exports:0,ordinaryProfileSaves:report.ipcCalls.filter(method=>method==='saveProfile').length};});
 finish();
}
app.on('browser-window-created',(_event,window)=>{
 window.hide();window.on('show',()=>window.hide());window.webContents.setBackgroundThrottling(false);
 window.webContents.on('preload-error',(_event,_file,error)=>report.runtimeErrors.push(error.message));window.webContents.on('render-process-gone',(_event,details)=>report.runtimeErrors.push('Renderer exited: '+details.reason));window.webContents.on('did-fail-load',(_event,code,message,url)=>report.runtimeErrors.push(`${code}:${message}:${url}`));
 window.webContents.once('did-finish-load',()=>{if(started||!window.webContents.getURL().startsWith('campus://app/src/renderer/index.html'))return;started=true;main=window;run().catch(finish);});
});
if(offscreen){
 // Only this helper's native window painting mode changes in memory. Resource
 // protocol, sandbox, context isolation, preload, IPC and ProfileStore stay real.
 const Module=require('node:module'),filename=path.join(root,'desktop','main.cjs');
 const source=fs.readFileSync(filename,'utf8'),adapted=source.replace('webPreferences:{...preferences,preload:','webPreferences:{...preferences,offscreen:true,preload:');
 assert.notEqual(adapted,source,'The own-window offscreen adaptation must match exactly.');
 const nativeMain=new Module(filename,module);nativeMain.filename=filename;nativeMain.paths=Module._nodeModulePaths(path.dirname(filename));nativeMain._compile(adapted,filename);
}else require('../desktop/main.cjs');
