'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const Core=require('../src/shared/study-studio-core.js');
const {buildPortfolio}=require('../desktop/portfolio.cjs');
const at='2026-11-03T12:00:00.000Z',later='2026-11-03T13:00:00.000Z';
const clone=value=>JSON.parse(JSON.stringify(value));
const output=(record,study={lessons:{}})=>buildPortfolio({study,labs:{'study-studio':record}},{},{now:later});
function savedWork(){
 let r=Core.addIssue(null,{kind:'error',lessonId:'hardware-recursos',prompt:'DISPARADOR <img src=x onerror="evil()">',explanation:'EXPLICACION <script>evil()</script>',cause:'CAUSA & "propia"',confidence:2,state:'resolved-declared',nextReviewDate:'2026-11-10'},at);
 r=Core.chooseFollowup(r,'issue-1','resources-representation-check-1',at);
 r=Core.submitFollowup(r,'issue-1',{response:'RESPUESTA <svg onload="evil()">',result:'correct-declared',assistance:'none-declared',confidenceAfter:4},later);
 return r;
}
function withSessions(r){
 r=Core.createSession(r,{minutes:30,lessonId:'hardware-recursos'},at);
 const completed=r.activeSessionId;
 r=Core.checkpointSession(r,completed,{reflection:'REFLEXION_COMPLETA <b>propia</b>'},at);
 for(const step of ['retrieve','practice','reflect'])r=Core.completeSessionStep(r,completed,step,at);
 r=Core.finishSession(r,completed,later);
 r=Core.createSession(r,{minutes:60,lessonId:'bits-unidades'},later);
 return Core.checkpointSession(r,r.activeSessionId,{reflection:'REFLEXION_ACTIVA_PRIVADA'},later);
}

test('saved notebook and followups escape user markup and retain current declarations and dates',()=>{
 const record=savedWork(),before=clone(record),result=output(record);
 const dom=new JSDOM(result.html),doc=dom.window.document,body=doc.body.textContent;
 assert.match(body,/Taller de estudio/);
 for(const text of ['DISPARADOR <img src=x onerror="evil()">','EXPLICACION <script>evil()</script>','CAUSA & "propia"','RESPUESTA <svg onload="evil()">','hardware-recursos','resources-representation-check-1',at,later,'2026-11-10'])assert.ok(body.includes(text),text);
 assert.equal(doc.querySelectorAll('img,script,svg').length,0);
 assert.match(body,/Resuelto.*declarad/i);assert.match(body,/Confianza declarada: 2\/5/);
 assert.match(body,/Correcto.*declarad/i);assert.match(body,/Sin asistencia.*declarad/i);
 assert.match(body,/Confianza posterior declarada: 4\/5/);
 assert.match(body,/no verifica.*dominio/i);
 assert.doesNotMatch(body,/independencia verificada|dominio verificado|autonomía verificada/i);
 assert.equal(result.summary.textSections,4);assert.deepEqual(record,before);dom.window.close();
});

test('session summaries export only completed reflections and omit editor drafts and cursor data',()=>{
 let record=withSessions(savedWork());
 record=Core.setNotebookDraft(record,{prompt:'CUADERNO_BORRADOR_PRIVADO',explanation:'TEXTO_CUADERNO_PRIVADO'});
 record=Core.setFollowupDraft(record,{issueId:'issue-1',response:'RECUPERACION_BORRADOR_PRIVADO',result:'pending',assistance:'undeclared',confidenceAfter:null});
 record=Core.rememberLocation(record,{ref:{type:'lesson',id:'hardware-recursos'},step:'theory',field:'notes',scrollTop:918273,selectionStart:0,selectionEnd:0});
 const before=clone(record),result=output(record),dom=new JSDOM(result.html),body=dom.window.document.body.textContent;
 assert.match(body,/REFLEXION_COMPLETA <b>propia<\/b>/);
 assert.doesNotMatch(result.html,/REFLEXION_ACTIVA_PRIVADA|CUADERNO_BORRADOR_PRIVADO|TEXTO_CUADERNO_PRIVADO|RECUPERACION_BORRADOR_PRIVADO|918273/);
 assert.match(body,/Completada/);assert.match(body,/En curso/);assert.match(body,/30 minutos/);assert.match(body,/60 minutos/);
 assert.match(body,/3\/3 bloques/);assert.match(body,/0\/3 bloques/);assert.match(body,/bits-unidades/);
 assert.equal(result.summary.textSections,5);assert.deepEqual(record,before);dom.window.close();
});

