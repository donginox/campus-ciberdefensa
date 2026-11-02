'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const campus=require('../src/content/campus.json'),missions=require('../src/content/missions.json'),competencies=require('../src/content/competencies.json');
test('las rutas de contenido conectan clases, salas y competencias existentes sin objetivos huérfanos',()=>{
 const lessons=new Set(campus.curriculum.modules.flatMap(m=>m.lessons.map(l=>l.id))),rooms=new Set(missions.rooms.map(r=>r.id)),skills=competencies.certifications.flatMap(c=>c.domains.flatMap(d=>d.skills)),ids=new Set(skills.map(s=>s.id));
 assert.equal(rooms.size,3);assert.equal(skills.length,27);assert.equal(ids.size,27);assert.equal(competencies.certifications.length,5);
 for(const room of missions.rooms){for(const id of room.lessonIds)assert.ok(lessons.has(id),id);for(const id of room.competencyIds)assert.ok(ids.has(id),id);assert.equal(new Set(room.tasks.map(t=>t.id)).size,room.tasks.length);}
 for(const skill of skills){for(const id of skill.lessonIds)assert.ok(lessons.has(id),id);if(skill.practice.missionId)assert.ok(rooms.has(skill.practice.missionId));assert.equal(new URL(skill.sourceUrl).protocol,'https:');}
});
test('el contenido empaquetado del renderer coincide con el catálogo fuente revisable',()=>{
 for(const [file,key,source]of [['missions.js','CAMPUS_MISSIONS',missions],['competencies.js','CAMPUS_COMPETENCIES',competencies]]){const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/content',file),'utf8'),context);assert.deepEqual(JSON.parse(JSON.stringify(context.window[key])),source);}
});
