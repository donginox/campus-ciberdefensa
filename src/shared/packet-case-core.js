(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.PacketCaseCore=factory()})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const caseIds=['guiado','transferencia'],fields=['filters','timeline','evidence','interpretation','alternative'];
 const text=v=>typeof v==='string'?v.slice(0,1500):'';
 const report=raw=>Object.fromEntries(fields.map(k=>[k,text(raw?.[k])]));
 const bytes=s=>unescape(encodeURIComponent(s)).length;
 function validate(r){for(const k of fields)if(typeof r?.[k]!=='string'||r[k].trim().length<20)throw Error('Completá cada campo del informe con al menos 20 caracteres.');if(!/(?:paquetes?|packets?|frames?|tramas?|#|n[úu]m(?:ero)?[ .:]*)\s*(?:n[º°.]?\s*)?\d{1,5}\b/i.test(r.evidence))throw Error('Referenciá al menos un número de paquete en la evidencia (por ejemplo: paquete 3).')}
 function known(id){if(!caseIds.includes(id))throw Error('Elegí un caso válido.')}
 function normalize(raw){
  const out={version:1,selectedCase:caseIds.includes(raw?.selectedCase)?raw.selectedCase:'guiado',cases:{}};
  for(const id of caseIds){const s=raw?.cases?.[id],c={draft:report(s?.draft),attempt:null,guidanceUsed:false,guidanceOpened:false,guidanceExported:false};const a=s?.attempt;
   if(a&&typeof a.submittedAt==='string'&&/^20\d{2}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(a.submittedAt)&&Number.isFinite(Date.parse(a.submittedAt))){try{const r=report(a.report);validate(r);c.attempt={submittedAt:a.submittedAt,report:r};c.guidanceUsed=s.guidanceUsed===true||s.guidanceOpened===true||s.guidanceExported===true;c.guidanceOpened=s.guidanceOpened===true;c.guidanceExported=s.guidanceExported===true}catch{}}
   out.cases[id]=c;
  }
  // Shared profile storage has a 40 kB record budget. Trim drafts before saved reports.
  while(bytes(JSON.stringify(out))>40000){const candidates=caseIds.flatMap(id=>fields.map(k=>[out.cases[id].draft,k]));let slot=candidates.sort((a,b)=>b[0][b[1]].length-a[0][a[1]].length)[0];if(!slot[0][slot[1]])break;const s=slot[0][slot[1]],amount=Math.max(2,Math.ceil((bytes(JSON.stringify(out))-40000)/4));slot[0][slot[1]]=s.slice(0,Math.max(0,s.length-amount)).replace(/[\uD800-\uDBFF]$/,'')}
  // Reports with exceptionally dense Unicode also stay bounded, preserving valid declarations.
  if(bytes(JSON.stringify(out))>40000)for(const id of caseIds){out.cases[id].attempt=null;out.cases[id].guidanceUsed=false;out.cases[id].guidanceOpened=false;out.cases[id].guidanceExported=false}
  return out;
 }
 function updateDraft(raw,id,patch){known(id);const r=normalize(raw);r.cases[id].draft=report({...r.cases[id].draft,...patch});return normalize(r)}
 function submit(raw,id,at=new Date().toISOString()){known(id);const r=normalize(raw);validate(r.cases[id].draft);if(r.cases[id].attempt)throw Error('El primer informe ya está registrado. Conservá las revisiones en el borrador y compará con el caso nuevo.');r.cases[id].attempt={submittedAt:at,report:report(r.cases[id].draft)};const next=normalize(r);if(!next.cases[id].attempt)throw Error('El informe supera el espacio disponible. Acortá el texto y reintentá.');return next}
 function markGuidance(raw,id,kind){known(id);const r=normalize(raw),c=r.cases[id];if(!c.attempt)throw Error('Guardá primero un informe del caso.');if(!['open','export'].includes(kind))throw Error('Acción de guía inválida.');c.guidanceUsed=true;c[kind==='open'?'guidanceOpened':'guidanceExported']=true;return r}
 function summary(raw){const r=normalize(raw);return {declaredReports:caseIds.filter(id=>r.cases[id].attempt).length,guidanceUsed:caseIds.filter(id=>r.cases[id].guidanceUsed).length,cases:Object.fromEntries(caseIds.map(id=>[id,{declared:!!r.cases[id].attempt,guidanceUsed:r.cases[id].guidanceUsed}])),note:'Informes declarados por el alumno; no acreditan dominio. Compará el razonamiento con un caso nuevo.'}}
 return {normalize,updateDraft,submit,markGuidance,summary,fields,caseIds};
});
