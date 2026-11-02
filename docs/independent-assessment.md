# Evaluación práctica independiente

Dos casos originales complementan las salas existentes sin agregar motores ni operaciones del host. El caso A revisa un control de acceso en la instancia propia de Juice Shop (`web-investigation`); el B investiga una decisión de contención en el servicio HTTP propio (`soc-investigation`). El segundo requiere su propia línea de base e informe. Ninguno prescribe una vulnerabilidad, atribución o respuesta obligatoria.

La evaluación separa preparar, abrir la sala, ejecutar, declarar evidencia, entregar y consultar orientación. Abrir una sala solo llama `openMission(missionId)`: los controles existentes de esa sala comprueban e inician el objetivo. El alumno regresa a Evaluación práctica para informar lo ejecutado. No se inicia un servicio ni se acredita ejecución al abrirla.

## Integración

Cargar `src/content/assessments.js`, `src/shared/assessment-core.js`, `src/renderer/assessment-hub.js` y `assessment-hub.css`. El contenido JSON y JS es equivalente; global `CAMPUS_ASSESSMENTS`.

```js
const assessment = window.AssessmentHub.create({
  getProfileId, getProfileEpoch,
  getRecord, // bound to profile.labs['independent-assessment']
  saveRecord, // (record, expectedProfileId, { retry: false })
  getLabs, desktop, openMission, openMaterial, navigate, announce
});
// assessment.render(), assessment.mount(root), assessment.dispose(), assessment.summary()
```

El módulo mantiene solamente su registro. `getLabs`, `desktop` y `openMaterial` son opciones compatibles del contrato; no se usan para ejecutar ni copiar evidencia. `navigate('portfolio')` abre el portafolio de root. Root debe preservar la cola de guardado y validar perfil/generación al adoptar resultados; un renderer no puede impedir que una implementación externa del store escriba datos obsoletos.

`dispose` retira listeners y la referencia DOM; conserva borrador y error de guardado en la instancia para reintentar al remontar. Un cambio de perfil o epoch descarta ese estado de sesión y recarga el registro importado, incluso si el ID no cambió. Las respuestas asíncronas anteriores no actualizan la UI ni sus indicadores.

## Núcleo puro

`AssessmentCore` es UMD y CommonJS, sin DOM ni reloj implícito. Exporta:

- `normalize(raw)`: reconstruye exclusivamente campos permitidos, con IDs de caso cerrados y controles de tipo. Descarta intentos con ID, fecha de inicio o preflight inválidos. Una entrega importada sin los mínimos se conserva como borrador, sin fecha de entrega ni orientación desbloqueada.
- `start(raw, caseId, preflight, now)`: requiere entorno, línea de base, alcance y confirmación previa. `now` es ISO UTC exacto con milisegundos. Genera `attempt-N` y no copia reportes anteriores.
- `update(raw, attemptId, patch)`: permite campos del informe y declaraciones cerradas; rechaza campos desconocidos y cualquier cambio de un reporte entregado.
- `submit(raw, attemptId, now)`: exige síntesis de cada campo, declaración de ayuda y revisión propia. Conserva informe/preflight como copia inmutable a través de esta API.
- `guidance(raw, attemptId, now)`: requiere entrega previa y acción explícita; agrega contador y fecha de consulta por fuera del informe entregado.
- `summary(raw)`: proyecta un objeto nuevo, sin guardar ni modificar el original.

Preflight: `environment`, `baseline`, `scope`, `scopeConfirmed`. La preparación incompleta persiste en `setupDrafts`, con dos claves cerradas por caso. `setupDraft` conserva compatibilidad y migra el borrador anterior. Navegar A → B → A y remontar conserva ambos borradores; tocar el caso activo es una operación nula. Una preparación de otro caso nunca se usa como línea de base del caso activo. Modificar un campo desmarca su confirmación. Al iniciar se limpia únicamente la preparación consumida; la línea de base queda inmutable en el intento.

