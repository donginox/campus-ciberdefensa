# Historial y refuerzo

`LearningHub.render('history')` abre **Revisar mi avance**. La navegación interna también ofrece esa vista desde Hoy y desde una devolución. Root puede añadir el destino a su navegación sin modificar el almacenamiento: se sigue usando `labs['professional-learning']`.

La selección de intento y comparación vive en la instancia de LearningHub. Se conserva al remontar el mismo perfil; cambia de perfil o de `getProfileEpoch()` y se restablece. Leer, seleccionar o comparar no llama a `saveRecord`. Las acciones abren clases, prácticas o salas mediante los callbacks existentes. Un intento activo bloquea las orientaciones históricas para evitar consultar respuestas antes de entregar; no altera su plazo ni sus respuestas.

Se pueden elegir las veinte entregas retenidas, incluidas las anteriores al resultado más reciente. Cada entrega muestra la muestra declarada, respuestas conservadas, elección del alumno, orientación, explicación, criterio, aciertos, errores y omisiones por dominio. Una devolución incompleta conserva el resumen separado de las respuestas verificables; no se inventan preguntas ni porcentajes parciales.

## API pura

- `ProfessionalCore.historyDetails(raw, attemptId)` devuelve `null` si no encuentra una entrega retenida. Expone los campos del resultado y `summaryScore`, `summaryOmitted`, `recordedQuestionCount`, `feedbackComplete`; `score`, `omitted` y `domains` describen solamente la devolución conservada. Cada entrada de `feedback` añade `domain`, `question`, `selectedAnswer`, `answer`, `explanation`, `rubric`, `lessonId`.
- `compareHistory(raw, leftId, rightId)` acepta entregas distintas: diagnóstico con diagnóstico, o simulacros de la misma certificación. Devuelve `comparable:false` y motivo si no corresponden. Una comparación válida incluye tamaños declarados y conservados, `sharedQuestions`, `rightNewQuestions`, `domainSamples`, `feedbackComplete` y `scoreDelta` (otra muestra menos elegida, `null` si faltan respuestas). `independentEvidence` siempre es `false`: repetir ítems no acredita transferencia, y un banco de preguntas tampoco sustituye un caso práctico.
- `remediation(raw, {attemptId, now})` exige fecha/hora explícita. Cuenta errores y omisiones por pregunta en entregas comparables hasta la fecha de la seleccionada. Devuelve `recurring`, `sampleAttempts`, `actions` (máximo tres) y `nextReviewDate`. Cada acción agrupa un dominio con error actual, prioriza repeticiones, enlaza una clase y una práctica, y puede enlazar una sala existente. Las fechas respetan el repaso programado; una fecha vencida se sugiere para hoy y una pregunta sin fecha para mañana. No cambia la programación.

Todos los métodos normalizan copias y no leen respuestas del intento activo. La normalización de historial conserva el límite veinte, migra índices de opción antiguos a los índices canónicos, elimina preguntas desconocidas, selecciones de tipo inválido y duplicados de pregunta, y recalcula corrección desde el banco. Para devoluciones completas se recalculan también resumen y dominios. Rechaza tipos de intento desconocidos y simulacros con certificación desconocida; una versión de banco desconocida conserva solo el resumen. Identificadores vacíos o duplicados reciben identificadores locales estables para poder seleccionar cada registro. Valores numéricos importados como objetos no ejecutan coerción.

## Evidencia práctica separada

El nuevo callback opcional `getPracticalSummary = () => ({attempts:[]})` debe ser de solo lectura. Root puede conectarlo al resumen de AssessmentCore. LearningHub no importa ese módulo ni escribe en sus registros. Consume hasta veinte entregas con este contrato:

```js
{ attempts: [{
  id, caseId, submittedAt, independence, reviewStatus,
  external, hasEvidence
}] }
```

`submittedAt` debe ser una fecha válida; `independence` y `reviewStatus` son etiquetas de texto, escapadas y acotadas en la vista. `external` y `hasEvidence` solo se consideran verdaderos si son booleanos `true`. No calcula nota combinada, preparación porcentual ni probabilidad de aprobar. Si el proveedor falla, muestra el fallo con una salida para volver a abrir la vista.

## Verificación y límites

`node --test tests/professional-core.test.cjs tests/ui-learning.test.cjs` cubre selección anterior, copia inmutable, normalización/migración, muestras incompatibles, solapamiento, errores repetidos, acciones y fechas, aislamiento por perfil y generación, bloqueo de orientaciones durante intento activo, escape HTML y Axe sin contraste (el contraste se verifica en la QA integrada). Se conservan las veintiocho pruebas anteriores de aprendizaje. La integración raíz, revisión independiente, ambos temas, ampliación y QA nativa Windows corresponden al cierre global.
