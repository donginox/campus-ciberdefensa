'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');let search;try{search=require('../src/shared/campus-search.js');}catch(error){if(error.code!=='MODULE_NOT_FOUND')throw error;}
test('búsqueda global encuentra clases, competencias, salas y prácticas con tildes o varios términos',()=>{
 assert.equal(typeof search?.buildIndex,'function');const index=search.buildIndex({curriculum:require('../src/content/campus.json').curriculum,competencies:require('../src/content/competencies.json'),missions:require('../src/content/missions.json'),practices:{practices:[{id:'win-events',title:'Investigar eventos Windows',description:'Registro y correlación'}]},library:[]});
 const result=search.search(index,'windows eventos');assert.ok(result.some(item=>item.kind==='practice'&&item.id==='win-events'));assert.ok(search.search(index,'autorizacion').length>0);assert.ok(search.search(index,'sql').some(item=>item.kind==='mission'));assert.equal(search.search(index,'zzzz-no-existe').length,0);
});
test('entradas y límites inválidos no construyen índices o respuestas enormes',()=>{const index=search.buildIndex({library:[{file:'a.txt',title:'Uno',description:'demo'}]});assert.equal(search.search(index,'').length,0);assert.ok(search.search(index,'uno',100000).length<=20);assert.equal(search.search(index,'x'.repeat(1000)).length,0);});
test('la búsqueda encuentra las rutas completas para empezar, analizar paquetes y recuperar el trabajo',()=>{const index=search.buildIndex();assert.ok(search.search(index,'pcap').some(r=>r.kind==='page'&&r.id==='packet-analysis'));assert.ok(search.search(index,'archivo dañado').some(r=>r.id==='recovery'));assert.ok(search.search(index,'disponibilidad').some(r=>r.id==='onboarding'));});
test('indexa objetivos públicos y casos nuevos con referencias que permiten abrirlos sin notas privadas',()=>{
 const catalog=require('../src/content/objectives.json'),assessments=require('../src/content/assessments.json');
 const index=search.buildIndex({assessments,labs:{'objective-progress':{note:'PRIVATE_STUDENT_NOTE'},'tutor-reviews':{comments:'PRIVATE_TUTOR_COMMENT'}}},catalog);
 assert.equal(index.filter(r=>r.kind==='objective').length,156);
 const objective=index.find(r=>r.kind==='objective'&&r.id==='cc:1.1');assert.equal(objective.certificationId,'cc');assert.match(objective.title,/1\.1/);assert.match(objective.title,/CIA/);for(const name of ['Método:','Evidencia:','Brecha:'])assert.ok(objective.description.includes(name));
 assert.ok(search.search(index,'cc:1.1').some(r=>r.id==='cc:1.1'));
 for(const id of ['objectives','topology','forensics','tutor','merge'])assert.ok(index.some(r=>r.kind==='page'&&r.id===id),id);
 for(const id of assessments.cases.slice(2).map(c=>c.id))assert.ok(index.some(r=>r.kind==='assessment'&&r.id===id),id);
 assert.doesNotMatch(JSON.stringify(index),/PRIVATE_STUDENT_NOTE|PRIVATE_TUTOR_COMMENT/);
});
test('el índice público elimina HTML, conserva orden y límites y tiene paridad UMD sin mutar entradas',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),catalog={certifications:[{id:'sample',examCode:'S',domains:[{title:'Dominio',objectives:[{id:'sample:1',officialId:'1',title:'<img src=x> Objetivo seguro',activity:'Método <script>bad()</script>',evidence:'Prueba',gap:'Pendiente'}]}]}]},data={library:Array.from({length:30},(_,i)=>({file:'book-'+i,title:'Iguales',description:'demo'}))};
 const before=JSON.stringify({data,catalog}),native=search.buildIndex(data,catalog),sandbox={};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require.resolve('../src/shared/campus-search.js'),'utf8'),sandbox);
 assert.deepEqual(JSON.parse(JSON.stringify(sandbox.CampusSearch.buildIndex(data,catalog))),native);assert.equal(JSON.stringify({data,catalog}),before);
 assert.doesNotMatch(native.find(r=>r.kind==='objective').title,/<|>/);assert.doesNotMatch(native.find(r=>r.kind==='objective').description,/<|>/);
 assert.equal(search.search(native,'iguales').length,12);assert.equal(search.search(native,'iguales',999).length,20);assert.deepEqual(search.search(native,'iguales').map(r=>r.id),Array.from({length:12},(_,i)=>'book-'+i));assert.deepEqual(search.search(native,'iguales'),search.search(native,'iguales'));
});
