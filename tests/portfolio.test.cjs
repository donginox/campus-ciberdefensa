'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
let portfolio;try{portfolio=require('../desktop/portfolio.cjs');}catch(error){if(error.code!=='MODULE_NOT_FOUND')throw error;}
const data={curriculum:require('../src/content/campus.json').curriculum,competencies:require('../src/content/competencies.json')};
test('el portafolio PCAP conserva el primer informe y omite sus revisiones todavía no entregadas',()=>{
 const core=require('../src/shared/packet-case-core.js');let r=core.normalize();for(const key of core.fields)r=core.updateDraft(r,'guiado',{[key]:key==='evidence'?'Paquete 3: evidencia sintética registrada.':'INFORME_PCAP propio con un resultado acotado.'});r=core.submit(r,'guiado','2026-11-02T10:00:00.000Z');r=core.updateDraft(r,'guiado',{interpretation:'REVISION_PRIVADA_NO_ENTREGADA con otra conclusión.'});
 const output=portfolio.buildPortfolio({name:'Ana',study:{lessons:{}},labs:{'packet-casework':r}},data);assert.match(output.html,/INFORME_PCAP/);assert.match(output.html,/Paquete 3/);assert.doesNotMatch(output.html,/REVISION_PRIVADA_NO_ENTREGADA/);assert.match(output.html,/Tráfico sintético/);
});
test('el portafolio separa evidencia declarada y resultados acotados sin ejecutar texto del alumno',()=>{
 assert.equal(typeof portfolio?.buildPortfolio,'function');const result=portfolio.buildPortfolio({name:'Ana <script>alert(1)</script>',study:{lessons:{'hardware-recursos':{read:true,practiceDone:true,answer:'Observé el uso de memoria.',notes:'<img src=x onerror=alert(1)>',bestScore:2}}},labs:{'mission-soc-investigation':{notes:'Investigué los fallos.',lastEvidence:{caseId:'SOC-1',summary:'Tráfico HTTP observado',observedAt:'2026-11-02'}}}},data,{now:'2026-11-02T12:00:00Z'});
 assert.match(result.html,/Ana &lt;script&gt;/);assert.doesNotMatch(result.html,/<script|<img/i);assert.match(result.html,/Observé el uso de memoria/);assert.match(result.html,/SOC-1/);assert.match(result.html,/revisión/i);assert.match(result.html,/no acredita/i);assert.equal(result.summary.readLessons,1);assert.equal(result.summary.declaredPractices,1);
});
test('el documento está offline y omite tablas o datos de host que no son evidencia elegida',()=>{
 const result=portfolio.buildPortfolio({name:'Persona',study:{lessons:{}},labs:{'practice-win-processes':{notes:'Mi síntesis elegida.',observation:{rows:[{name:'HOST_PRIVATE'}]},rows:[['HOST_PRIVATE']],lastEvidence:{summary:'Síntesis registrada.'}}}},data,{now:'2026-11-02T12:00:00Z'});
 assert.match(result.html,/Mi síntesis elegida/);assert.doesNotMatch(result.html,/HOST_PRIVATE/);assert.match(result.html,/default-src 'none'/);assert.match(result.html,/script-src 'none'/);assert.ok(result.html.length<2*1024*1024);
});
test('importar notas enormes produce un resumen legible con aviso de recorte y no bloquea PDF',()=>{
 const result=portfolio.buildPortfolio({name:'Persona',study:{lessons:{'hardware-recursos':{notes:'x'.repeat(20000)}}},labs:{'practice-test':{notes:'y'.repeat(100000)}}},data,{now:'2026-11-02T12:00:00Z'});
 assert.match(result.html,/recortad/i);assert.ok(result.html.length<50000);assert.ok(result.summary.textSections>=2);
});
test('el portafolio incluye síntesis elegidas de prácticas y etapas de campañas',()=>{const result=portfolio.buildPortfolio({name:'Ana',study:{lessons:{}},labs:{'practice-win-events':{summary:'Síntesis elegida',evidence:{source:'real-host',summary:'Comparé dos lecturas del registro.'}},'campaign-http-access':{stages:{initial:{answer:'Delimité el caso y su alcance.'}}}}},data);assert.match(result.html,/Síntesis elegida/);assert.match(result.html,/Comparé dos lecturas/);assert.match(result.html,/Delimité el caso/);});
test('incluye evaluaciones entregadas pero no respuestas del intento activo',()=>{const result=portfolio.buildPortfolio({name:'Ana',study:{lessons:{}},labs:{'professional-learning':{history:[{kind:'diagnostic',submittedAt:'2026-11-02T10:00:00Z',score:15,total:24}],activeAttempt:{answers:{SECRET_ACTIVE:'Do not export this'}}}}},data);assert.match(result.html,/15\/24/);assert.match(result.html,/Diagnóstico/);assert.doesNotMatch(result.html,/SECRET_ACTIVE|Do not export/);});
test('el documento incluye la bitácora y solo informes prácticos entregados, con ayuda y límites explícitos',()=>{
 const prep=require('../src/shared/preparation-core.js'),assessment=require('../src/shared/assessment-core.js'),skill=data.competencies.certifications[0].domains[0].skills[0].id;
 const ledger=prep.add(null,{certificationId:'cc',competencyId:skill,date:'2026-11-02',environment:'VM aislada propia',procedure:'PROCEDIMIENTO_BITACORA: observé y comparé.',result:'Resultado acotado y reproducible.',interpretation:'Mi conclusión requiere otra muestra.',help:'assisted',review:'tutor',reviewNotes:'Revisión declarada por mí.'});
 let practical=assessment.start(null,'web-control-review',{environment:'Objetivo propio y aislado de práctica.',baseline:'Estado inicial registrado antes de observar.',scope:'Solo el objetivo autorizado del campus.',scopeConfirmed:true},'2026-11-02T10:00:00.000Z');
 const patch=Object.fromEntries(assessment.REPORT_FIELDS.map(k=>[k,'INFORME_ENTREGADO: observé un resultado acotado.']));practical=assessment.update(practical,'attempt-1',{...patch,independence:'independent',reviewStatus:'self-declared'});practical=assessment.submit(practical,'attempt-1','2026-11-02T10:30:00.000Z');
 practical=assessment.start(practical,'soc-containment-review',{environment:'Otro entorno propio y aislado de práctica.',baseline:'Una nueva línea de base con datos propios.',scope:'Solo el objetivo defensivo autorizado del campus.',scopeConfirmed:true},'2026-11-02T11:00:00.000Z');practical=assessment.update(practical,'attempt-2',{executiveSummary:'BORRADOR_PRIVADO_NO_ENTREGADO y otra información.'});
 const result=portfolio.buildPortfolio({name:'Ana',study:{lessons:{}},labs:{'preparation-ledger':ledger,'independent-assessment':practical}},data);
 assert.match(result.html,/PROCEDIMIENTO_BITACORA/);assert.match(result.html,/INFORME_ENTREGADO/);assert.match(result.html,/asistencia|ayuda/i);assert.match(result.html,/declarad/i);assert.doesNotMatch(result.html,/BORRADOR_PRIVADO_NO_ENTREGADO/);
});

