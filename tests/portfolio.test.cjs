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
const preparationEntry=patch=>({id:'evidence-1',certificationId:'cc',competencyId:'cc-controles',date:'2026-11-02',environment:'VM propia aislada',procedure:'PROCEDIMIENTO_VALIDO_BITACORA',result:'Observé el resultado del control.',interpretation:'La muestra requiere revisión y otra prueba.',help:'assisted',review:'pending',reviewNotes:'Revisión elegida por el alumno.',...patch});
const ledgerCompetencies={certifications:[{id:'cc',name:'Ruta CC',domains:[{skills:[{id:'cc-controles',title:'Control registrado',practice:{kind:'external'},evidence:'Evidencia para revisar'},{id:'cc-continuidad',title:'Otra competencia',practice:{kind:'guided'}}]}]},{id:'ccst',name:'Otra certificación',domains:[{skills:[{id:'cc-controles',title:'Mismo identificador en otra certificación',practice:{kind:'external'}}]}]}]};
function portfolioCompetencies(html){const dom=new(require('jsdom').JSDOM)(html);const entries=[...dom.window.document.querySelectorAll('.competency')].map(el=>el.textContent);dom.window.close();return entries;}
test('la evidencia de bitácora actualiza solo su certificación y competencia sin cerrar brechas externas',()=>{
 const html=portfolio.buildPortfolio({labs:{'preparation-ledger':{entries:[preparationEntry()]}}},{competencies:ledgerCompetencies}).html;
 const [matched,otherSkill,otherCert]=portfolioCompetencies(html);assert.match(html,/PROCEDIMIENTO_VALIDO_BITACORA/);assert.match(matched,/Evidencia declarada en bitácora/);assert.doesNotMatch(matched,/Sin evidencia registrada/);assert.match(matched,/Revisión declarada: pendiente/);assert.match(matched,/no verifica ejecución ni dominio/);assert.match(matched,/Falta ejecutar y revisar en el entorno externo/);assert.match(otherSkill,/Sin evidencia registrada/);assert.match(otherCert,/Sin evidencia registrada/);
});
test('las brechas conservan la revisión propia o por tutor como declaraciones no verificadas',()=>{
 for(const [review,want]of [['self',/Revisión declarada: propia/],['tutor',/Revisión declarada: por tutor, identidad no verificada por la app/]]){
  const html=portfolio.buildPortfolio({labs:{'preparation-ledger':{entries:[preparationEntry({review})]}}},{competencies:ledgerCompetencies}).html;
  const [matched]=portfolioCompetencies(html);assert.match(matched,/Evidencia declarada en bitácora/);assert.match(matched,want);assert.match(matched,/no verifica ejecución ni dominio/);assert.match(matched,/Falta ejecutar y revisar en el entorno externo/);
 }
});
test('bitácoras importadas inválidas y borradores no se convierten en evidencia de competencias',()=>{
 const invalidEntries=[preparationEntry({certificationId:'ccst'}),preparationEntry({competencyId:'no-existe'}),preparationEntry({date:'2026-02-30'}),preparationEntry({procedure:{toString:null}}),preparationEntry({result:42}),preparationEntry({review:{toString:null}}),preparationEntry({help:false})];
 const ledgers=[null,42,[],{entries:{toString:null}},{entryDraft:preparationEntry(),entries:[]},...invalidEntries.map(entry=>({entries:[entry]}))];
 for(const ledger of ledgers){const imported=require('../desktop/validation.cjs').jsonData({'preparation-ledger':ledger},1024*1024);let html;assert.doesNotThrow(()=>{html=portfolio.buildPortfolio({labs:imported},{competencies:ledgerCompetencies}).html});const [matched]=portfolioCompetencies(html);assert.match(matched,/Sin evidencia registrada/);assert.doesNotMatch(html,/PROCEDIMIENTO_VALIDO_BITACORA|\[object Object\]|toString/);}
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

function advancedPortfolioFixture(){
 const objective=require('../src/shared/objective-core.js'),forensic=require('../src/shared/forensic-core.js'),assessment=require('../src/shared/assessment-core.js'),{TutorExchange}=require('../desktop/tutor-exchange.cjs');
 const at='2026-11-02T10:00:00.000Z';let forensics=forensic.updateDraft(null,'alameda',Object.fromEntries(forensic.fields.map(k=>[k,k==='custody'?'Origen docente: SHA256 '+ 'a'.repeat(64):'INFORME_FORENSE_ENTREGADO: observación y límites propios.'])));forensics=forensic.submit(forensics,'alameda',at);forensics=forensic.markGuidance(forensics,'alameda');forensics=forensic.updateDraft(forensics,'alameda',{conclusion:'PRIVATE_FORENSIC_DRAFT: conclusión aún sin entregar.'});
 let practical=assessment.start(null,'windows-share-audit',{environment:'Windows guest propio autorizado para esta práctica.',baseline:'Línea de base nueva documentada con datos ficticios.',scope:'Solo carpeta y usuarios ficticios del guest propio.',scopeConfirmed:true},at);practical=assessment.update(practical,'attempt-1',{...Object.fromEntries(assessment.REPORT_FIELDS.map(k=>[k,'INFORME_NUEVO_CASO: evidencia propia con límites.'])),independence:'independent',reviewStatus:'self-declared'});practical=assessment.submit(practical,'attempt-1',at);
 const profile={id:'portfolio-person',revision:1,labs:{'objective-progress':objective.updateObjective(null,'cc:1.1',{status:'demonstrated',note:'NOTA_OBJETIVO <script>bad()</script>',nextAction:'SIGUIENTE_OBJETIVO: repetir con evidencia.'}),'forensic-casework':forensics,'independent-assessment':practical}};
 const exchange=new TutorExchange(),packet=exchange.exportPackage(profile,'independent-assessment:attempt-1'),feedback={app:'campus-tutor-feedback',version:1,feedbackId:'feedback-portfolio',packageId:packet.packageId,contentHash:packet.contentHash,sourceId:packet.content.source.id,createdAt:at,reviewer:{name:'Tutora <img src=x>',identity:'declared-unverified'},comments:[{section:'procedure',comment:'COMENTARIO_TUTOR: separá hipótesis y evidencia.'}],rubric:[{criterion:'Trazabilidad',rating:'developing',comment:'RUBRICA_TUTOR: citá una fuente.'}],nextPractice:'PRACTICA_TUTOR: repetí con otro caso.'};profile.labs['tutor-reviews']=JSON.parse(JSON.stringify(exchange.commit(profile,exchange.preview(profile,JSON.stringify(feedback)).previewId).record));return profile;
}
test('exporta avance declarado con versión, informes forenses inmutables y feedback vinculado sin verificar identidad',()=>{
 const profile=advancedPortfolioFixture(),html=portfolio.buildPortfolio(profile,{...data,assessments:require('../src/content/assessments.json'),objectives:require('../src/content/objectives.json'),forensic:require('../src/content/forensic.json')}).html;
 for(const marker of ['NOTA_OBJETIVO','SIGUIENTE_OBJETIVO','INFORME_FORENSE_ENTREGADO','COMENTARIO_TUTOR','RUBRICA_TUTOR','PRACTICA_TUTOR'])assert.match(html,new RegExp(marker));
 assert.match(html,/cc:1\.1/);assert.match(html,/Outline efectivo 2026-09-01/);assert.match(html,/demostra.*declarad|declarad.*demostra/i);assert.match(html,/orientación.*consultada|guía.*consultada/i);assert.match(html,/minidump|FAT16/);assert.match(html,/Caso C · Acceso heredado/);assert.doesNotMatch(html,/undefined|PRIVATE_FORENSIC_DRAFT|<script|<img/);assert.match(html,/identidad.*no verificada/i);assert.match(html,new RegExp(profile.labs['tutor-reviews'].reviews[0].packet.contentHash));
});
test('datos nuevos no legibles se aíslan y una devolución manipulada o desvinculada nunca se presenta como revisión',()=>{
 for(const key of ['objective-progress','forensic-casework','tutor-reviews']){
  const profile=advancedPortfolioFixture();profile.labs[key]={version:999,notes:'PRIVATE_INVALID_NOTE'};profile.labs['practice-valid']={notes:'EVIDENCIA_VALIDA_CONSERVADA'};let html;assert.doesNotThrow(()=>{html=portfolio.buildPortfolio(profile,data).html});assert.match(html,/EVIDENCIA_VALIDA_CONSERVADA/);assert.match(html,/datos no legibles/i);assert.doesNotMatch(html,/PRIVATE_INVALID_NOTE/);
 }
 for(const mode of ['modified-feedback','detached-report','fake-identity']){const profile=advancedPortfolioFixture();if(mode==='modified-feedback')profile.labs['tutor-reviews'].reviews[0].feedback.comments[0].comment='FORGED_FEEDBACK';if(mode==='detached-report')delete profile.labs['independent-assessment'];if(mode==='fake-identity')profile.labs['tutor-reviews'].reviews[0].feedback.reviewer.identity='verified';const html=portfolio.buildPortfolio(profile,data).html;assert.doesNotMatch(html,/COMENTARIO_TUTOR|FORGED_FEEDBACK/);assert.match(html,/datos no legibles|1 devolución.*omitida/i);}
});
test('conflictos exportan cantidad y origen sin duplicar alternativas privadas ni índices o discos',()=>{
 const {ProgressMerge}=require('../desktop/progress-merge.cjs'),study=require('../src/shared/study-core.js').createState(data.curriculum);study.lessons['hardware-recursos'].notes='Local';const profile={id:'p',revision:1,study,labs:{}},other=JSON.parse(JSON.stringify(study));other.lessons['hardware-recursos'].notes='PRIVATE_RAW_ALTERNATIVE';const backup=JSON.stringify({app:'campus-ciberdefensa-desktop',version:1,savedAt:'2026-11-02T10:00:00.000Z',profile:{name:'Otro equipo <script>',study:other,labs:{}}}),merge=new ProgressMerge(),preview=merge.preview(profile,backup);profile.labs=merge.commit(profile,preview.id,Object.fromEntries(preview.conflicts.map(c=>[c.id,'both']))).labs;
 profile.labs['forensic-index']={notes:'PRIVATE_FORENSIC_INDEX'};profile.labs['vm-topology']={notes:'PRIVATE_VM_DISK'};const html=portfolio.buildPortfolio(profile,data).html;assert.match(html,/1 alternativa.*conservada/i);assert.match(html,/Otro equipo &lt;script&gt;/);assert.match(html,/respaldo JSON/i);assert.match(html,/Combinar|combinación/i);assert.doesNotMatch(html,/PRIVATE_RAW_ALTERNATIVE|PRIVATE_FORENSIC_INDEX|PRIVATE_VM_DISK/);
});
test('un informe importado fuera de límite se aísla sin bloquear otros informes ni prácticas',()=>{
 const profile=advancedPortfolioFixture();profile.labs['independent-assessment'].attempts[0].report.procedure='x'.repeat(2001);profile.labs['practice-kept']={notes:'PRACTICA_DESPUES_DE_INFORME_INVALIDO'};let html;assert.doesNotThrow(()=>{html=portfolio.buildPortfolio(profile,data).html});assert.match(html,/PRACTICA_DESPUES_DE_INFORME_INVALIDO/);assert.match(html,/INFORME_FORENSE_ENTREGADO/);assert.match(html,/datos no legibles/i);assert.doesNotMatch(html,/COMENTARIO_TUTOR/);
});
test('un historial con huella inválida no consume el presupuesto de otras evidencias',()=>{
 const profile=advancedPortfolioFixture(),rows=profile.labs['tutor-reviews'].reviews,core=require('../src/shared/tutor-core.js');rows[0].feedback.comments[0].comment='x'.repeat(1200);rows[0].feedback.rubric[0].comment='y'.repeat(1000);rows[0].feedback.nextPractice='z'.repeat(2000);rows[0].feedbackHash=require('node:crypto').createHash('sha256').update(core.canonical(rows[0].feedback)).digest('hex');rows.push(JSON.parse(JSON.stringify(rows[0])));rows[1].feedback.feedbackId='feedback-tampered';
 profile.study={lessons:Object.fromEntries(Array.from({length:24},(_,i)=>['l'+i,{notes:'n'.repeat(3500)}]))};profile.labs={'tutor-reviews':profile.labs['tutor-reviews'],'independent-assessment':profile.labs['independent-assessment'],'practice-last':{notes:'v'.repeat(3500)+'EVIDENCIA_POSTERIOR_COMPLETA'}};
 const html=portfolio.buildPortfolio(profile,data).html;assert.match(html,/EVIDENCIA_POSTERIOR_COMPLETA/);assert.doesNotMatch(html,/COMENTARIO_TUTOR/);assert.match(html,/datos no legibles/i);
});
test('el límite global informa exactamente las secciones omitidas y conserva un HTML offline acotado',()=>{
 const core=require('../src/shared/objective-core.js'),lessons=Object.fromEntries(Array.from({length:24},(_,i)=>['l'+i,{answer:'a'.repeat(250),notes:'n'.repeat(3500)}])),objective=core.updateObjective(null,'cc:1.1',{status:'studying',note:'NOTA_POR_OMITIR',nextAction:'ACCION_POR_OMITIR'}),html=portfolio.buildPortfolio({study:{lessons},labs:{'objective-progress':objective}},{}).html;
 assert.doesNotMatch(html,/NOTA_POR_OMITIR|ACCION_POR_OMITIR/);assert.match(html,/Secciones de texto omitidas por presupuesto: 2/);assert.ok(Buffer.byteLength(html)<2*1024*1024);assert.match(html,/script-src 'none'/);
});
