# Campus de misiones y competencias

Referencia: experiencias públicas TryHackMe, Google Skills, Microsoft Learn y AWS Skill Builder, documentadas en docs/learning-experience-research.md. Implementación propia. Mantener escritorio local Windows/Linux, sin servidor multiusuario, datos personales fuera de Git. Kali está en otro equipo: ejecutar objetivos locales en ese equipo o usar servicios externos autorizados. No instalar motores, aceptar licencias ni modificar VMs del alumno.

## Resultado de esta ampliación

Tres recetas reales: juice-shop existente (ataque web), soc-response (HTTP y registros reales de un caso con actores ficticios), database-fundamentals (servicio HTTP con SQLite real en memoria). Son contenedores, no escritorios VM. Sala→tareas→iniciar/parar/restablecer→responder/pistas/evidencia. Sección de competencias por certificación y enlaces a clases, salas y prácticas externas. Conservar 24 clases/72 preguntas/48 tarjetas/8 ejercicios anteriores y progreso schema1.

## Imagen propia y contratos

Usar una imagen propia para SOC y DB con ENV CAMPUS_LAB_MODE=soc|database y CAMPUS_SEED=entero1..2147483647. Dockerfile base inmutable python:3.13.18-slim-bookworm@sha256:281d39ff02e3b389401586134ff9e6572954687822a58055ec07a60ded4e0b7f, USER10001:10001, EXPOSE8080, sin VOLUME/hostmounts ni dependencias Python externas. CPU1/mem512MiB/PIDs128, capdropALL/no-new-privileges y red bridge interna propia. Estado en RAM: se reinicia al detener/arrancar; evidencias del campus se conservan.

CI empaqueta docker save comprimido en un único runtime.tar.gz, más manifest.json {schemaVersion:1,version,imageId:'sha256:<64hex>',imageTag:'campus-lab-runtime:<version>',archive:'runtime.tar.gz',sha256:'<64hex>',size:<bytes>}. Embeber ambos en resources/lab-runtime mediante extraResources. Manifest y archive deben verificarse ANTES de docker load; después inspeccionar ID exacto. No descargar un manifest remoto para confiar ciegamente en él. App instalada ya incluye ese runtime; solo Juice Shop necesita pull de su digest fijo. Desarrollo usa .local/lab-runtime (gitignored), ausencia debe dar unavailable_assets sin romper Juice Shop.

API HTTP servicio (solo puerto8080 del contenedor, publish127.0.0.1:hostdinámico):
- GET /health -> {service:'campus-lab-runtime',protocolVersion:1,mode:'soc'|'database',caseId:string}.
- GET /api/case -> {caseId,mode,title,description,objective,sourceNote}; no soluciones.
- GET /api/events -> {caseId,events:[{id,time,actor,peer,method,path,outcome,status,account?}]}, máximo300 registros. actor es ficticio; peer es el peer HTTP real. No confundirlos.
- SOC: POST /login {username,password} registra éxito/fallo; GET /catalog y /admin registran accesos. X-Campus-Actor solo representa actor ficticio del caso. El tráfico de prueba cruza realmente HTTP.
- SOC: POST /api/assess {actor,failures} -> {caseId,passed,feedback} sobre los eventos actuales. No permitir aprobar antes de tráfico válido.
- SOC: POST /api/control {action:'block',actor:<actor del caso>} -> resultado; solo bloqueo de la aplicación de práctica, nunca firewall del host.
- DB: POST /api/query {query} -> {caseId,columns,rows,rowCount,truncated,elapsedMs,assessment:{passed,feedback}}. SQLite readonly authorizer, solo consulta única SELECT/WITH, sin ATTACH/PRAGMA/extensiones/escritura, deadline2s/progresshandler, max8KBconsulta/200filas/64cols/4096caracterescelda/512KBrespuesta. Semilla por caso en tablas auth_events,assets,users; objetivo source_ip/failures con tres o más fallos, varía por semilla.

Servicio: root path dashboard funcional (HTML propio), nunca devuelve rutas del host ni ejecuta comandos. Tests Python unittest con HTTP loopback real, sin Docker para Node local. CI build+run image y smoke sobre puerto127.0.0.1, verifica no red pública y protocolo.

## Manager genérico y puente

RealLabManager({dataDir,runner?,platform?,runtimeDir?}) conserva status/start/stop/reset(profileId,labId='juice-shop'), doctor y agrega catalog() -> metadatos de las tres recetas. Mantener EXACTAMENTE nombres/labels/red y formato de Juice Shop anterior. SOC/DB tienen red y contenedor propios porperfil+lab. ImageId, recursos,puerto/Env/Cmd/entrypoint/mounts/config según receta fija. Nunca aceptar imagen/ruta/comando del renderer. capabilities:{start,open,stop,reset,replay,query,evidence,assess,contain} derivadas de validación; ninguna para unsafe. Contenedor muerto validado permite reset. Al abrir revisar endpoint127 + propiedad; salud HTTP distingue proceso iniciado de servicio listo.