Informe: `procedure`, `failedHypotheses`, `findings`, `reproducibleEvidence`, `impact`, `remediation`, `limitations`, `executiveSummary`, `assistanceLog`, `selfReview`. Cada síntesis al entregar requiere al menos 20 caracteres y tres palabras. Es un mínimo estructural, no una comprobación semántica: explicar que algo no se ejecutó o una hipótesis quedó pendiente es válido y necesario.

Declaraciones: `execution` es `not-executed|local|external`; `independence` es `undeclared|independent|assisted`; `reviewStatus` es `pending|self-declared`; `hasEvidence` es booleano. No se puede entregar afirmando evidencia de ejecución con `not-executed`. Toda independencia, ejecución, evidencia y revisión sigue siendo declaración del alumno.

Consulta de orientación: `guidanceViews` (0–100), `guidanceFirstAt` y `guidanceLastAt`, fuera del reporte. El historial proyecta independencia `guided` si ese intento consultó orientación o si ya había orientación registrada del mismo caso antes de su entrega. Para un borrador se considera toda exposición del mismo caso ya registrada. `priorExposure` y `repeatedCase` se recomputan desde los intentos y las fechas; no se confían flags de importación. El primer acceso se conserva aunque se consulte otra vez más tarde. Una consulta posterior a otra entrega no recalifica retrospectivamente esa entrega anterior. Importaciones antiguas sin fecha inicial usan la última consulta conocida. La declaración original de independencia, asistencia y preflight nunca se reescribe. La UI distingue declaración y ayuda registrada y dirige a un caso sin intentos para obtener una muestra nueva. Consultar la guía de la sala también debe declararse manualmente.

```js
AssessmentCore.summary(raw) === {
  attempts: [{
    id, caseId, submittedAt, // ISO UTC o null
    independence, // undeclared | independent | assisted | guided
    reviewStatus, // pending | self-declared
    external, hasEvidence, // booleanos declarados, no validación de ejecución
    priorExposure, repeatedCase // recomputados; exposición conocida y repetición del caso
  }],
  activeCaseId
}
```

La expresión anterior ilustra la forma, no identidad de objetos. El historial de aprendizaje debe comprobar `submittedAt` para distinguir un borrador de una entrega. Root puede leer el registro normalizado para exportar el informe completo, preservando estas etiquetas y límites.

## Límites y revisión

Hasta seis intentos por perfil, sin eliminación silenciosa. Exportar antes de continuar en otro perfil conserva trazabilidad. Cada texto admite como máximo 2000 caracteres y un presupuesto de 2000 bytes JSON (incluye escapes y UTF-8). Diez campos de informe, tres de preflight por intento, preparaciones incompletas por caso, alias compatible y metadatos permanecen debajo de 200000 bytes serializados, incluso con comillas, controles o sustitutos Unicode aislados de una importación JSON legal. No se guardan filas del host, adjuntos, respuestas de la sala ni secretos automáticamente.

La rúbrica se muestra antes de intentar. La entrega solo produce feedback estructural: no concede nota, apto, independencia verificada ni preparación oficial. La orientación se muestra únicamente después de entregar y pedirla; consultar nuevamente incrementa ayuda. Un intento nuevo inicia vacío.

La ruta externa detalla entorno manual autorizado Windows/Linux con varios hosts/segmentos, alcance, baseline, diagrama, evidencia de acceso, salto/ruta o reenvío verificado, limpieza y revisión externa. Los casos loopback no demuestran explotación de hosts ni pivoting. Campus no configura ni ejecuta esas acciones desde esta evaluación.

## Verificación focal

`node --test tests/assessment-core.test.cjs tests/ui-assessment.test.cjs`: 20 pruebas, 20 aprobadas. Incluye preflight, entrega inmutable, orientación, casos distintos, guardado/reintento/remontaje, importación del mismo ID con epoch nuevo, texto escapado, accesibilidad estructural con axe y foco de teclado. Se verificó paridad JSON/JS y sintaxis Node.

No se ejecutaron motores reales, Docker, VMs, acciones de host, instaladores ni QA visual nativa desde este módulo. La suite global y QA integrada corresponden a root. Axe no verificó contraste; el CSS usa los tokens existentes de ambos temas y controles de al menos 44px.
