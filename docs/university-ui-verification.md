# Verificación del rediseño universitario

Fecha: 3 de noviembre de 2026. Base: `b2372a3`, última entrega anterior `v0.1.19`.

## Alcance

Nueva capa visual, módulo de presentación y su integración en navegación, inicio, catálogo y aula. Sin cambios de esquema, dependencias, protocolo, IPC, actualizador ni motores de laboratorio. La revisión protegió los guardados serializados, perfiles, evidencias rechazadas, recuperación y cierre.

## Evidencia

- Pruebas de Node, incluidos contratos de seguridad, guardado, recuperación y UI: el primer pase detectó una aserción de texto que esperaba el antiguo título del inicio. Se actualizó para comprobar el panel, nombre del perfil recuperado, guardado y ausencia de escrituras adicionales. El siguiente pase completo tuvo **561 aprobadas, cero fallos**.
- Matriz nativa con protocolo `campus://app`, preload, IPC y almacén reales en perfiles temporales: **161/161 comprobaciones aprobadas**. Ventanas iniciales de 1440×940 al 100%, 920×800 al 125% (736 CSS px) y 320×900 al 100%.
- **135 auditorías axe** en quince estados y tres variantes de apariencia por ventana: sin infracciones detectadas en las reglas ejecutadas. **135 recorridos Tab** mediante entrada real de Chromium, sin fallos. Sin controles visibles sin etiqueta ni desbordamiento horizontal global en los estados de la matriz final.
- Cuatro pruebas de colores calculados en impresión verificaron temas oscuros y alto contraste. Se corrigió la precedencia de los tokens de impresión antes de ese pase.
- Perfil de prueba con texto largo y caracteres HTML para comprobar escape y reflujo. Se corrigieron seis desbordamientos del primer pase; el pase final conservó esa entrada extrema.
- Capturas nativas de inicio claro/oscuro, catálogo y aula inspeccionadas visualmente. Las [capturas de la guía](university-ui-guide.md) usan exclusivamente el perfil de prueba «Estudiante».
- El caso posterior de búsqueda desde el menú estrecho se corrigió con dos pruebas de regresión. El último pase completo tuvo **563 aprobadas, cero fallos**; las **cinco comprobaciones nativas adicionales** verificaron retorno al botón del menú, conservación del origen con menú cerrado y en escritorio, e integridad del proceso.

La matriz de estilos se ejecutó sobre la huella de fuentes `98610541e06332e6e0d9c16f57dcb6d4b743d111f768c0e20ac3cf7690f38df8`, con integridad confirmada al terminar cada proceso. La corrección posterior del evento de búsqueda se comprobó sobre la huella `6fa15f8210841f092c7ae8f703dd08d5eba938b1cf9793e025536307c1db8d67`; las dos sesiones nativas conservaron esa fuente. Se repitió el recorrido afectado por el cambio de JavaScript; la matriz completa de estilos corresponde a la fuente inmediatamente anterior. Los informes detallados, hashes y capturas están retenidos en el espacio de trabajo de QA.

## Límites de las pruebas

Las ventanas de QA se ejecutan ocultas, con emulación de foco del documento de Chromium para las pulsaciones. Las comprobaciones no encienden VMs ni contenedores, no observan datos del equipo, no actualizan la instalación ni acceden a perfiles reales. Los estados operativos iniciales de los hubs se comprueban con sus diagnósticos de disponibilidad. Las pruebas completas de motores y empaquetado siguen en CI.

Las herramientas automáticas y la inspección visual no certifican conformidad WCAG ni sustituyen pruebas con personas que usan tecnologías de asistencia. La interfaz local se adapta a ventanas estrechas; esto no entrega una aplicación móvil ni sincronización por servidor.