test('el portafolio conserva procedencia y rúbrica sin convertir revisión propia en verificación',()=>{
 const practices=require('../src/content/system-practices.json');
 const make=source=>portfolio.buildPortfolio({labs:{'practice-win-processes':{evidence:{source,summary:'Dos lecturas comparadas con límites.',evidenceId:'OBS-<42>',observedAt:'2026-11-02T14:20:00Z'},rubric:{0:true,1:false,2:true},review:{kind:'self-review',declaredAt:'2026-11-02T14:30:00Z'}}}},{...data,practices},{now:'2026-11-02T12:00:00Z'});
 const real=make('real-host').html,manual=make('manual').html;
 assert.notEqual(real,manual);assert.match(real,/Observación real del equipo/);assert.match(manual,/Declaración manual/);assert.match(real,/OBS-&lt;42&gt;/);assert.match(real,/2026-11-02T14:20:00Z/);assert.match(real,/Indica PID anonimizado/);assert.match(real,/Pendiente: Distingue CPU acumulado/);assert.doesNotMatch(real,/Revisión propia declarada/);assert.match(real,/Corrección y alcance pendientes de revisión/);
});
test('las brechas exportadas reflejan trabajo del perfil y objetivos concretos del contenido',()=>{
 const competencies={certifications:[{id:'sample',name:'Ruta docente',coverageNote:'Falta cubrir almacenamiento remoto.',domains:[{skills:[{id:'read',title:'Objetivo leído',lessonIds:['lesson'],practice:{kind:'guided'},evidence:'Procedimiento reproducible',readinessQuestion:'¿Por qué ese permiso?'},{id:'external',title:'Entorno externo pendiente',practice:{kind:'external',missionId:'case'},evidence:'Captura propia revisada',readinessQuestion:'¿Cómo repetirlo?'}]}]}]};
 const make=study=>portfolio.buildPortfolio({study,labs:{'mission-case':{lastEvidence:{caseId:'CASE-1',summary:'Observación local.'}}}},{competencies}).html;
 const html=make({lessons:{lesson:{read:true}}});assert.match(html,/Competencias y brechas pendientes/);assert.match(html,/Objetivo leído/);assert.match(html,/Lectura registrada; práctica y revisión pendientes/);assert.match(html,/Entorno externo pendiente/);assert.match(html,/Falta ejecutar y revisar en el entorno externo/);assert.match(html,/Falta cubrir almacenamiento remoto/);assert.match(html,/Procedimiento reproducible/);assert.notEqual(html,make({lessons:{}}));
});
test('agotar exactamente el presupuesto avisa que se omitió evidencia posterior',()=>{
 const lessons=Object.fromEntries(Array.from({length:24},(_,i)=>['lesson-'+i,{answer:'a'.repeat(250),notes:'n'.repeat(3500)}]));
 const html=portfolio.buildPortfolio({study:{lessons},labs:{'practice-later':{notes:'Evidencia guardada después de las clases.'}}},{}).html;
 assert.doesNotMatch(html,/Evidencia guardada después/);assert.match(html,/Se recortaron textos/);
});

