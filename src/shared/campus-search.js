(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CampusSearch=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const fold=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
 function buildIndex(data={},objectivesCatalog){
  const plainText=value=>typeof value==='string'?value.replace(/<[^>]*>/g,' ').replace(/[<>]/g,'').replace(/\s+/g,' ').trim():'';
  const items=[],seen=new Set();function add(kind,id,title,description,extra={}){if(typeof id!=='string'||!id||typeof title!=='string'||!title||seen.has(kind+':'+id))return;seen.add(kind+':'+id);items.push({kind,id,title:plainText(title).slice(0,200),description:plainText(description).slice(0,350),...extra});}
  for(const mod of data.curriculum?.modules||[])for(const lesson of mod.lessons||[])add('lesson',lesson.id,lesson.title,[mod.title,lesson.objective,lesson.practice?.environment].join(' '));
  for(const cert of data.competencies?.certifications||[])for(const domain of cert.domains||[])for(const skill of domain.skills||[])add('competency',skill.id,skill.title,[cert.name,domain.title,skill.canDo].join(' '),{certificationId:cert.id});
  for(const room of data.missions?.rooms||[])add('mission',room.id,room.title,room.description);
  for(const practice of data.practices?.practices||[])add('practice',practice.id,practice.title,[practice.platform,practice.description||practice.objective,practice.theory].filter(Boolean).join(' '));
  for(const campaign of data.practices?.campaigns||[])add('campaign',campaign.id,campaign.title,campaign.description||campaign.objective);
  for(const book of Array.isArray(data.library)?data.library:[])add('material',book.file,book.title,[book.tag,book.description].join(' '));
  for(const cert of objectivesCatalog?.certifications||[])for(const domain of cert.domains||[])for(const objective of domain.objectives||[])add('objective',objective.id,`${objective.id} · ${objective.title}`,`Método: ${plainText(objective.activity).slice(0,100)} · Evidencia: ${plainText(objective.evidence).slice(0,100)} · Brecha: ${plainText(objective.gap).slice(0,100)}`,{certificationId:cert.id});
  for(const item of data.assessments?.cases||[])add('assessment',item.id,item.title,[item.category,item.brief,item.deliverable].filter(v=>typeof v==='string').join(' '));
  for(const [id,title,description]of [
   ['onboarding','Guía de inicio','Preparar el campus, disponibilidad, Windows, Kali y requisitos'],
   ['preparation','Certificaciones y evidencias','CC CCST Security+ BTL1 eJPT, dominios y bitácora'],
   ['assessment','Evaluación práctica independiente','Caso web y defensivo, alcance, informe y asistencia'],
   ['learning-history','Historial y refuerzo','Intentos, errores, omisiones, comparación y próximos repasos'],
   ['packet-analysis','Análisis de paquetes PCAP','Wireshark DNS TCP HTTP, casos guiado y transferencia, ZIP sin conexión'],
   ['recovery','Copias y recuperación','Respaldos JSON, checkpoints, archivo dañado y restauración'],
   ['calendar','Mi agenda','Organizar sesiones y fecha de revisión'],
   ['portfolio','Mi portafolio','Exportar informes PDF HTML y evidencias']
   ,['objectives','Mapa de objetivos','Objetivos oficiales CC CCST Security+ BTL1 eJPT, evidencia requerida y brechas de estudio']
   ,['topology','Laboratorio de máquinas virtuales','Topología aislada, Windows Linux Kali, adaptadores y preparación de nodos']
   ,['forensics','Laboratorio forense','Custodia, FAT16, memoria minidump, eventos EVTX y correlación de evidencias']
   ,['tutor','Revisión por tutor','Paquetes de informes entregados, huellas SHA256 y devolución de identidad declarada no verificada']
   ,['merge','Combinar avances','Importar respaldo, comparar conflictos y conservar alternativas de otros equipos']
  ])add('page',id,title,description);
  return items.slice(0,2000).map(item=>({...item,searchText:fold(item.id+' '+item.title+' '+item.description),titleText:fold(item.title)}));
 }
 function search(index,query,limit=12){if(!Array.isArray(index)||typeof query!=='string'||query.length>300)return[];const q=fold(query);if(!q)return[];const words=q.split(' ').slice(0,12),count=Number.isSafeInteger(limit)?Math.min(20,Math.max(1,limit)):12;return index.flatMap((item,position)=>{if(!words.every(word=>item.searchText.includes(word)))return[];const score=(item.titleText===q?100:0)+(item.titleText.startsWith(q)?30:0)+words.reduce((sum,word)=>sum+(item.titleText.includes(word)?5:1),0);return[{...item,score,position}];}).sort((a,b)=>b.score-a.score||a.position-b.position).slice(0,count);}
 return{buildIndex,search};
});