test('paused session reflections stay private and undeclared confidence remains unknown',()=>{
 let r=Core.addIssue(null,{prompt:'Una duda guardada',explanation:'No conozco todavía el resultado.'},at);
 r=Core.createSession(r,{minutes:90,lessonId:'hardware-recursos'},at);
 r=Core.checkpointSession(r,r.activeSessionId,{reflection:'REFLEXION_PAUSADA_PRIVADA'},at);
 r=Core.pauseSession(r,r.activeSessionId,later);
 const html=output(r).html;assert.match(html,/Pausada/);assert.match(html,/Confianza declarada: sin declarar/);assert.match(html,/Abierto/);
 assert.doesNotMatch(html,/REFLEXION_PAUSADA_PRIVADA/);
});

test('absent studio records add no section and invalid existing records explicitly omit without mutation',()=>{
 const absent=buildPortfolio({labs:{}},{},{now:later}).html;assert.doesNotMatch(absent,/Taller de estudio/);
 const tooMany=Core.emptyRecord();tooMany.notebook=Array.from({length:25},()=>({prompt:'RAW_INVALID_PRIVATE'}));
 for(const raw of [null,42,[],{...savedWork(),version:99},{...savedWork(),rawBinary:'RAW_INVALID_PRIVATE'},tooMany]){
  const before=clone(raw),result=output(raw,{lessons:{'hardware-recursos':{notes:'OTRA_EVIDENCIA_CONSERVADA'}}});assert.match(result.html,/Taller de estudio/);assert.match(result.html,/no pudo validarse.*omiti/i);assert.match(result.html,/JSON.*original|original.*JSON/i);assert.match(result.html,/OTRA_EVIDENCIA_CONSERVADA/);assert.equal(result.summary.textSections,1);
  assert.doesNotMatch(result.html,/EXPLICACION|RESPUESTA|RAW_INVALID_PRIVATE/);assert.deepEqual(raw,before);
 }
});

test('studio written evidence shares the 90000 character budget and reports each omitted text section',()=>{
 const lessons=Object.fromEntries(Array.from({length:24},(_,i)=>['lesson-'+i,{answer:'a'.repeat(250),notes:'n'.repeat(3500)}]));
 const record=withSessions(savedWork()),before=clone(record),result=output(record,{lessons});
 assert.doesNotMatch(result.html,/EXPLICACION|RESPUESTA|REFLEXION_COMPLETA/);
 assert.match(result.html,/Secciones de texto omitidas por presupuesto: 5/);
 assert.equal(result.summary.textSections,48);assert.ok(Buffer.byteLength(result.html)<2*1024*1024);assert.deepEqual(record,before);
});

test('full notebook followup and session capacities produce bounded summaries with honest omission counts',()=>{
 let r=Core.emptyRecord();
 for(let i=0;i<24;i++){
  r=Core.addIssue(r,{prompt:'p'.repeat(100),explanation:'e'.repeat(100),cause:'c'.repeat(100)},at);const id=r.notebook.at(-1).id;
  r=Core.chooseFollowup(r,id,'resources-representation-check-1',at);
  for(let j=0;j<4;j++)r=Core.submitFollowup(r,id,{response:'r'.repeat(1000),result:'pending',assistance:'undeclared',confidenceAfter:null},at);
 }
 for(let i=0;i<12;i++){r=Core.createSession(r,{minutes:30,lessonId:'hardware-recursos'},at);r=Core.pauseSession(r,r.activeSessionId,at)}
 const before=clone(r),result=output(r),dom=new JSDOM(result.html),doc=dom.window.document;
 assert.match(doc.body.textContent,/24 entradas.*12 sesiones/);
 const paragraphs=[...doc.querySelectorAll('.evidence-text')];assert.ok(paragraphs.reduce((sum,p)=>sum+p.childNodes[0].textContent.length,0)<=90000);
 assert.match(result.html,/Secciones de texto omitidas por presupuesto: [1-9]\d*/);
 assert.ok(Buffer.byteLength(result.html)<2*1024*1024);assert.deepEqual(r,before);dom.window.close();
});