test('las brechas toleran campos JSON importados con tipos distintos del texto esperado',()=>{
 const competencies={certifications:[{name:'Ruta',domains:[{skills:[{id:'one',title:'Competencia pendiente',lessonIds:[],practice:{missionId:'test',labId:'test'},evidence:'Evidencia esperada'}]}]}]};
 const practices={practices:[{id:'test',competencyIds:['one'],rubric:['Criterio actual']} ]};
 const cases=[{mission:{notes:42}},{mission:{tasks:{one:{answer:42,done:'true'}}}},{practice:{answer:42}},{practice:{notes:{toString:null}}},{lab:{attempts:{valueOf:null,toString:null}}},{mission:{lastEvidence:{caseId:42}}},{practice:{evidence:{source:'manual',summary:42}}}];
 for(const item of cases){let html;assert.doesNotThrow(()=>{html=portfolio.buildPortfolio({labs:{'mission-test':item.mission,'practice-test':item.practice,test:item.lab}},{competencies,practices}).html},JSON.stringify(item));assert.match(html,/Sin evidencia registrada/,JSON.stringify(item));}
});
test('la revisión propia exportada requiere evidencia elegida y cada criterio de la rúbrica actual',()=>{
 const practices={practices:[{id:'test',title:'Práctica',rubric:['Primer criterio','Segundo criterio']}]};
 const valid={evidence:{source:'manual',summary:'Síntesis registrada por el alumno'},rubric:{0:true,1:true},review:{kind:'self-review',declaredAt:'2026-11-02'}};
 const make=record=>portfolio.buildPortfolio({labs:{'practice-test':record}},{practices}).html;
 assert.match(make(valid),/Revisión propia declarada/);
 for(const record of [{...valid,evidence:null},{...valid,evidence:{source:'manual',summary:'   '}},{...valid,evidence:{source:'manual',summary:42}},{...valid,rubric:{}},{...valid,rubric:{0:true,1:false}},{...valid,rubric:{0:true,1:'true'}}])assert.doesNotMatch(make(record),/Revisión propia declarada/);
 assert.doesNotMatch(portfolio.buildPortfolio({labs:{'practice-test':valid}},{practices:{practices:[{id:'test',rubric:[]}]}}).html,/Revisión propia declarada/);
});

