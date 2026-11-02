(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CampusSearch=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const fold=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
 function buildIndex(data={}){
  const items=[],seen=new Set();function add(kind,id,title,description,extra={}){if(typeof id!=='string'||!id||typeof title!=='string'||!title||seen.has(kind+':'+id))return;seen.add(kind+':'+id);items.push({kind,id,title:title.slice(0,200),description:String(description||'').replace(/<[^>]*>/g,' ').slice(0,350),...extra});}
  for(const mod of data.curriculum?.modules||[])for(const lesson of mod.lessons||[])add('lesson',lesson.id,lesson.title,[mod.title,lesson.objective,lesson.practice?.environment].join(' '));
  for(const cert of data.competencies?.certifications||[])for(const domain of cert.domains||[])for(const skill of domain.skills||[])add('competency',skill.id,skill.title,[cert.name,domain.title,skill.canDo].join(' '),{certificationId:cert.id});
  for(const room of data.missions?.rooms||[])add('mission',room.id,room.title,room.description);
  for(const practice of data.practices?.practices||[])add('practice',practice.id,practice.title,[practice.platform,practice.description||practice.objective,practice.theory].filter(Boolean).join(' '));
  for(const campaign of data.practices?.campaigns||[])add('campaign',campaign.id,campaign.title,campaign.description||campaign.objective);
  for(const book of Array.isArray(data.library)?data.library:[])add('material',book.file,book.title,[book.tag,book.description].join(' '));
  return items.slice(0,2000).map(item=>({...item,searchText:fold(item.title+' '+item.description),titleText:fold(item.title)}));
 }
 function search(index,query,limit=12){if(!Array.isArray(index)||typeof query!=='string'||query.length>300)return[];const q=fold(query);if(!q)return[];const words=q.split(' ').slice(0,12),count=Number.isSafeInteger(limit)?Math.min(20,Math.max(1,limit)):12;return index.flatMap((item,position)=>{if(!words.every(word=>item.searchText.includes(word)))return[];const score=(item.titleText===q?100:0)+(item.titleText.startsWith(q)?30:0)+words.reduce((sum,word)=>sum+(item.titleText.includes(word)?5:1),0);return[{...item,score,position}];}).sort((a,b)=>b.score-a.score||a.position-b.position).slice(0,count);}
 return{buildIndex,search};
});