test('transfer reports remain in the canonical assessment exporter once alongside studio summaries',()=>{
 const Assessment=require('../src/shared/assessment-core.js'),text='INFORME_TRANSFER_UNICO con análisis documental propio.';
 let assessment=Assessment.start(null,'transfer-permissions-a',{environment:'Dataset sintético de permisos Windows y Linux.',baseline:'Comparación documental del material suministrado.',scope:'Solo los artefactos sintéticos incluidos en el campus.',scopeConfirmed:true},at);
 assessment=Assessment.update(assessment,'attempt-1',{...Object.fromEntries(Assessment.REPORT_FIELDS.map(key=>[key,key==='executiveSummary'?text:'Análisis documental propio con justificación y límites.'])),independence:'independent',reviewStatus:'self-declared'});
 assessment=Assessment.submit(assessment,'attempt-1',later);
 const result=buildPortfolio({labs:{'study-studio':savedWork(),'independent-assessment':assessment}},{},{now:later});
 assert.match(result.html,/Taller de estudio/);assert.equal(result.html.split('INFORME_TRANSFER_UNICO').length-1,1);assert.match(result.html,/Independencia declarada/);
});

function pairedTransfers({guidanceAt=null,guidanceId='attempt-1'}={}){
 const Assessment=require('../src/shared/assessment-core.js'),time=minute=>`2026-11-03T14:0${minute}:00.000Z`,setup={environment:'Dataset sintético Windows y Linux para análisis documental.',baseline:'Estado inicial del material suministrado y límites registrados.',scope:'Solo los artefactos sintéticos autorizados del campus.',scopeConfirmed:true};
 let r=null;
 for(const [index,caseId]of ['transfer-permissions-a','transfer-permissions-b'].entries()){
  const id='attempt-'+(index+1);r=Assessment.start(r,caseId,setup,time(index*2));
  r=Assessment.update(r,id,{...Object.fromEntries(Assessment.REPORT_FIELDS.map(key=>[key,key==='executiveSummary'?`ENTREGA_VARIANTE_${index} con análisis propio y límites.`:'Comparé los permisos sintéticos y expliqué sus diferencias.'])),independence:'independent',reviewStatus:'self-declared'});
  r=Assessment.submit(r,id,time(index*2+1));
 }
 if(guidanceAt!==null)r=Assessment.guidance(r,guidanceId,time(guidanceAt));
 return r;
}
function transferEntries(record){
 const dom=new JSDOM(buildPortfolio({labs:{'independent-assessment':record}},{},{now:later}).html);
 const entries=[...dom.window.document.querySelectorAll('.entry')].map(entry=>entry.textContent);dom.window.close();return entries;
}

test('sibling variant export qualifies prior family work without changing the original independence or repeating reports',()=>{
 const r=pairedTransfers(),before=clone(r),entries=transferEntries(r);
 assert.equal(entries.length,2);assert.match(entries[0],/Familia: transfer-permissions.*Variante: A/);assert.match(entries[1],/Familia: transfer-permissions.*Variante: B/);
 assert.doesNotMatch(entries[0],/Intento anterior de esta familia|Exposición familiar registrada/);
 assert.match(entries[1],/Intento anterior de esta familia registrado/);assert.match(entries[1],/Exposición familiar registrada/);
 assert.doesNotMatch(entries[1],/Orientación.*registrada/);
 for(const [index,entry]of entries.entries()){assert.match(entry,/Independencia declarada/);assert.equal(entry.split('ENTREGA_VARIANTE_'+index).length-1,1)}
 assert.deepEqual(r,before);
});

test('export follows sibling guidance chronology and keeps original independence declarations visible',()=>{
 const r=pairedTransfers({guidanceAt:2}),before=clone(r),entries=transferEntries(r);
 assert.match(entries[0],/Independencia declarada/);assert.match(entries[0],/Orientación posterior a esta entrega registrada/);
 assert.doesNotMatch(entries[0],/Orientación previa a esta entrega registrada|Intento anterior de esta familia/);
 assert.match(entries[1],/Independencia declarada/);assert.match(entries[1],/Orientación de la familia registrada/);assert.match(entries[1],/Orientación previa a esta entrega registrada/);
 assert.deepEqual(r,before);
});

test('later sibling guidance does not retroactively qualify an earlier variant submission',()=>{
 const r=pairedTransfers({guidanceAt:4,guidanceId:'attempt-2'}),before=clone(r);r.attempts.reverse();
 const entries=transferEntries(r),first=entries.find(entry=>entry.includes('ENTREGA_VARIANTE_0'));
 assert.match(first,/Independencia declarada/);assert.doesNotMatch(first,/Orientación.*registrada|Intento anterior de esta familia|Exposición familiar registrada/);
 assert.deepEqual(r.attempts,clone(before.attempts).reverse());
});