for(const [name,record]of Object.entries({caseId:{lastEvidence:{caseId:{toString:null}}},observedAt:{lastEvidence:{caseId:'CASE-OK',observedAt:{toString:null}}},executionCase:{lastExecution:{caseId:{toString:null}}},nestedArray:{lastEvidence:{caseId:[{toString:null}]}}}))test('exportar metadatos JSON no textuales no falla: '+name,()=>{
 const imported=require('../desktop/validation.cjs').jsonData({'mission-test':record},1024*1024);
 let result;assert.doesNotThrow(()=>{result=portfolio.buildPortfolio({name:'Ana',labs:imported},data)});assert.match(result.html,/Portafolio personal/);assert.doesNotMatch(result.html,/\[object Object\]|toString/);
 if(name==='observedAt'){assert.match(result.html,/CASE-OK/);assert.match(result.html,/Fecha no registrada/);}
});
test('los contenedores JSON con forma inválida no inventan notas ni bloquean otros registros válidos',()=>{
 const jsonValues=[null,false,42,'texto',['entrada'],{toString:null,valueOf:null}];
 for(const value of jsonValues){const result=portfolio.buildPortfolio({name:'Ana',study:{lessons:value},labs:{'practice-invalid':value,'mission-invalid':{tasks:value,stages:value,lastEvidence:value,lastExecution:value},'practice-valid':{notes:'Síntesis válida que debe conservarse.'}}},data);assert.match(result.html,/Síntesis válida que debe conservarse/);assert.doesNotMatch(result.html,/\[object Object\]|toString|valueOf/);}
});
test('metadatos textuales válidos se escapan y conservan límites en la exportación',()=>{
 const html=portfolio.buildPortfolio({name:'Ana',labs:{'mission-test':{lastEvidence:{summary:'Una observación elegida',caseId:'CASE-<ok>',observedAt:'2026-11-02'},lastExecution:{passed:true,caseId:'RUN-'+ 'x'.repeat(400)}}}},data).html;
 assert.match(html,/CASE-&lt;ok&gt;/);assert.match(html,/2026-11-02/);assert.match(html,/criterio acotado alcanzado/);assert.match(html,new RegExp('RUN-'+'x'.repeat(196)));assert.doesNotMatch(html,new RegExp('RUN-'+'x'.repeat(197)));
});

test('los mapas persistidos y los metadatos de ejecución deben ser objetos de registros',()=>{
 const fixtures=[{labs:[{notes:'INVALID_CONTAINER_NOTE'}]},{study:{lessons:[{notes:'INVALID_CONTAINER_NOTE'}]}},{labs:{'mission-test':{tasks:[{answer:'INVALID_CONTAINER_NOTE'}],stages:[{answer:'INVALID_CONTAINER_NOTE'}],lastExecution:true}}}];
 for(const fixture of fixtures){const html=portfolio.buildPortfolio({name:'Ana',...fixture},data).html;assert.doesNotMatch(html,/INVALID_CONTAINER_NOTE/);assert.doesNotMatch(html,/Última comprobación formativa/);}
});
