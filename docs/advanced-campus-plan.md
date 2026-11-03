# Plan: seis mejoras completas del campus

Spec: docs/advanced-campus-spec.md. Rama feat/campus-complete-practice. Base c0bc29c. No token budget solicitado.

## Task 1: Objetivos oficiales y matriz de cobertura

Implementar sección1 de spec. Ownership src/content/objectives.json/js, src/shared/objective-core.js, src/renderer/objective-hub.js/css, assets/materials/objective-bridges.html y tests nuevos correspondientes. Fuentes investigadas por research_objectives; preservar catálogo competencies. Hub contrato común ligado objective-progress, acciones openLesson/openPractice/openMission/openMaterial/navigate. Lecciones de refuerzo por objetivo y mapeos verificables. TDD y QA de referencias y browser parity. No tocar archivos root, no commit, no subagents.

## Task 2: Banco nuevo y evaluación con casos variados

Implementar sección2 spec. Ownership src/content/learning.json/js, src/content/assessments.json/js, src/shared/professional-core.js, src/shared/assessment-core.js, src/renderer/assessment-hub.js/css, assets/materials/assessment-* y sus tests. Expandir al menos80 preguntas originales y6casos nuevos completos, preservar intentos/semillas/respuestas antiguas y reconocer exposición. No tocar archivos root ni objective modules. Focaltests, no commit, no subagents.

## Task 3: Topología aislada Windows/Linux

Implementar sección3 spec con arquitectura aditiva (no debilitar vm-manager v1). Ownership desktop/topology-manager.cjs, src/content/topologies.json/js, src/renderer/topology-hub.js/css, assets/materials/topology-* y tests. Contrato desktop topologyDoctor/status/create/start/stop/snapshot/restore con IDs cerrados profileId, nodeId y selección ISO nativa root. El manager recibe isoPath sólo desde acción principal validada. Root adapta IPC y confirmaciones. No modificar vm-manager sin coordinación. Readiness distingue configuración, guest instalado y resultado manual/observado. No commit, no subagents.

## Task 4: Forense y SIEM didáctico real

Implementar sección4 spec. Ownership desktop/forensic-lab.cjs, src/content/forensic.json/js, src/shared/forensic-core.js, src/renderer/forensic-hub.js/css, scripts/build-forensic-* y assets/materials/forensic-* y tests nuevos. Root integra acciones fijas y exports de materiales. Artefactos propios reproducibles y manifiesto; ninguna colección indiscriminada del host. Motor real sql.js con esquema privado acotado, consultas estructuradas y reglas, no ejecutar entrada arbitraria. Hacer pruebas con datos nuevos y detección correlacionada. No commit, no subagents.

## Task 5: Tutor local con informes inmutables

Implementar sección5 spec. Ownership src/shared/tutor-core.js, desktop/tutor-exchange.cjs, src/renderer/tutor-hub.js/css, assets/materials/tutor-review.html y tests nuevos. Contrato desktop tutorExport({profileId,attemptId}), tutorPreview({profileId}), tutorCommit({profileId,previewId}); main selecciona archivos y guarda, preview/commit opaque IDs ligado revisión+huella. Shared core selecciona fuentes de informes entregados de independent-assessment y packet-casework; no feedback de borradores. Hub getRecord/saveRecord ligado tutor-reviews y getLabs para consultar fuentes; export/import vía desktop. Root integra store write y diálogo/IPC. No commit, no subagents.

## Task 6: Combinación de progreso por registro

Implementar sección6 spec. Ownership desktop/progress-merge.cjs, src/renderer/merge-hub.js/css y tests nuevos. API create merge service con store (readonly getProfile y método commit agregado por root), preview(profile,backupText) devuelve vista segura y token opaque, commit exige revisión, source hash y decisiones cerradas. Combinar por cada lesson y por registros de labs conocidos; estructurar arrays de historial/entries/attempts/feedback por IDs+contenido y conflictos de singleton con alternativas preservadas. Fuentes importadas no deben ejecutar código. Root es único editor store, exporta parseBackup validado y atomic mergeProfile metodo mínimo. Hub desktop mergePreview({profileId}) selector nativo, mergeCommit({profileId,previewId,decisions}); no renderer paths. No commit, no subagents.

## Task 7: Integración, revisión y distribución

Root integra seis vistas, claves guardadas, IPC, validaciones, materiales y portafolio. Añade pruebas integradas navegación/perfil/import/guardado/recuperación y QA visual/accesibilidad. Revisiones independientes por tareas, suite completa y CI Windows/Linux/Docker. Corregir hallazgos, actualizar README/guías, PR y publicación autorizada; verificar assets/updater sin repetir helper de descarga automática bloqueado anteriormente. No prometer SO guest aprovisionado sin prueba real.
