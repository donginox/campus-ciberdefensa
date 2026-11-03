'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');const {webcrypto}=require('node:crypto');const {TextEncoder}=require('node:util');const axe=require('axe-core');
const {TutorExchange}=require('../desktop/tutor-exchange.cjs');const Packet=require('../src/shared/packet-case-core.js');
const tick=()=>new Promise(r=>setTimeout(r,10));
function fixture(){let r=Packet.updateDraft(null,'guiado',{filters:'Filtro propio documentado para esta revisión.',timeline:'Línea de tiempo de los hechos observados.',evidence:'En el paquete 3 observé el hecho documentado.',interpretation:'<img src=x onerror=alert(1)> Observación documentada.',alternative:'Otra hipótesis compatible con los datos observados.'});r=Packet.submit(r,'guiado','2026-11-02T10:00:00.000Z');return {id:'one',revision:1,labs:{'packet-casework':r}}}
function boot(){const file=path.join(__dirname,'../assets/materials/tutor-review.html');assert.ok(fs.existsSync(file),'An offline tutor tool must open packages and generate feedback');const dom=new JSDOM(fs.readFileSync(file,'utf8'),{url:'file:///tutor-review.html',runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window;Object.defineProperty(w.crypto,'subtle',{value:webcrypto.subtle});w.TextEncoder=TextEncoder;w.URL.createObjectURL=()=> 'blob:local-feedback';w.URL.revokeObjectURL=()=>{};for(const s of w.document.querySelectorAll('script'))w.eval(s.textContent);return {w,d:w.document,close:()=>w.close()}}
async function upload(c,packet){const file=new c.w.File([JSON.stringify(packet)],'paquete.json',{type:'application/json'}),input=c.d.querySelector('#package-file');Object.defineProperty(input,'files',{value:[file],configurable:true});input.dispatchEvent(new c.w.Event('change',{bubbles:true}));for(let i=0;i<100&&c.d.querySelector('#tool-status').textContent.includes('Verificando');i++)await tick();}
test('offline FileReader/WebCrypto validates native canonical SHA256, escapes original, and emits accepted feedback JSON',async()=>{
 const c=boot(),exchange=new TutorExchange(),profile=fixture(),packet=exchange.exportPackage(profile,'packet-casework:guiado');
 await upload(c,packet);assert.match(c.d.querySelector('#tool-status').textContent,/verificado/i);assert.equal(c.d.querySelector('#original-report img'),null);assert.match(c.d.querySelector('#original-report').textContent,/<img src=x/);
 c.d.querySelector('#reviewer-name').value='Tutora local';c.d.querySelector('[data-section-comment]').value='Explicá el filtro para poder reproducirlo.';c.d.querySelector('#next-practice').value='Repetí con el caso de transferencia.';
 c.d.querySelector('#feedback-form').dispatchEvent(new c.w.Event('submit',{bubbles:true,cancelable:true}));
 const feedback=JSON.parse(c.d.querySelector('#feedback-json').value);assert.equal(feedback.contentHash,packet.contentHash);assert.equal(feedback.reviewer.identity,'declared-unverified');
 const preview=exchange.preview(profile,JSON.stringify(feedback));assert.equal(preview.feedback.nextPractice,'Repetí con el caso de transferencia.');assert.match(c.d.querySelector('#download-feedback').href,/^blob:/);
 c.w.eval(axe.source);const result=await c.w.axe.run(c.d,{rules:{'color-contrast':{enabled:false}}});assert.deepEqual(Array.from(result.violations,v=>v.id),[]);c.close();
});
test('tool rejects modified report and resets the previous review before a new file is read',async()=>{
 const c=boot(),packet=JSON.parse(JSON.stringify(new TutorExchange().exportPackage(fixture(),'packet-casework:guiado')));await upload(c,packet);assert.equal(c.d.querySelector('#feedback-form').hidden,false);
 packet.content.sections.evidence='Alteré el informe conservando la huella anterior.';await upload(c,packet);assert.match(c.d.querySelector('[role=alert]').textContent,/huella|modificad/i);assert.equal(c.d.querySelector('#feedback-form').hidden,true);assert.equal(c.d.querySelector('#original-report').textContent,'');c.close();
});
