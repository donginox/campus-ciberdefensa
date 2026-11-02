'use strict';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function readable(id){return String(id).replace(/^(?:mission|practice|campaign)-/,'').replaceAll('-',' ');}
function buildPortfolio(profile,content={},options={}){
 const isRecord=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
 const recordMap=value=>isRecord(value)?value:{};
 const boundedText=(value,max=6000)=>typeof value==='string'?value.slice(0,max):'';
 const hasText=(value,max=6000)=>!!boundedText(value,max).trim();
 profile=recordMap(profile);
 const lessons=content.curriculum?.modules?.flatMap(module=>module.lessons)||[];
 const study=recordMap(profile.study),progress=recordMap(study.lessons),labs=recordMap(profile.labs);
 const summary={readLessons:0,declaredPractices:0,textSections:0};
 const when=boundedText(options.now,80)||new Date().toISOString();let budget=90000,wasCropped=false;
 function selectedEvidence(record){const value=record?.evidence;if(!isRecord(value)||!['manual','real-host'].includes(value.source)||!hasText(value.summary))return null;return {source:value.source,summary:boundedText(value.summary),evidenceId:boundedText(value.evidenceId,100),observedAt:boundedText(value.observedAt,40),recordedAt:boundedText(value.recordedAt,40)};}
 function text(value,max=3500){if(typeof value!=='string'||!value.trim())return '';if(budget<=0){wasCropped=true;return '';}const bounded=value.slice(0,Math.min(max,budget));budget-=bounded.length;const cropped=bounded.length<value.length;wasCropped ||= cropped;return `<p class="evidence-text">${escape(bounded)}${cropped?'<br><em>Texto recortado para este resumen. El original permanece en tu perfil.</em>':''}</p>`;}
 const label=(value,max=300)=>escape(boundedText(value,max));
 function written(label,value,max){const paragraph=text(value,max);if(!paragraph)return '';summary.textSections++;return `<div class="written"><h4>${escape(label)}</h4>${paragraph}</div>`;}
 const classes=Object.entries(progress).flatMap(([id,record])=>{
  if(!isRecord(record))return [];
  if(record.read===true)summary.readLessons++;if(record.practiceDone===true)summary.declaredPractices++;
  if(!record.read&&!record.practiceDone&&!record.notes&&!record.answer)return [];
  const lesson=lessons.find(l=>l.id===id);return [`<section class="entry"><h3>${escape(lesson?.title||readable(id))}</h3><p class="meta">${record.read?'Lectura registrada':'Lectura pendiente'} · ${record.practiceDone?'Práctica declarada':'Práctica pendiente'}${Number.isFinite(record.bestScore)?' · Mejor comprobación docente: '+escape(record.bestScore)+'/3':''}</p>${written('Procedimiento y evidencia',record.answer)}${written('Mi resumen',record.notes)}</section>`];
 }).join('');
 const evidence=Object.entries(labs).flatMap(([id,record])=>{
  if(!isRecord(record))return [];
  if(id==='preparation-ledger'){
   const normalized=require('../src/shared/preparation-core.js').normalize(record);
   return normalized.entries.map(entry=>{const certification=content.competencies?.certifications?.find(c=>c.id===entry.certificationId),skill=certification?.domains?.flatMap(d=>d.skills).find(s=>s.id===entry.competencyId);return `<section class="entry"><h3>Bitácora · ${escape(skill?.title||entry.competencyId)}</h3><p class="meta">${escape(certification?.name||entry.certificationId)} · ${escape(entry.date)} · ${escape(entry.environment)}</p><p class="meta">Ayuda declarada: ${escape({independent:'sin asistencia',guided:'guía consultada',assisted:'con asistencia'}[entry.help])}. Revisión declarada: ${escape({pending:'pendiente',self:'propia',tutor:'por tutor, identidad no verificada por la app'}[entry.review])}.</p>${written('Procedimiento',entry.procedure)}${written('Resultado',entry.result)}${written('Interpretación',entry.interpretation)}${written('Notas de revisión',entry.reviewNotes)}<p class="review">Registro elegido por el alumno. El estado de revisión es una declaración, no una acreditación de dominio.</p></section>`});
  }
  if(id==='independent-assessment'){
   const assessmentCore=require('../src/shared/assessment-core.js'),normalized=assessmentCore.normalize(record),titles={'web-control-review':'Revisión de controles web','soc-containment-review':'Investigación y contención defensiva'};
   const qualifications=new Map(assessmentCore.summary(normalized).attempts.map(a=>[a.id,a]));
   const labels={procedure:'Metodología',failedHypotheses:'Hipótesis descartadas',findings:'Hallazgos',reproducibleEvidence:'Evidencia reproducible',impact:'Impacto',remediation:'Remediación',limitations:'Limitaciones',executiveSummary:'Resumen ejecutivo',assistanceLog:'Ayuda recibida',selfReview:'Revisión propia'};
   return normalized.attempts.filter(a=>a.submittedAt).map(attempt=>`<section class="entry"><h3>Evaluación práctica · ${escape(titles[attempt.caseId])}</h3><p class="meta">Entregado: ${escape(attempt.submittedAt)} · ${escape({local:'Ejecución local declarada',external:'Ejecución externa declarada','not-executed':'Ejecución pendiente'}[attempt.execution])} · ${escape(qualifications.get(attempt.id)?.independence==='guided'?'Orientación del caso registrada':attempt.independence==='independent'?'Independencia declarada':'Con asistencia declarada')}${qualifications.get(attempt.id)?.repeatedCase?' · Repetición de un caso anterior':''}.</p>${written('Entorno',attempt.preflight.environment)}${written('Línea de base',attempt.preflight.baseline)}${written('Alcance autorizado declarado',attempt.preflight.scope)}${Object.entries(labels).map(([key,label])=>written(label,attempt.report[key])).join('')}<p class="review">Informe entregado e inmutable en el campus. La ejecución y revisión son declaraciones; el informe requiere evaluación humana y no acredita objetivos oficiales.</p></section>`);
  }
  if(id==='packet-casework'){
   const packetCore=require('../src/shared/packet-case-core.js'),normalized=packetCore.normalize(record),labels={filters:'Filtros utilizados',timeline:'Línea temporal',evidence:'Paquetes y evidencias',interpretation:'Interpretación',alternative:'Hipótesis alternativa'};
   return packetCore.caseIds.filter(caseId=>normalized.cases[caseId].attempt).map(caseId=>{const c=normalized.cases[caseId];return `<section class="entry"><h3>Análisis PCAP · ${caseId==='guiado'?'Caso guiado':'Caso de transferencia'}</h3><p class="meta">Informe registrado: ${escape(c.attempt.submittedAt)} · Tráfico sintético original · ${c.guidanceUsed?'Guía de corrección consultada':'Sin consulta de corrección registrada'}.</p>${Object.entries(labels).map(([key,label])=>written(label,c.attempt.report[key])).join('')}<p class="review">Análisis y referencias de paquetes declarados por el alumno. No constituye adquisición de tráfico del host ni evaluación forense o certificación completa.</p></section>`});
  }
  if(id==='professional-learning'){
   const attempts=(Array.isArray(record.history)?record.history:[]).filter(run=>run&&typeof run.submittedAt==='string'&&Number.isFinite(run.score)&&Number.isFinite(run.total)&&run.total>0).slice(0,10);
   if(!attempts.length)return [];
   return [`<section class="entry"><h3>Diagnóstico y simulacros docentes</h3><table><thead><tr><th>Actividad</th><th>Fecha</th><th>Resultado</th></tr></thead><tbody>${attempts.map(run=>`<tr><td>${run.kind==='diagnostic'?'Diagnóstico':'Simulacro docente'}</td><td>${escape(run.submittedAt.slice(0,10))}</td><td>${escape(run.score)}/${escape(run.total)}</td></tr>`).join('')}</tbody></table><p class="review">Resultados de selecciones docentes propias. No equivalen a un examen oficial. Los borradores de intentos activos no se exportan.</p></section>`];
  }
  // Deliberate allowlist: rows, observations, raw host data and active exam
  // answers are never traversed or automatically turned into evidence.
  const practice=content.practices?.practices?.find(p=>p.id===id.replace(/^practice-/,''));
  const chosenEvidence=selectedEvidence(record),rubric=Array.isArray(practice?.rubric)?practice.rubric:[];
  const reviewed=chosenEvidence&&rubric.length>0&&rubric.every((_,i)=>record.rubric?.[i]===true)&&record.review?.kind==='self-review';
  let body=written('Síntesis elegida por el alumno',record.notes||record.report||record.reflection,4500);
  if(record.summary&&record.summary!==record.notes)body+=written('Síntesis de la práctica',record.summary,3500);
  if(chosenEvidence){
   body+=written('Evidencia elegida',chosenEvidence.summary,3500);
   body+=`<p class="meta">Procedencia declarada: ${chosenEvidence.source==='real-host'?'Observación real del equipo':'Declaración manual'}. Fecha observada: ${label(chosenEvidence.observedAt||'no registrada',40)}. Identificador: ${label(chosenEvidence.evidenceId||'no registrado',100)}. Registro: ${label(chosenEvidence.recordedAt||'sin fecha',40)}.</p>`;
  }
  if(rubric.length){body+=`<h4>Rúbrica de revisión propia</h4><ul>${rubric.slice(0,20).map((criterion,i)=>`<li>${record.rubric?.[i]===true?'Declarado por el alumno':'Pendiente'}: ${label(criterion,700)}</li>`).join('')}</ul>`;}
  if(reviewed)body+=`<p class="review">Revisión propia declarada: ${label(boundedText(record.review.declaredAt,40)||'fecha no registrada',40)}. Falta revisión externa; esta declaración no verifica ejecución ni dominio.</p>`;
  body+=written('Respuesta al desafío',record.challengeAnswer||record.answer,3000);
  for(const [key,task]of Object.entries(recordMap(record.tasks)).slice(0,20)){if(isRecord(task))body+=written('Tarea: '+readable(key),task.answer,1500);}
  const campaign=content.practices?.campaigns?.find(item=>item.id===id.replace(/^campaign-/,''));
  for(const [key,stage]of Object.entries(recordMap(record.stages)).slice(0,12)){if(isRecord(stage))body+=written('Etapa: '+(campaign?.stages?.find(item=>item.id===key)?.title||readable(key)),stage.answer,1800);}
  if(isRecord(record.lastEvidence)){body+=written('Observación registrada',record.lastEvidence.summary,1800);if(hasText(record.lastEvidence.caseId,200))body+=`<p class="meta">Caso: ${label(record.lastEvidence.caseId,200)} · ${label(boundedText(record.lastEvidence.observedAt,80)||'Fecha no registrada',80)}</p>`;}
  if(isRecord(record.lastExecution))body+=`<p class="meta">Última comprobación formativa: ${record.lastExecution.passed===true?'criterio acotado alcanzado':'pendiente de revisión'}. Caso ${label(boundedText(record.lastExecution.caseId,200)||'sin identificar',200)}.</p>`;
  if(!body)return [];
  const room=content.missions?.rooms?.find(r=>r.id===id.replace(/^mission-/,''));return [`<section class="entry"><h3>${label(practice?.title||room?.title||campaign?.title||readable(id))}</h3>${body}<p class="review">Evidencia registrada por el alumno. Corrección y alcance pendientes de revisión.</p></section>`];
 }).join('');
 const competencies=(content.competencies?.certifications||[]).slice(0,5).map(cert=>{
  const skills=(cert.domains||[]).flatMap(domain=>domain.skills||[]).slice(0,40);
  return `<section class="entry"><h3>${label(cert.name)}</h3><p>${label(cert.coverageNote,1800)}</p>${skills.map(skill=>{
   const p=skill.practice||{},mission=labs['mission-'+p.missionId],lab=labs[p.labId];
   const related=(content.practices?.practices||[]).filter(item=>item.competencyIds?.includes(skill.id)).map(item=>labs['practice-'+item.id]).filter(Boolean);
   const recorded=hasText(mission?.lastEvidence?.caseId,200)||related.some(item=>selectedEvidence(item));
   const declared=hasText(mission?.notes)||Object.values(recordMap(mission?.tasks)).some(task=>isRecord(task)&&(task.done===true||hasText(task.answer)))||related.some(item=>hasText(item.answer)||hasText(item.notes));
   const attempted=Number.isFinite(lab?.attempts)&&lab.attempts>0;
   const read=(skill.lessonIds||[]).some(id=>progress[id]?.read===true);
   const status=recorded?'Evidencia local registrada; revisión externa pendiente':declared||attempted?'Práctica declarada; evidencia y revisión pendientes':read?'Lectura registrada; práctica y revisión pendientes':'Sin evidencia registrada';
   const gap=p.kind==='external'?'Falta ejecutar y revisar en el entorno externo indicado. La evidencia local no sustituye esa práctica.':p.kind==='simulator'?'Falta contrastar el caso simulado con ejecución y evidencia en un entorno propio autorizado.':p.kind==='guided'?'Falta ejecutar los pasos en el entorno indicado y revisar el resultado.':'Falta revisión humana de la evidencia y demostración con un caso nuevo; un resultado local no acredita dominio completo.';
   return `<div class="competency"><h4>${label(skill.title)}</h4><p class="meta">${status}</p><p>${gap}</p><p><strong>Evidencia por revisar:</strong> ${label(skill.evidence,1800)}</p><p><strong>Pregunta de transferencia:</strong> ${label(skill.readinessQuestion,1000)}</p></div>`;
  }).join('')}</section>`;
 }).join('');
 const html=`<!doctype html><html lang="es-AR"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src 'none'; font-src 'none'; form-action 'none'; base-uri 'none'"><title>Portafolio - Campus Ciberdefensa</title><style>@page{size:A4;margin:17mm 16mm 20mm}*{box-sizing:border-box}body{margin:0;color:#17283f;background:white;font:11pt/1.6 'Segoe UI',Arial,sans-serif}h1,h2,h3{font-family:Georgia,serif;line-height:1.25}h1{font-size:31pt;font-weight:400;margin:10mm 0 5mm}h2{font-size:20pt;font-weight:400;border-bottom:2px solid #8c3041;padding-bottom:3mm;margin-top:10mm;break-after:avoid}h3{font-size:15pt;margin:0 0 3mm;break-after:avoid}h4{font-size:10pt;margin:4mm 0 1mm;color:#543748}.eyebrow{font-size:9pt;letter-spacing:2px;text-transform:uppercase;color:#8c3041}.cover{border-top:5px solid #132846;padding-top:7mm}.name{font-size:17pt;overflow-wrap:anywhere}.intro,.review,.meta{font-size:9pt;color:#425469}.stats{display:flex;gap:12mm;padding:5mm 0;border-block:1px solid #ccd1d6}.stats b{font-size:20pt;display:block}.entry{margin:6mm 0;padding:5mm;border:1px solid #d0d4d8;border-left:3px solid #bc994b}.evidence-text{white-space:pre-wrap;overflow-wrap:anywhere;margin:1mm 0 3mm;orphans:3;widows:3}.review{padding-top:3mm;border-top:1px solid #d0d4d8}.empty{padding:5mm;background:#f2f1eb}footer{font-size:9pt;border-top:1px solid #ccd1d6;padding-top:4mm;margin-top:8mm}a{color:#8c3041}em{font-size:9pt}h4{break-after:avoid}.written>p{break-before:avoid}.entry>h3,.entry>.meta{break-after:avoid}.review{break-inside:avoid}.closing{break-inside:avoid}table{width:100%;border-collapse:collapse;font-size:10pt}th,td{text-align:left;padding:2mm;border-bottom:1px solid #ccd1d6}thead{display:table-header-group}tr{break-inside:avoid}</style></head><body><header class="cover"><p class="eyebrow">Campus Ciberdefensa · Portafolio personal</p><h1>Lo que estudié.<br>Lo que puedo explicar.</h1><p class="name">${label(boundedText(profile.name,80)||'Perfil local',80)}</p><p class="meta">Generado: ${escape(when)} · Datos guardados en este equipo.</p><p class="intro">Este documento reúne trabajo elegido y registrado en el campus. Separa lectura, declaración de práctica y comprobaciones formativas acotadas. Requiere revisión humana y no acredita títulos, certificaciones ni preparación exhaustiva para un examen.</p><div class="stats"><div><b>${summary.readLessons}</b>lecturas registradas</div><div><b>${summary.declaredPractices}</b>prácticas declaradas</div><div><b>${summary.textSections}</b>secciones de trabajo escrito</div></div></header><main><h2>Cursada y resúmenes</h2>${classes||'<p class="empty">Todavía no hay trabajo registrado en las clases.</p>'}<h2>Prácticas y evidencias</h2>${evidence||'<p class="empty">Todavía no hay síntesis o evidencia elegida para exportar.</p>'}${competencies?'<h2>Competencias y brechas pendientes</h2>'+competencies:''}${wasCropped?'<p class="review">Se recortaron textos para mantener un portafolio legible. El respaldo JSON conserva el trabajo completo permitido por el perfil.</p>':''}<section class="closing"><h2>Cómo revisar este portafolio</h2><ol><li>Confirmar entorno, fecha, procedimiento y resultado reproducible.</li><li>Separar lo observado de la hipótesis y justificar las conclusiones.</li><li>Repetir con un caso nuevo sin seguir la solución.</li><li>Comparar con los objetivos oficiales y registrar brechas pendientes.</li></ol><p class="intro">Los datos sintéticos, simulaciones y motores reales se describen en cada actividad. Un resultado correcto en un caso local no demuestra dominio de todos los objetivos de CC, CCST, Security+, BTL1 o eJPT.</p><footer>Elaboración docente independiente. Los perfiles, respaldos y este documento permanecen bajo control del alumno.</footer></section></main></body></html>`;
 if(Buffer.byteLength(html)>2*1024*1024)throw new Error('El portafolio supera el límite del documento.');
 return {html,title:'Portafolio - Campus Ciberdefensa',summary};
}
module.exports={buildPortfolio,escape};
