# Verificación del taller de estudio

3 de noviembre de 2026. Base `f17b1102`, versión anterior 0.1.21.

## Fuente y pruebas

La implementación agrega el taller local, el aula dividida y seis retos al sistema de evaluación existente. No agrega dependencias, IPC, servidor ni motores. El registro del taller tiene versión 1 y un límite de 180000 bytes; estudio, informes y el límite global de laboratorios mantienen sus contratos.

El primer pase completo aprobó 619 pruebas. La revisión independiente encontró ejercicios de recuperación demasiado próximos a sus disparadores, una omisión de exposición familiar en el portafolio, entradas JSON no seguras, correspondencia ambigua de informes y una pérdida de edición al cambiar de pestaña. Se corrigieron con comparaciones de contenido y regresiones. El siguiente pase completo aprobó **632 pruebas, cero fallos**. Los editores conservan su identidad y posición; no se convierte una declaración en aprobación oficial.

## Aplicación nativa

En la fuente `9f75a01`, con huella `a0c08cfb668e95c979a9831392fc92f172cb48d3170010d0a9af34e970aeaaed`:

- **144/144 controles** en ventanas iniciales 1440/100%, 920/125% (736 CSS px interiores) y 320/100%, con claro, oscuro y alto contraste/texto muy grande.
- **99 auditorías axe**, sin infracciones detectadas en las reglas ejecutadas. Se comprobaron etiquetas, geometría, teclado nativo de Chromium, proporción de paneles, expansión, apuntes/respuestas, sesiones, cuaderno, variantes y preparación por versión.
- **18/18 controles de persistencia** mediante APIs reales y archivos propios de QA: copia/importación del perfil, edición tras recargar, mismo ID de perfil, portafolio escapado y combinación atómica local/entrante/ambos.
- Se verificaron en Chromium los casos de serialización heredada y duplicación ambigua de informes. Las funciones rechazaron las entradas peligrosas sin perder la historia original ni atribuir demostración a otro caso.
- Cuatro procesos confirmaron fuentes estables; cero errores del renderer, operaciones bloqueadas u orfandad de procesos del arnés.

El primer pase nativo detectó contraste insuficiente en las pestañas activas del tema oscuro. El pase anterior se conserva como evidencia de fallo; las correcciones usan los colores sólidos del sistema visual y el pase descrito arriba no registra ese problema.

## Revisión final y comprobación posterior

La revisión de toda la rama encontró dos interacciones adicionales: dos respuestas de recuperación podían compartir y reemplazar un borrador pendiente; una sesión pausada podía retomar sin mostrar su editor si las preferencias cambiaban mientras tanto. La corrección consolidada `ab05167` protege propietario y ejercicio del borrador, permite descartes explícitos separados para el texto válido y rechazado y hace visible el editor guardado antes de restaurar el punto de trabajo. Se simplificaron etiquetas y fechas, conservando referencias y metadatos exactos en desplegables.

Quince regresiones adicionales elevaron el pase completo a **647/647 pruebas aprobadas**. La revisión independiente de esa corrección fue aceptada sin hallazgos materiales pendientes. El pase nativo posterior aprobó **156/156 controles de interfaz**, **21/21 de persistencia** y **99 auditorías axe sin infracciones detectadas**, con las mismas tres ventanas y variantes de apariencia. Los casos nuevos de borradores y reanudación se comprobaron también en Chromium.

Los cuatro procesos mantuvieron la fuente con huella `73254c7c1e5a753ea8b96b4ff8ccde2fc295155b09e8acf3f370ec3aea621564`; cero errores de renderer, operaciones bloqueadas y procesos huérfanos del arnés. Las capturas de la guía provienen de perfiles adicionales creados después de las aserciones, con ejemplos breves y sin datos del alumno. Los límites de cobertura descritos abajo siguen aplicando. Los números de la matriz anterior corresponden a su fuente anterior y se conservan como parte del registro de validación.

## Alcance y límites

Las ventanas usan el protocolo `campus://app`, preload, IPC y almacén reales con perfiles temporales. Se adaptan en memoria únicamente las opciones de ventana para tamaño, zoom y ejecución oculta; el teclado se envía por Chromium. Las copias e importaciones usan selectores deterministas que sólo aceptan archivos dentro del directorio nuevo de QA. Ningún perfil real ni archivo del alumno fue seleccionado.

El arnés nativo prueba recarga del renderer; no prueba reinicio completo del proceso, fallo de confirmación final del cierre, carrera integrada de callback demorado tras reemplazar el mismo perfil o límites exactos de bytes/cuota global. Esos contratos tienen pruebas unitarias e integración específicas; no se atribuye cobertura nativa inexistente. No se encendieron VMs/contenedores, observaron datos del host ni descargaron/instalaron actualizaciones durante estos controles.

La evaluación automática y las capturas no certifican conformidad WCAG ni equivalen a una prueba con usuarios de tecnologías de asistencia. Los ejercicios son originales y los datos sintéticos se identifican. La revisión final de rama y el empaquetado se registran en la entrega de la versión publicada.