Nuevos métodos manager: events(profile,lab)->eventos; replay(profile,'soc-response')->{caseId,generated,events}; query(profile,'database-fundamentals',query)->respuesta; assess(profile,'soc-response',{actor,failures})->respuesta; contain(profile,'soc-response',actor)->respuesta. Peticiones HTTP NATIVAS solo a URL loopback publicada/inspeccionada del recurso propio y paths fijos. Límite bytes/timeouts; replay predefinido de login fallos, catálogo, éxito y admin, nunca acepta URL/payload arbitrario. Para replay leer /api/case que indica cuentas ficticias de escenario necesarias, o usar datos fijos de protocolo público. No simular una intrusión OS ni un SIEM completo.

Puente nuevo desktop.labCatalog()sinargs; labStatus/labStart/labStop/labReset/labOpen/labEvents/labReplay aceptan {profileId,labId}; labQuery {profileId,labId,query}; labAssess {profileId,labId,actor,failures}; labContain {profileId,labId,actor}. Todos validan profile existente,lab de allowlist y tipos. Reset usa confirmación nativa previa. LegacyrealLab* sigue operativo como Juice Shop default.

## UI y estado

window.MissionHub.create({desktop,getProfileId,getProgress(roomId),saveProgress(roomId,record,expectedProfileId),openLesson,openMaterial,announce}) -> {render(),mount(root),dispose(),openRoom(id)}. Propio módulo src/renderer/mission-hub.js/.css; catálogo src/content/missions.json + missions.js (window.CAMPUS_MISSIONS). Tres salas: web-investigation, soc-investigation, sql-investigation. Cada una contiene intro, tareas graduales, conceptos, preguntas propias, pistas bajo acción explícita, evidencia, próxima práctica y mapeo certificación/competencias. No dar respuestas antes de intento.

Per-room record dentro profile.labs['mission-'+roomId]: {version:1,tasks:{taskid:{done:boolean,answer:string,hintUsed:boolean}},notes:string,drafts?:{query:string,actor:string,failures:string},lastEvidence?:{caseId,summary,observedAt},lastExecution?:{query,caseId,rowCount,passed}}. Nunca persistir tablas grandes/eventos íntegros; son temporales y se vuelven a consultar. Límites porrespuesta4000/notas20000. saveProgress root serializa con cola existente y protege expectedProfileId. Los cambios durante SQL/replay no se pisan al resolver; generación/epoch impide resultados tras cambio perfil o importar. Tareas con checkbox son declaración, los checks exactos de SOC/SQL son evaluación formativa. Ninguno acredita certificación. Estados texto/iconos, foco, controles44px, error persistente, busy, timer informativo sin falsa expiración.

window.CompetencyHub.create({data,getStudy,getLabs,openLesson,openMission,navigate,announce}) -> {render(),mount(root),dispose()}. src/renderer/competency-hub.js + CSS propio. Datos src/content/competencies.json (root genera competencies.js global). Elegircertificación→dominios→qué podés hacer→evidencia→clases/salas/brechas. Estado derivado distingue sin evidencia/lectura/práctica simulada/evidencia registrada/revisión pendiente; no auto-certificar ni inventar cobertura completa. Enlazar roadmap actual, fuentes e idiomas/versiones.

## Propiedad de tareas

- Runtime servicio: lab-runtime/**, tests/python-runtime*.py, scripts/build-lab-runtime.py, scripts/smoke-lab-runtime.py. No manager/UI.
- Manager: desktop/real-labs.cjs, desktop/lab-recipes.cjs, tests/real-labs-manager.test.cjs ytests/mission-manager.test.cjs. No main/actions/security/preload.
- UI: src/renderer/mission-hub.js/.css, competency-hub.js/.css, tests/ui-mission*.test.cjs, src/content/missions.json/missions.js. No app.js/index ni competencias data de otroagente.
- Root: CI/buildconfig, main/preload/security/actions, app/indexintegration, runtime manifests/contentgeneration, validación y publicación.

Nodo/JS TDD para comportamiento; Python unittest para servicio y smoke real en CI. Tests previos102 no se quitan. No Docker instalado en host: declarar prueba Docker real solo si ocurre en CI o equipo con motor. No navegador/servidor como bypass de restricción anterior file; los servidores aquí son objetivos propios de laboratorio, no un atajo de inspección de esa página.
