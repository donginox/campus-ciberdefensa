'use strict';
// Manual native smoke: node tests/tutor-tool-native.cjs (Linux: xvfb-run -a node ...).
// Its only filesystem writes are inside a temporary Electron userData directory.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
if(!process.versions.electron){
 const {spawnSync}=require('node:child_process');
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'campus-tutor-native-'));
 const env={...process.env,CAMPUS_TUTOR_SMOKE_DIRECTORY:directory};delete env.ELECTRON_RUN_AS_NODE;
 try{const result=spawnSync(require('electron'),[__filename],{env,encoding:'utf8',timeout:20000,windowsHide:true});process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');if(result.error)throw result.error;process.exitCode=result.status??1}
 finally{if(path.dirname(directory)!==path.resolve(os.tmpdir())||!path.basename(directory).startsWith('campus-tutor-native-'))throw Error('Unexpected native smoke directory.');fs.rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100})}
}else{
 const {app,BrowserWindow}=require('electron');const assert=require('node:assert/strict');
 const {TutorExchange}=require('../desktop/tutor-exchange.cjs');const Packet=require('../src/shared/packet-case-core.js');
 app.disableHardwareAcceleration();app.setPath('userData',process.env.CAMPUS_TUTOR_SMOKE_DIRECTORY);
 let finished=false;const timer=setTimeout(()=>finish(Error('Native tutor tool timed out.')),12000);
 function finish(error,result){if(finished)return;finished=true;clearTimeout(timer);console.log(error?'CAMPUS_TUTOR_NATIVE_FAIL':'CAMPUS_TUTOR_NATIVE_OK',JSON.stringify(error?{error:error.stack||error.message}:result));app.exit(error?1:0)}
 app.whenReady().then(async()=>{
  const win=new BrowserWindow({show:false,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});
  win.webContents.session.setPermissionRequestHandler((_web,_permission,callback)=>callback(false));
  let record=Packet.updateDraft(null,'guiado',{filters:'Filtro propio documentado para este análisis.',timeline:'Línea de tiempo con hechos propios documentados.',evidence:'El paquete 3 muestra la observación documentada.',interpretation:'<img src=x onerror=alert(1)> Interpretación limitada.',alternative:'Otra hipótesis compatible que debe contrastarse.'});record=Packet.submit(record,'guiado','2026-11-02T10:00:00.000Z');
  const profile={id:'smoke',revision:1,labs:{'packet-casework':record}},exchange=new TutorExchange(),packet=exchange.exportPackage(profile,'packet-casework:guiado');
  await win.loadFile(path.join(__dirname,'../assets/materials/tutor-review.html'));
  const result=await win.webContents.executeJavaScript(`(async()=>{
   const packet=${JSON.stringify(packet)};
   async function open(value){const transfer=new DataTransfer();transfer.items.add(new File([JSON.stringify(value)],'paquete.json',{type:'application/json'}));const input=document.getElementById('package-file');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));for(let i=0;i<200&&document.getElementById('tool-status').textContent.includes('Verificando');i++)await new Promise(r=>setTimeout(r,5));}
   await open(packet);const verified=document.getElementById('tool-status').textContent.includes('verificado'),escaped=!document.querySelector('#original-report img');
   document.getElementById('reviewer-name').value='Tutora nativa';document.querySelector('[data-section-comment]').value='Precisá los filtros para reproducir el análisis.';document.getElementById('next-practice').value='Practicá con el caso de transferencia.';document.getElementById('feedback-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
   const feedback=document.getElementById('feedback-json').value,blobDownload=document.getElementById('download-feedback').href.startsWith('blob:');
   packet.content.sections.evidence='Informe alterado en tránsito con otra interpretación.';await open(packet);
   return {protocol:location.protocol,webcrypto:!!crypto.subtle,verified,escaped,feedback,blobDownload,tamperedRejected:!document.getElementById('tool-error').hidden&&document.getElementById('feedback-form').hidden};
  })()`);
  assert.equal(result.protocol,'file:');for(const key of ['webcrypto','verified','escaped','blobDownload','tamperedRejected'])assert.equal(result[key],true,key);
  const preview=exchange.preview(profile,result.feedback);assert.equal(preview.feedback.reviewer.name,'Tutora nativa');
  await win.webContents.executeJavaScript(fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8'));
  const violations=await win.webContents.executeJavaScript(`axe.run(document).then(result=>result.violations.map(row=>row.id))`);assert.deepEqual(violations,[]);
  finish(null,{protocol:result.protocol,webcrypto:true,canonicalHashVerified:true,feedbackAccepted:true,tamperedRejected:true,accessibilityViolations:violations});
 }).catch(error=>finish(error));
}
