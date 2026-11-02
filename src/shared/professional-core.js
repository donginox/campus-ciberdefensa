(function(root,factory){'use strict';if(typeof module==='object'&&module.exports)module.exports=factory(require('../content/learning.json'));else root.ProfessionalCore=factory(root.CAMPUS_LEARNING);})(typeof globalThis!=='undefined'?globalThis:this,function(data){
'use strict';
const bank=data.questions,byId=new Map(bank.map(q=>[q.id,q])),ids=new Set(byId.keys());
const safeId=v=>typeof v==='string'&&/^[a-z0-9][a-z0-9-]{0,79}$/.test(v)&&!['constructor','prototype'].includes(v);
const text=(v,n=160)=>typeof v==='string'?v.slice(0,n):'';
const int=(v,min,max,fallback)=>(typeof v==='number'||typeof v==='string')&&Number.isFinite(Number(v))?Math.max(min,Math.min(max,Math.trunc(Number(v)))):fallback;
const validDate=v=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const [y,m,d]=v.split('-').map(Number),date=new Date(y,m-1,d,12);return y>=2000&&y<=2100&&date.getFullYear()===y&&date.getMonth()===m-1&&date.getDate()===d};
function localDate(value){const d=value instanceof Date?value:new Date(value);if(!Number.isFinite(d.getTime()))throw new Error('Fecha no válida.');return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function addDays(date,days){if(!validDate(date))throw new Error('Fecha no válida.');const [y,m,d]=date.split('-').map(Number);return localDate(new Date(y,m-1,d+days,12))}
function timestamp(value){if(typeof value!=='string'||value.length>80||!Number.isFinite(Date.parse(value)))return null;return new Date(value).toISOString()}
function explicitNow(value){const t=timestamp(value instanceof Date?value.toISOString():value);if(!t)throw new Error('Indicá una fecha y hora válidas.');return t}
const validOrder=value=>Array.isArray(value)&&value.length===4&&new Set(value).size===4&&value.every(n=>Number.isInteger(n)&&n>=0&&n<4);
function randomFor(seed){let n=2166136261;for(const c of seed)n=Math.imul(n^c.charCodeAt(0),16777619);return ()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296}}
function shuffle(values,random){const result=values.slice();for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]]}return result}
function domains(raw){const result={};for(const d of data.domains){const v=raw?.[d.id];if(v&&typeof v==='object'){const total=int(v.total,0,48,0);result[d.id]={total,score:int(v.score,0,total,0)}}}return result}
function result(raw){
 if(!raw||typeof raw!=='object'||!timestamp(raw.submittedAt)||!['diagnostic','exam'].includes(raw.kind))return null;
 if(raw.kind==='exam'&&!data.certifications.some(c=>c.id===raw.certificationId))return null;
 const total=int(raw.total,1,48,24),feedback=[],seen=new Set();
 if(raw.bankVersion===undefined||raw.bankVersion===1||raw.bankVersion===2)for(const f of (Array.isArray(raw.feedback)?raw.feedback:[]).slice(0,48)){
  if(!ids.has(f?.questionId)||seen.has(f.questionId)||(f.selected!==null&&(!Number.isInteger(f.selected)||f.selected<0||f.selected>3)))continue;
  const q=byId.get(f.questionId),selected=f.selected===null?null:raw.bankVersion===2?f.selected:q.legacyOptionOrder[f.selected];
  seen.add(q.id);feedback.push({questionId:q.id,selected,correct:selected===q.correct});
 }
 const complete=feedback.length===total,score=complete?feedback.filter(f=>f.correct).length:int(raw.score,0,total,0),scores={};
 for(const f of feedback){const id=byId.get(f.questionId).domain;scores[id]||={score:0,total:0};scores[id].total++;scores[id].score+=f.correct?1:0}
 return {id:text(raw.id,100),bankVersion:2,kind:raw.kind,certificationId:data.certifications.some(c=>c.id===raw.certificationId)?raw.certificationId:'cc',submittedAt:timestamp(raw.submittedAt),total,score,percent:Math.round(score/total*100),omitted:complete?feedback.filter(f=>f.selected===null).length:int(raw.omitted,0,total,0),domains:complete?scores:domains(raw.domains),feedback};
}
function normalize(raw){const s=raw&&typeof raw==='object'?raw:{},settings=s.settings||{};const r={version:1,attemptSequence:int(s.attemptSequence,0,1000000000,0),settings:{targetDate:validDate(settings.targetDate)?settings.targetDate:'2026-12-15',weeklyMinutes:int(settings.weeklyMinutes,30,1200,180),certificationId:data.certifications.some(c=>c.id===settings.certificationId)?settings.certificationId:'cc'},diagnostic:null,activeAttempt:null,history:[],reviews:{},sessions:[],calendarDraft:{id:'',date:'',title:'',minutes:30},settingsDraft:null};
 if(s.diagnostic&&typeof s.diagnostic==='object')r.diagnostic={submittedAt:timestamp(s.diagnostic.submittedAt),domains:domains(s.diagnostic.domains),percent:int(s.diagnostic.percent,0,100,0)};
 r.history=(Array.isArray(s.history)?s.history:[]).slice(0,20).map(result).filter(Boolean);
 const historyIds=new Set();for(const [i,h]of r.history.entries()){if(!h.id||historyIds.has(h.id)){let candidate='history-'+i;while(historyIds.has(candidate))candidate+='-copy';h.id=candidate}historyIds.add(h.id)}
 const a=s.activeAttempt;if(a&&['diagnostic','exam'].includes(a.kind)&&timestamp(a.startedAt)){const questionIds=[...new Set((Array.isArray(a.questionIds)?a.questionIds:[]).slice(0,48).filter(id=>ids.has(id)))];if(questionIds.length){const answers={},optionOrders={};for(const id of questionIds){const legacy=a.bankVersion!==2,order=a.optionOrders?.[id];optionOrders[id]=validOrder(order)?order.slice():legacy?byId.get(id).legacyOptionOrder.slice():[0,1,2,3];const n=a.answers?.[id];if((legacy||validOrder(order))&&Number.isInteger(n)&&n>=0&&n<4)answers[id]=n}r.activeAttempt={id:text(a.id,100)||'attempt',bankVersion:2,kind:a.kind,certificationId:data.certifications.some(c=>c.id===a.certificationId)?a.certificationId:r.settings.certificationId,startedAt:timestamp(a.startedAt),deadline:timestamp(a.deadline),questionIds,optionOrders,answers}}}
 for(const q of bank){const v=s.reviews?.[q.id];if(v&&validDate(v.dueDate))r.reviews[q.id]={dueDate:v.dueDate,interval:int(v.interval,1,14,1),lapses:int(v.lapses,0,999,0),repetitions:int(v.repetitions,0,999,0)}}
 const seen=new Set();for(const v of (Array.isArray(s.sessions)?s.sessions:[]).slice(0,100)){if(!safeId(v?.id)||seen.has(v.id)||!validDate(v.date)||!text(v.title).trim())continue;seen.add(v.id);r.sessions.push({id:v.id,date:v.date,title:text(v.title).trim(),minutes:int(v.minutes,5,240,30)})}
 if(s.calendarDraft&&typeof s.calendarDraft==='object')r.calendarDraft={id:safeId(s.calendarDraft.id)?s.calendarDraft.id:'',date:text(s.calendarDraft.date,10),title:text(s.calendarDraft.title),minutes:int(s.calendarDraft.minutes,5,240,30)};
 if(s.settingsDraft&&typeof s.settingsDraft==='object')r.settingsDraft={targetDate:text(s.settingsDraft.targetDate,10),weeklyMinutes:int(s.settingsDraft.weeklyMinutes,30,1200,180),certificationId:data.certifications.some(c=>c.id===s.settingsDraft.certificationId)?s.settingsDraft.certificationId:r.settings.certificationId};return r;
}
function updateSettings(raw,patch){const r=normalize(raw);if(!validDate(patch.targetDate))throw new Error('Elegí una fecha objetivo válida.');if(!Number.isFinite(Number(patch.weeklyMinutes))||patch.weeklyMinutes<30||patch.weeklyMinutes>1200)throw new Error('Elegí entre 30 y 1200 minutos semanales.');if(!data.certifications.some(c=>c.id===patch.certificationId))throw new Error('Elegí una certificación del mapa.');r.settings={targetDate:patch.targetDate,weeklyMinutes:Math.trunc(Number(patch.weeklyMinutes)),certificationId:patch.certificationId};r.settingsDraft=null;return r}
function startAttempt(raw,{kind='exam',certificationId,timed=false,now}={}){const r=normalize(raw),t=explicitNow(now);if(r.activeAttempt)throw new Error('Ya tenés un intento activo. Retomalo o descartalo antes de empezar otro.');if(!['diagnostic','exam'].includes(kind))throw new Error('Tipo de evaluación no válido.');const cert=data.certifications.find(c=>c.id===(certificationId||r.settings.certificationId));if(!cert)throw new Error('Certificación no válida.');r.attemptSequence++;const random=randomFor(kind+'|'+cert.id+'|'+t+'|'+r.attemptSequence);let selected;
 if(kind==='diagnostic')selected=data.domains.flatMap(d=>shuffle(bank.filter(q=>q.domain===d.id),random).slice(0,3));
 else selected=cert.domains.flatMap(d=>bank.filter(q=>q.domain===d));
 selected=shuffle(selected,random);const correctPositions=shuffle(selected.map((_,i)=>i%4),random),optionOrders={};
 selected.forEach((q,i)=>{const order=shuffle([0,1,2,3].filter(n=>n!==q.correct),random);order.splice(correctPositions[i],0,q.correct);optionOrders[q.id]=order});
 r.activeAttempt={id:kind+'-'+Date.parse(t)+'-'+r.attemptSequence,bankVersion:2,kind,certificationId:cert.id,startedAt:t,deadline:timed&&kind==='exam'?new Date(Date.parse(t)+cert.examMinutes*60000).toISOString():null,questionIds:selected.map(q=>q.id),optionOrders,answers:{}};return r;
}
function remainingSeconds(raw,now){const r=normalize(raw),t=explicitNow(now),a=r.activeAttempt;return a?.deadline?Math.max(0,Math.ceil((Date.parse(a.deadline)-Date.parse(t))/1000)):null}
function answer(raw,id,choice,now){const r=normalize(raw),a=r.activeAttempt;if(!a||!a.questionIds.includes(id))throw new Error('La pregunta no pertenece al intento activo.');if(now&&remainingSeconds(r,now)===0)throw new Error('El tiempo terminó. Entregá para ver el resultado.');if(!Number.isInteger(choice)||choice<0||choice>3)throw new Error('Respuesta no válida.');a.answers[id]=choice;return r}
function abandon(raw){const r=normalize(raw);r.activeAttempt=null;return r}
function review(raw,id,rating,now){const r=normalize(raw);if(!ids.has(id)||!['again','hard','good'].includes(rating))throw new Error('Repaso no válido.');const today=localDate(explicitNow(now)),old=r.reviews[id]||{interval:1,lapses:0,repetitions:0};const interval=rating==='again'?1:rating==='hard'?Math.min(3,old.interval):old.repetitions===0?3:old.interval<7?7:14;r.reviews[id]={dueDate:addDays(today,interval),interval,lapses:old.lapses+(rating==='again'?1:0),repetitions:old.repetitions+1};return r}
function submit(raw,now){let r=normalize(raw);const t=explicitNow(now),a=r.activeAttempt;if(!a)throw new Error('No hay un intento activo.');const missing=a.questionIds.filter(id=>!Object.hasOwn(a.answers,id));if(missing.length&&remainingSeconds(r,t)!==0)throw new Error('Respondé todas las preguntas antes de entregar. Faltan '+missing.length+'.');const scores={},feedback=[];let score=0;for(const id of a.questionIds){const q=byId.get(id),selected=Object.hasOwn(a.answers,id)?a.optionOrders[id][a.answers[id]]:null,correct=selected===q.correct;scores[q.domain]||={score:0,total:0};scores[q.domain].total++;scores[q.domain].score+=correct?1:0;score+=correct?1:0;feedback.push({questionId:id,selected,correct});r=review(r,id,correct?'good':'again',t)}const item={id:a.id,bankVersion:2,kind:a.kind,certificationId:a.certificationId,submittedAt:t,total:a.questionIds.length,score,percent:Math.round(score/a.questionIds.length*100),omitted:missing.length,domains:scores,feedback};r.history=[item,...r.history].slice(0,20);if(a.kind==='diagnostic')r.diagnostic={submittedAt:t,domains:scores,percent:item.percent};r.activeAttempt=null;return r}
function upsertSession(raw,session){const r=normalize(raw);if(!validDate(session?.date))throw new Error('Elegí una fecha válida.');const title=text(session.title).trim();if(!title)throw new Error('Escribí un título para la sesión.');if(!Number.isFinite(Number(session.minutes))||session.minutes<5||session.minutes>240)throw new Error('La sesión debe durar entre 5 y 240 minutos.');let id=session.id;if(id&&!r.sessions.some(s=>s.id===id))throw new Error('La sesión ya no existe.');if(!id){if(r.sessions.length>=100)throw new Error('La agenda admite hasta 100 sesiones. Eliminá una antes de agregar otra.');let n=1;while(r.sessions.some(s=>s.id==='session-'+n))n++;id='session-'+n}r.sessions=r.sessions.filter(s=>s.id!==id).concat({id,date:session.date,title,minutes:Math.trunc(Number(session.minutes))}).sort((a,b)=>a.date.localeCompare(b.date));r.calendarDraft={id:'',date:'',title:'',minutes:30};return r}
function removeSession(raw,id){const r=normalize(raw);r.sessions=r.sessions.filter(s=>s.id!==id);if(r.calendarDraft.id===id)r.calendarDraft={id:'',date:'',title:'',minutes:30};return r}
function plan(raw,{now,study={},labs={},competencies=[]}={}){
 const r=normalize(raw),today=localDate(explicitNow(now));
 const done=id=>{const p=study.lessons?.[id];return p?.read&&p.practiceDone&&p.bestScore>=2};
 const cert=data.certifications.find(c=>c.id===r.settings.certificationId);
 const skills=(competencies.find?.(c=>c.id===cert.id)?.domains||[]).flatMap(d=>d.skills||[]);
 const rooms={data:'sql-investigation',security:'web-investigation',response:'soc-investigation'};
 const sorted=data.domains.map((d,i)=>{
  const lessons=[...new Set([d.lessonId,...(d.lessonIds||[])])],lessonId=lessons.find(id=>!done(id))||d.lessonId;
  const s=r.diagnostic?.domains[d.id],weak=s?.total?1-s.score/s.total:0.5;
  const pending=skills.filter(k=>k.lessonIds?.some(id=>lessons.includes(id))&&!(k.practice?.missionId&&labs['mission-'+k.practice.missionId]?.lastEvidence)).length;
  return {...d,lessonId,priority:weak*10+(done(lessonId)?0:1)+pending/10,index:i,weak,pending};
 }).sort((a,b)=>b.priority-a.priority||a.index-b.index);
 const actions=[];let budget=r.settings.weeklyMinutes;
 for(const [i,d]of sorted.entries()){
  if(budget<10)break;
  const minutes=Math.min(30,budget),practice=labs['practice-'+d.practiceId],readDone=done(d.lessonId);
  actions.push({id:'plan-'+d.id,date:addDays(today,Math.min(6,Math.floor(i*7/sorted.length))),domain:d.id,title:readDone?'Practicar y explicar: '+d.title:'Estudiar y practicar: '+d.title,minutes,reason:!r.diagnostic?'Punto de partida: diagnóstico pendiente; clase y evidencia por construir.':d.weak>0?'El diagnóstico muestra respuestas por reforzar; conectá el concepto con una evidencia.':'Consolidá el concepto en una práctica y explicá sus límites.',lessonId:d.lessonId,practiceId:d.practiceId,missionId:rooms[d.id]||null,competencyPending:d.pending,evidenceRecorded:!!practice?.evidence});budget-=minutes;
 }
 return actions;
}
// Historical views derive only retained submitted feedback. They never grade an active draft.
function historyDetails(raw,id){
 const item=normalize(raw).history.find(h=>h.id===id);if(!item)return null;
 const feedback=item.feedback.map(f=>{const q=byId.get(f.questionId);return {...f,domain:q.domain,question:q.question,selectedAnswer:f.selected===null?null:q.options[f.selected],answer:q.options[q.correct],explanation:q.explanation,rubric:q.rubric,lessonId:q.lessonId}}),scores={};
 for(const f of feedback){scores[f.domain]||={score:0,total:0,errors:0,omitted:0};const d=scores[f.domain];d.total++;if(f.correct)d.score++;else if(f.selected===null)d.omitted++;else d.errors++}
 return {...item,summaryScore:item.score,summaryOmitted:item.omitted,score:feedback.filter(f=>f.correct).length,omitted:feedback.filter(f=>f.selected===null).length,domains:scores,feedback,recordedQuestionCount:feedback.length,feedbackComplete:feedback.length===item.total};
}
function likeAttempts(a,b){return !!a&&!!b&&a.kind===b.kind&&(a.kind==='diagnostic'||a.certificationId===b.certificationId)}
function compareHistory(raw,leftId,rightId){
 const left=historyDetails(raw,leftId),right=historyDetails(raw,rightId);
 if(!likeAttempts(left,right)||leftId===rightId)return {comparable:false,reason:'Elegí dos diagnósticos o dos simulacros de la misma certificación.'};
 const shared=left.feedback.filter(f=>right.feedback.some(r=>r.questionId===f.questionId)).length;
 return {comparable:true,leftTotal:left.total,rightTotal:right.total,leftRecorded:left.feedback.length,rightRecorded:right.feedback.length,domainSamples:data.domains.filter(d=>left.domains[d.id]||right.domains[d.id]).map(d=>({domain:d.id,left:left.domains[d.id]||{score:0,total:0,errors:0,omitted:0},right:right.domains[d.id]||{score:0,total:0,errors:0,omitted:0}})),sharedQuestions:shared,rightNewQuestions:right.feedback.length-shared,feedbackComplete:left.feedbackComplete&&right.feedbackComplete,scoreDelta:left.feedbackComplete&&right.feedbackComplete?right.score-left.score:null,independentEvidence:false};
}
function remediation(raw,{attemptId,now}={}){
 const r=normalize(raw),today=localDate(explicitNow(now)),selected=historyDetails(r,attemptId);
 if(!selected)return {actions:[],recurring:[],nextReviewDate:null,sampleAttempts:0};
 const samples=r.history.filter(h=>likeAttempts(h,selected)&&h.submittedAt<=selected.submittedAt),counts=new Map();
 for(const h of samples)for(const f of h.feedback){const entry=counts.get(f.questionId)||{questionId:f.questionId,domain:byId.get(f.questionId).domain,errors:0,omissions:0,appearances:0};entry.appearances++;if(!f.correct){if(f.selected===null)entry.omissions++;else entry.errors++}counts.set(f.questionId,entry)}
 const recurring=[...counts.values()].filter(e=>e.errors+e.omissions>1).sort((a,b)=>(b.errors+b.omissions)-(a.errors+a.omissions)||a.questionId.localeCompare(b.questionId)),weak=new Map();
 for(const f of selected.feedback.filter(f=>!f.correct)){const old=weak.get(f.domain)||{domain:f.domain,errors:0,omissions:0,weight:0,lessonId:f.lessonId,questionIds:[]};if(f.selected===null)old.omissions++;else old.errors++;old.weight+=counts.get(f.questionId)?.errors+counts.get(f.questionId)?.omissions||1;old.questionIds.push(f.questionId);weak.set(f.domain,old)}
 const actions=[...weak.values()].sort((a,b)=>b.weight-a.weight||a.domain.localeCompare(b.domain)).slice(0,3).map(e=>{const d=data.domains.find(d=>d.id===e.domain),scheduled=e.questionIds.map(id=>r.reviews[id]?.dueDate).filter(Boolean).sort()[0],reviewDate=scheduled?(scheduled<today?today:scheduled):addDays(today,1);return {domain:e.domain,title:'Explicá y comprobá: '+d.title,reason:e.errors+' errores y '+e.omissions+' omisiones en esta muestra. Explicá el criterio con tus palabras y contrastalo en la práctica relacionada.',lessonId:e.lessonId,practiceId:d.practiceId,missionId:({data:'sql-investigation',security:'web-investigation',response:'soc-investigation'})[e.domain]||null,reviewDate}});
 return {actions,recurring,nextReviewDate:actions.map(a=>a.reviewDate).sort()[0]||null,sampleAttempts:samples.length};
}
function dueReviews(raw,now){const r=normalize(raw),today=localDate(explicitNow(now));return bank.filter(q=>r.reviews[q.id]?.dueDate<=today).map(q=>({...q,review:r.reviews[q.id]}))}
return {normalize,localDate,validDate,addDays,updateSettings,startAttempt,remainingSeconds,answer,abandon,submit,review,upsertSession,removeSession,plan,dueReviews,historyDetails,compareHistory,remediation};
});
