(function(){
 'use strict';
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const labels={procedure:'Procedimiento',failedHypotheses:'Hipótesis fallidas',findings:'Hallazgos',reproducibleEvidence:'Evidencia reproducible',impact:'Impacto',remediation:'Remediación',limitations:'Limitaciones',executiveSummary:'Resumen ejecutivo',assistanceLog:'Ayuda recibida',selfReview:'Revisión propia',filters:'Filtros',timeline:'Línea de tiempo',evidence:'Evidencia',interpretation:'Interpretación',alternative:'Hipótesis alternativa'};
 const ratings={pending:'Pendiente',developing:'En desarrollo',meets:'Cumple el criterio',strong:'Bien fundamentado'};
 function create({getProfileId=()=>null,getProfileEpoch=()=>0,getRecord=()=>null,getLabs=()=>({}),saveRecord=()=>{},desktop={},exportMaterial=path=>desktop.exportMaterial(path),onProfileUpdated=()=>{},runProfileOperation=action=>action(),navigate=()=>{},openMaterial=()=>{},announce=()=>{}}={}){
  const core=window.TutorCore;let page=null,profileId=null,epoch=null,life=0,record={version:1,reviews:[]},selected='',preview=null,busy=false,error='',loadError='',status='El intercambio es voluntario y se realiza por archivos locales.';
  const valid=(id=profileId,generation=epoch,token=life)=>id===getProfileId()&&generation===getProfileEpoch()&&token===life;
  const active=()=>!!page?.isConnected&&valid();
  function sync(){const id=getProfileId(),generation=getProfileEpoch();if(id!==profileId||generation!==epoch){life++;profileId=id;epoch=generation;preview=null;busy=false;error='';status='El intercambio es voluntario y se realiza por archivos locales.';selected=''}try{record=core.normalize(getRecord());loadError=''}catch(e){record={version:1,reviews:[]};loadError='No se pudo leer el historial: '+String(e.message).slice(0,300)+'. Conservá una copia del perfil antes de recuperarlo.'}}
  const button=(action,label)=>`<button type="button" data-tutor-action="${esc(action)}" ${busy?'disabled':''}>${esc(label)}</button>`;
  const sourceTitle=source=>`${source.kind==='packet-casework'?'Análisis de paquetes':'Evaluación práctica'} · ${source.caseId} · ${source.attemptId} · ${source.submittedAt}`;
  function feedbackHtml(item,index){const f=item.feedback,p=item.packet;return `<p>Informe: ${esc(sourceTitle(p.content.source))}</p><p>Tutor: ${esc(f.reviewer.name)} · identidad declarada, sin verificar. No es una firma criptográfica.</p><p>Fecha de devolución: ${esc(f.createdAt)}</p><p class="tutor-hash">Paquete: ${esc(p.packageId)}<br>SHA256: ${esc(p.contentHash)}</p><h3>Comentarios por sección</h3><dl>${f.comments.map(row=>`<dt>${esc(labels[row.section]||row.section)}</dt><dd>${esc(row.comment)}</dd>`).join('')}</dl><h3>Rúbrica docente</h3><dl>${f.rubric.map(row=>`<dt>${esc(row.criterion)} · ${esc(ratings[row.rating]||row.rating)}</dt><dd>${esc(row.comment||'Sin comentario adicional.')}</dd>`).join('')}</dl><h3>Siguiente práctica</h3><p>${esc(f.nextPractice)}</p><details><summary>Consultar el informe original conservado</summary><p>El feedback se guarda por separado. El informe entregado y su huella se conservan sin cambios.</p>${Object.entries(p.content.sections).map(([key,value])=>`<h4>${esc(labels[key]||key)}</h4><p class="tutor-original">${esc(value)}</p>`).join('')}</details>`}
  function content(){
   let sources=[];try{sources=core.sources(getLabs())}catch(e){error='No se pudieron consultar los informes entregados. '+String(e.message).slice(0,200)}
   if(!sources.some(s=>s.id===selected))selected=sources[0]?.id||'';
   const problem=[loadError,error].filter(Boolean).join(' ');
   return `<header><p>Campus · Revisión externa</p><h1 id="tutor-title" tabindex="-1">Devolución por archivos</h1><p>Exportá una entrega, compartila por tu cuenta y revisá la devolución antes de incorporarla. Campus no envía archivos ni contacta tutores.</p></header><p role="status" aria-live="polite" data-tutor-status>${esc(busy?'Procesando el archivo local…':status)}</p><div class="tutor-error" role="alert" tabindex="-1" ${problem?'':'hidden'}>${esc(problem)}</div>${profileId?`<section class="tutor-panel" aria-labelledby="tutor-export-title"><h2 id="tutor-export-title">Compartir un informe entregado</h2><p>Se incluyen solo las secciones del informe y su origen. Revisá que tu síntesis esté anonimizada: no compartas credenciales ni datos privados. Los borradores, soluciones y registros crudos del equipo quedan fuera del paquete.</p>${sources.length?`<label for="tutor-source">Informe que querés compartir</label><select id="tutor-source" ${busy?'disabled':''}>${sources.map(s=>`<option value="${esc(s.id)}" ${s.id===selected?'selected':''}>${esc(sourceTitle(s.source))}</option>`).join('')}</select>${button('export','Guardar paquete de revisión')}`:'<p>Todavía no hay informes entregados. Entregá un informe en Evaluación práctica o en Análisis de paquetes para compartirlo.</p>'}</section><section class="tutor-panel" aria-labelledby="tutor-import-title"><h2 id="tutor-import-title">Recibir una devolución</h2><p>Elegí el JSON que te devolvió el tutor. Comprobamos versión, tamaño, origen y huella del informe. La identidad es declarada por quien escribe el archivo; Campus no la verifica.</p>${button('import','Elegir devolución y ver vista previa')}</section>${preview?`<section class="tutor-panel tutor-preview" data-tutor-preview aria-labelledby="tutor-preview-title"><h2 id="tutor-preview-title" tabindex="-1">Vista previa · todavía sin guardar</h2>${preview.duplicate?'<p>Esta devolución ya está registrada. Confirmar conserva una sola copia.</p>':''}${feedbackHtml(preview,'preview')}<div class="tutor-actions">${button('confirm',error?'Reintentar guardar devolución':'Confirmar y guardar devolución')}${button('cancel','Cancelar vista previa')}</div><p>Si el perfil o el informe cambia, elegí nuevamente el archivo para generar otra vista previa.</p></section>`:''}<section class="tutor-panel" aria-labelledby="tutor-history-title"><h2 id="tutor-history-title">Devoluciones guardadas</h2><p>${record.reviews.length}/12. El historial admite hasta 120 kB; si se llena, la nueva devolución se rechaza y se conservan las anteriores.</p>${record.reviews.length?record.reviews.map((row,index)=>`<article class="tutor-review"><h3>Devolución ${index+1}</h3>${feedbackHtml(row,index)}</article>`).join(''):'<p>Todavía no guardaste devoluciones en este perfil.</p>'}</section>`:'<section class="tutor-panel"><h2>Elegí un perfil local</h2><p>Necesitás un perfil para compartir entregas y conservar devoluciones.</p></section>'}<section class="tutor-panel" aria-labelledby="tutor-tool-title"><h2 id="tutor-tool-title">Herramienta para quien revisa</h2><p>Guardá la herramienta HTML y abrila con doble clic en un navegador moderno. Funciona sin conexión: abre el paquete, verifica su SHA256 y genera el JSON de devolución con comentarios, rúbrica y siguiente práctica. Compartí ambos archivos por el medio que elijas.</p>${button('tool','Guardar herramienta del tutor')}</section>`;
  }
  function draw(focus){if(!active())return;page.innerHTML=content();if(focus)page.querySelector(focus)?.focus()}
  function fail(err){error='No se pudo completar la acción: '+String(err?.message||err).slice(0,350)+'. Podés reintentar; el informe original se conserva.';status='La acción no se guardó.';draw('[role=alert]');announce(error)}
  async function action(name){
   if(!active()||busy)return;if(name==='cancel'){preview=null;error='';status='Vista previa cancelada. No se guardó ninguna devolución.';draw('#tutor-import-title');return}
   if(name!=='tool'&&!profileId)return;if(name==='confirm'&&!preview)return;
   const id=profileId,generation=epoch,token=life;busy=true;error='';draw();
   try{
    let result;
    if(name==='tool')result=await exportMaterial('tutor-review.html');
    else if(name==='export')result=await runProfileOperation(()=>desktop.tutorExport({profileId:id,attemptId:selected}));
    else if(name==='import')result=await runProfileOperation(()=>desktop.tutorPreview({profileId:id}));
    else if(name==='confirm')result=await runProfileOperation(()=>desktop.tutorCommit({profileId:id,previewId:preview.previewId}));
    else return;
    if(!active()||!valid(id,generation,token))return;busy=false;
    if(result?.canceled){status='Operación cancelada. Tus informes se conservan.';draw();return}
    if(name==='import'){core.validatePacket(result.packet);core.validateFeedback(result.feedback,result.packet);preview=result;status='Archivo validado. Revisá la vista previa y confirmá si querés guardarla.';draw('#tutor-preview-title')}
    else if(name==='confirm'){
     const next=result.record||result.profile?.labs?.['tutor-reviews'];if(next)record=core.normalize(next);
     preview=null;if(result.profile)onProfileUpdated(result.profile);
     status=result.duplicate?'La devolución ya estaba guardada; se conservó una sola copia.':'Devolución guardada. El informe original se conserva sin cambios.';
     draw('#tutor-history-title');announce(status);
    }else{status=name==='tool'?'Herramienta guardada. Abrí el archivo HTML con doble clic en tu navegador.':'Paquete guardado. Compartilo voluntariamente con quien revise tu informe.';draw();announce(status)}
   }catch(err){if(!active()||!valid(id,generation,token))return;busy=false;fail(err)}
  }
  function click(event){const node=event.target.closest('[data-tutor-action]');if(node&&active())void action(node.dataset.tutorAction)}
  function change(event){if(active()&&event.target.id==='tutor-source'&&!busy)selected=event.target.value}
  function render(){sync();return `<div class="tutor-hub" data-tutor-hub>${content()}</div>`}
  function mount(root){if(page){page.removeEventListener('click',click);page.removeEventListener('change',change)}page=root.matches?.('[data-tutor-hub]')?root:root.querySelector('[data-tutor-hub]');if(page){page.addEventListener('click',click);page.addEventListener('change',change)}}
  function dispose(){life++;if(page){page.removeEventListener('click',click);page.removeEventListener('change',change)}page=null;busy=false;preview=null}
  return {render,mount,dispose};
 }
 window.TutorHub={create};
})();
