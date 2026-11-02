# Espacios de certificación y bitácora

Los cinco espacios consumen `CAMPUS_COMPETENCIES` sin duplicar su inventario: CC, CCST Cybersecurity, Security+ V7 en español, BTL1 y eJPT. Cada dominio muestra las competencias docentes seleccionadas, sus clases, actividades de apoyo, criterio de evidencia, pregunta de revisión y fuente oficial. La fecha y las notas de versión provienen del contenido revisado el 2026-11-02. Los dominios conocidos no se presentan como inventario exhaustivo de subobjetivos.

La ficha de Cisco confirma cinco áreas; su página de detalle sigue devolviendo CSS Error. Se conservan sin verificar los subobjetivos y ponderaciones de CCST. Security+ conserva la ruta V7/SY0-701 y su aviso sobre V8, sin mezclar objetivos. Los espacios BTL1 y eJPT incluyen siguientes pasos externos concretos: disco/memoria y SIEM reales, o hosts Windows/Linux, explotación y pivoting en varios segmentos. Los datos sintéticos, una lectura, una VM vacía y un simulacro docente no acreditan esas capacidades.

## Integración

Orden de carga: contenido de competencias y prácticas → `shared/preparation-core.js` → `renderer/preparation-hub.js`. Incluir `renderer/preparation-hub.css` después de los tokens generales.

```js
const preparation = window.PreparationHub.create({
  getProfileId, getProfileEpoch,
  getRecord,       // () => profile.labs['preparation-ledger']
  saveRecord,      // (record, expectedProfileId, {retry:false}) => Promise
  getStudy, getLabs,
  chooseCertification, // async (certificationId), actualiza y guarda el plan de root
  openLesson, openPractice, openMission, openMaterial, navigate, announce
});
// preparation.render() -> HTML, sin escribir ni elegir un plan
// preparation.mount(wrapper), preparation.dispose(), preparation.summary()
```

Root enlaza exclusivamente `labs['preparation-ledger']` con su cola de guardado y controla perfil/generación antes de mutar datos. `chooseCertification(id)` debe resolver solo después de guardar el plan y rechazar en caso de error o cambio/importación de perfil. Explorar una ruta no invoca ese callback: solo el botón explícito elige la certificación. El módulo confirma su selección local después de la resolución, con guardas de perfil y generación.

`openPractice(id)` abre una práctica nueva; `openPractice(id, true)` abre una campaña, siguiendo la convención existente de `openSystemPractice`. `openLesson(id)` y `openMission(id)` reciben IDs del contenido. El acceso al laboratorio anterior usa `navigate('labs')` con su ID visible para buscarlo. El material Blue Team usa `openMaterial('blue-team.html')`. `navigate('portfolio')` abre la exportación integrada. Los enlaces oficiales son HTTPS y pasan por el manejo nativo existente de enlaces externos; el renderer no hace solicitudes de red.

## Registro versión 1

```js
{
  version: 1,
  selectedCertificationId: 'cc',
  entryDraft: {
    id: '', certificationId: 'cc', competencyId: '', date: '',
    environment: '', procedure: '', result: '', interpretation: '',
    help: '', review: '', reviewNotes: ''
  },
  entries: []
}
```

Hay hasta 30 evidencias por perfil; agregar la número 31 produce un error y no elimina una anterior. La fecha es calendario local `YYYY-MM-DD`, válida entre 2000 y 2199. El entorno admite 200 caracteres; procedimiento, resultado e interpretación, 2000 cada uno; notas de revisión, 1000. Las certificaciones y competencias deben existir y coincidir en el inventario. Los IDs de entrada son locales y acotados. No se copian campos desconocidos, tablas del host, rutas ni adjuntos.

Ayuda: `independent` (sin ayuda), `guided` (guía/pistas), `assisted` (asistencia de otra persona o herramienta). Revisión: `pending`, `self`, `tutor`. Ambas selecciones empiezan vacías y son obligatorias al registrar. `tutor` es una revisión docente declarada por el alumno: no verifica identidad ni implica acreditación. Las notas permiten registrar quién, cuándo, criterios y pendientes.

Cada campo actualiza el borrador. Una evidencia puede editarse conservando su ID o quitarse con confirmación local. Un borrador con trabajo escrito bloquea el reemplazo accidental desde otra competencia o evidencia. Limpiar es una acción explícita. Los fallos de validación y guardado son visibles; el error de guardado y el texto en memoria sobreviven a desmontar/remontar la vista. Reintentar usa `{retry:true}` y no oculta el error hasta confirmar el guardado. Si se cierra la aplicación antes de recuperar un guardado fallido, ese texto todavía no está en disco: la interfaz lo indica.

Los resultados asíncronos se vinculan a ID y generación del perfil. Remontar la misma vista no cancela un guardado pendiente; importar el mismo perfil o cambiar a otro invalida su resultado. Root debe mantener la misma instancia del hub para conservar errores y borradores pendientes entre vistas.

## Núcleo puro y resúmenes

`PreparationCore` es UMD y CommonJS. Expone `normalize(raw)`, `add(raw, entry)`, `update(raw, id, patch)`, `remove(raw, id)`, `summary(raw)` y `validDate(date)`. No escribe, no observa el host y no consulta la hora para calificar evidencias. `add/update` validan antes de guardar y no modifican su entrada; `normalize` elimina campos ajenos, limita textos/importaciones y conserva borradores parciales recuperables.

`summary()` devuelve `selectedCertificationId`, `total`, conteos `independent/pendingReview/selfReviewed/tutorReviewed`, `byCertification`, `entries` y una nota de alcance. `byCertification[id].entries` es el conteo de esa ruta. No hay nota de preparación ni porcentaje de dominio. Las lecturas marcadas, prácticas, campañas, salas, labs anteriores y evaluaciones docentes se muestran como contexto declarado, separado de las evidencias de esta bitácora.

## Verificación

`node --test tests/preparation-core.test.cjs tests/ui-preparation.test.cjs` cubre normalización, validación, límites, edición, eliminación, declaraciones, los cinco espacios/27 competencias, enlaces y callbacks reales, borradores, fallo/reintento, remontaje, cambio/importación, elección asíncrona del plan, escape de texto y axe para las cinco rutas y el editor. La suite completa y QA nativa Windows/Linux corresponden a la integración de root; los tests jsdom no acreditan contraste visual, ejecución de VMs ni herramientas externas.
