# Recuperación local de perfiles

El centro de recuperación inspecciona copias locales y permite restaurarlas con confirmación explícita. Inspeccionar o cancelar no crea carpetas, no escribe archivos y no reemplaza el archivo dañado. No se envían rutas al renderer.

## Copias conservadas

- `profiles.json.bak`: archivo completo anterior a la última escritura normal. La primera escritura deja también una copia válida.
- `profiles.checkpoint.<uuid>.json`: hasta cinco checkpoints completos. Cada importación válida crea un checkpoint del estado anterior antes de modificarlo. Las escrituras normales crean un checkpoint si no existe ninguno o el más reciente tiene al menos 24 horas; no hay temporizador ni escritura por cada pulsación.
- `profiles.preserved.<fecha>.<uuid>.json`: original exacto anterior a una restauración, aunque esté dañado. Hasta cinco originales; nunca se borran automáticamente. Al alcanzar ese límite, otra restauración se rechaza con `RECOVERY_CAPACITY`. El usuario debe guardar esos originales fuera de la carpeta de datos antes de volver a intentar.

Los checkpoints y originales admiten un máximo de 128 MiB por archivo, igual que el archivo principal. Se rechaza la recuperación automática si el original es mayor: no se trunca ni reemplaza. El límite normal de archivos es un principal, un `.bak`, cinco checkpoints y cinco originales conservados, más un archivo temporal durante una escritura. No se escanean carpetas ajenas ni se incluyen archivos temporales como candidatos.

Antes de agregar un checkpoint se libera su plaza eliminando el checkpoint más antiguo. Si esa operación o la nueva escritura falla, el archivo principal no se importa; las copias recientes y el estado actual siguen disponibles. Un fallo posterior puede dejar el nuevo checkpoint aunque la importación no se haya aplicado.

## Contrato de ProfileStore

Todas las operaciones participan de la misma cola de escritura del store.

`recoveryStatus()` devuelve:

```js
{
  state: 'healthy' | 'empty' | 'corrupt',
  candidates: [{
    id,                    // UUID opaco, válido hasta la próxima inspección/restauración
    kind: 'previous' | 'checkpoint',
    createdAt,             // fecha ISO de modificación de la copia
    profileCount,
    profiles: [{name, updatedAt}], // primeros cinco; nombre validado, máximo 80 caracteres
    activeProfileName       // string o null
  }],
  preservedCopies
}
```

Se ofrecen como máximo seis candidatos: `.bak` y cinco checkpoints recientes válidos. Se omiten JSON truncado, esquema incompatible, tipos inválidos, claves de prototipo, archivos enlazados o archivos demasiado grandes. Las rutas nunca aparecen en los resultados.

`recover(candidateId)` acepta solamente un ID emitido por la última inspección de esa instancia. Reabre y valida la copia, compara identidad del archivo y SHA-256 contra la inspección, conserva el original y reemplaza el principal. Devuelve el perfil activo completo o `null`. Restaura todos los perfiles, la selección y las revisiones guardadas en la copia. `.bak` queda disponible; el original desplazado se encuentra en la copia conservada.

`inspectExternalBackup(text)` valida sin escribir y devuelve `{name, savedAt, legacy}`. Admite el formato de escritorio versión 1 y las copias HTML Academia versión 1. El límite general es 7 MiB; el formato HTML mantiene su límite de 5 MiB.

`recoverExternalBackup(text)` es la alternativa de arranque sin perfiles o con archivo dañado. Rechaza un store saludable que ya contenga perfiles. Tras validar y conservar el original, crea un único perfil, con UUID nuevo y revisión 1. Usa el nombre de la copia de escritorio o `Perfil recuperado` para HTML. La importación normal de un perfil sigue usando `importBackup(id,text)` y mantiene su ID/revisión incremental.

## Integración de escritorio

Main conserva la selección nativa de archivos, el límite de lectura externo y la confirmación explícita de restauración. El renderer solicita IDs internos, nunca rutas ni JSON arbitrario para recuperar. Main debe mostrar el resumen validado antes de confirmar y llamar al store solamente si se acepta. La cancelación no llama a métodos de escritura.

La integración debe invalidar la generación/epoch del renderer al restaurar y recargar el perfil devuelto. Las revisiones de la copia se mantienen, por lo que una solicitud pendiente de una generación anterior no debe volver a guardar sobre el estado recuperado. La cola interna evita intercalar dos operaciones; la invalidación de generación pertenece a main/UI.

Los errores nativos del sistema de archivos pueden incluir rutas; main debe sanitizarlos antes de devolverlos al renderer. `CORRUPT_STORE` habilita el arranque recuperable; `RECOVERY_INVALID` pide volver a inspeccionar; `RECOVERY_CAPACITY` pide archivar los originales conservados.

## Durabilidad y límites

Los archivos temporales usan creación exclusiva y permisos privados. Sus datos se sincronizan con `fsync` antes de renombrar dentro de la misma carpeta. En Linux también se sincroniza la carpeta después del rename; Windows no permite ese `fsync` de directorio mediante esta API. Una interrupción del sistema o fallo de hardware no tiene garantía absoluta de durabilidad.

La lectura comprueba el directorio real, rechaza junctions/symlinks y hard links, limita bytes incluso si el archivo crece y vuelve a comparar identidad después de leer. El original se verifica otra vez después de conservarlo. Estas comprobaciones no constituyen un bloqueo entre procesos contra otro proceso local con permiso para modificar la misma carpeta durante cada llamada al sistema. La app debe mantener una sola instancia propietaria del store.

Un fallo antes del rename final conserva el principal; si ya se había conservado el original, esa copia permanece. Un fallo de sincronización de directorio después del rename puede dejar el principal nuevo aunque la operación informe error: se debe inspeccionar otra vez y no afirmar que se restauró. No se borran evidencias para ocultar un fallo.

Verificación automatizada: `node --test tests/store-recovery.test.cjs tests/store.test.cjs`. Incluye preservación byte a byte, cero cambios al inspeccionar/cancelar, IDs ajenos, copia modificada, esquema/tipos/prototipos, hard links/junctions, rotación y límite de preservación, fallos de rename/preservación/poda, formatos heredados y serialización con escrituras normales. La confirmación y el comportamiento visual requieren QA nativa de la integración.

## Compatibilidad y validación del tamaño restaurado

La validación completa mantiene los controles de claves inseguras, también en campos de extensión, sin sumar un límite de nodos entre perfiles. Los límites de complejidad y tamaño de `study` y `labs` siguen aplicándose por cada perfil, como en schema 1.

La restauración serializa en JSON compacto y comprueba los bytes exactos del reemplazo antes de conservar el original o escribir. Si normalizar números u otro contenido hace que el resultado supere 128 MiB, devuelve `RECOVERY_INVALID` sin crear copias ni cambiar el principal. Los nombres de las dos vistas previas (`profiles[].name` y `activeProfileName`) usan el resultado recortado y validado de `v.name`.

Los códigos estables se transportan como prefijos del mensaje, no como `error.code`: `CORRUPT_STORE:`, `RECOVERY_INVALID:` y `RECOVERY_CAPACITY:`. Los códigos nativos como `EACCES` no son mensajes seguros para el renderer. Main puede mantener en memoria el resumen ya inspeccionado para su confirmación; no debe volver a llamar a `recoveryStatus()` entre mostrar el candidato y `recover(id)`, porque esa llamada renueva los IDs. El store vuelve a validar la identidad después de la confirmación. No hace falta un módulo `recovery-actions.cjs` adicional.
