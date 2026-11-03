# Campus: preparación y laboratorios completos

Spec vinculante para la solicitud del 2 de noviembre de 2026: implementar las seis mejoras propuestas. Base c0bc29c. Distribución pública autorizada; funcionamiento local, sin servidor alojado.

## Resultado esperado

Una persona puede elegir una certificación, consultar cada objetivo publicado y sus brechas, estudiar contenido original, resolver casos nuevos, trabajar con entornos propios Windows/Linux y evidencias forenses reales, recibir una devolución por archivo y combinar su progreso de dos equipos sin pérdida silenciosa.

## Restricciones globales

- Mantener perfiles, recuperación, actualizaciones y formatos anteriores. No presentar cuestionarios docentes como simulacros oficiales ni porcentajes como garantía de aprobar.
- Fuentes oficiales actuales, paráfrasis originales y referencias verificables. Distinguir IDs oficiales de IDs asignados por Campus y detalle público inaccesible. Ninguna cobertura inventada.
- No servidor remoto, credenciales, telemetría ni envío automático a tutores. Intercambio voluntario por archivos locales.
- Nunca ejecutar comandos del estudiante en el host. Comandos nativos fijos, argumentos cerrados y shell:false. No instalar motores/OS ni aceptar licencias. No tocar VMs ajenas.
- Conservar el aislamiento y validación de propiedad de VirtualBox y Docker. Las VMs sin sistema instalado muestran ese requisito; el campus no afirma haber aprovisionado un guest que no verificó.
- Datos importados no confiables: límites, JSON simple, claves peligrosas rechazadas, HTML escapado, sin rutas/órdenes controladas por renderer. Operaciones por perfil+generación, revisión optimista, escritura atómica y checkpoint antes de importar/combinar.
- UI en español rioplatense, navegación por teclado, etiquetas, foco y estado de guardado/errores recuperables. Todas las nuevas vistas accesibles desde la navegación.
- Archivos binarios forenses fuera de labs JSON. Datos persistidos acotados al presupuesto de perfil; nunca truncar evidencia para decir que se guardó.

## Interfaces compartidas

Los hubs nuevos siguen create({getProfileId,getProfileEpoch,getRecord,saveRecord,desktop,navigate,openMaterial,announce}), render(), mount(root), dispose(). getRecord y saveRecord están ligados a una clave; saveRecord(record,expectedProfileId,{retry}) conserva la cola del root. Al cambiar perfil o importar, las respuestas viejas no pueden escribir ni pintar datos en el perfil nuevo.

Root es único editor de app.js, professional-shell.js, index.html, main.cjs, preload.cjs, security.cjs, portfolio.cjs, ui-harness.cjs y workflow. Los agentes no hacen commits. Cada módulo añade tests focales; root integra y ejecuta suite completa.

## 1. Objetivos de certificación

Nuevo catálogo separado del modelo de 27 competencias para no romper la bitácora anterior. Todos los objetivos numerados publicados de CC/CCST/Security+ y todos los resultados públicos de BTL1/eJPT, con dominio, versión/fecha/fuente, naturaleza de ID, descripción propia y mapeos a teoría, práctica, evidencia requerida y brecha. Donde no se logra verificar el detalle oficial, se muestra el límite y el enlace, sin afirmar exhaustividad. Lecciones de refuerzo originales para objetivos sin explicación suficiente. Matriz por certificación filtrable, avance declarado por objetivo con notas y siguiente acción, sin confundir lectura con dominio. Registro objective-progress v1 acotado. Datos y UMD/browser parity.

## 2. Casos y preguntas originales

Ampliar banco con al menos 80 preguntas nuevas razonadas, IDs únicos, opciones equilibradas, referencias a objetivos, sin dumps de exámenes. Mantener intentos previos y órdenes de opciones. Al menos 6 casos prácticos nuevos, distribuidos Windows/Linux/redes/web/forense/respuesta, con artefactos/variantes, entregable verificable y rúbrica docente. Un caso repetido o cuya guía se vio no cuenta como nuevo independiente. Inmutabilidad de informes entregados, borradores separados, historial acotado y sin soluciones antes de entrega guardada. Los objetivos enlazan los nuevos casos y la matriz explica los que siguen sin práctica propia.

## 3. Red local de VMs

Gestor aditivo de topologías propias con tres roles: estación Windows, salto/router Linux con dos NICs y servidor Linux; dos segmentos internos privados por perfil. Sin puente/NAT/host-only, puertos publicados ni servicios del host. Crear, estado, iniciar/parar, snapshot/restore de nodos propios con confirmación; presupuesto de RAM y explicación de dependencias. ISO seleccionado nativamente por rol; no guest downloads automáticos. Paquete de configuración guest legible para IPs, cuentas ficticias, servicios, firewall y verificación; pasos manuales explícitos. Campañas con conectividad, reglas, permisos y pivoting del laboratorio. No presentar VMs vacías como laboratorios listos. Pruebas de comandos/propiedad/red/errores parciales y, donde sea posible, prueba nativa aislada documentada.

## 4. Forense y SIEM local

Paquete forense propio con imagen de disco real analizable, volcado de memoria real de un proceso de laboratorio propio (no RAM del alumno), eventos Windows de laboratorio con procedencia/formato explícitos y manifiesto SHA256/custodia. Sin malware. Diferenciar minidump de RAM completa para Volatility y evidencia real de material sintético. Guías Autopsy/FTK/WinDbg/Volatility según formato compatible, sin inventar soporte. Motor local de ingesta/indexación/búsqueda/correlación sobre eventos de laboratorio: consultas estructuradas acotadas, reglas de detección, hallazgos/alertas y reinicio; sin shell/query libre peligrosa ni acceso a archivos arbitrarios. Su alcance de SIEM didáctico debe ser explícito. Práctica final combina disco/memoria/eventos/red y reporte. Verificación real de estructura/hash/consultas y artefactos; dependencias externas claramente indicadas.

## 5. Devolución por archivos

Paquete de revisión exportable de un informe entregado inmutable. ID del paquete, huella SHA256 canónica del contenido, fecha y origen; no incluir credenciales, host dumps ni borradores. Herramienta local de tutor puede abrir el paquete y crear devolución JSON con comentarios por sección, rúbrica y siguiente práctica. Importación valida versión, tamaño, IDs, huella y vínculo al informe; preview + confirmación antes de guardar. Rechaza devoluciones de otro informe/modificado, duplicados idempotentes; preserva revisiones anteriores. Identidad declarada del tutor, no firma criptográfica. Informe original nunca modificado por feedback. Clave tutor-reviews acotada; UI de exportar/importar y consultar devolución con estados vacíos/errores.

## 6. Combinar Windows y Kali

Nueva operación Combinar copia separada de Reemplazar. Importación nativa de respaldo existente, preview de registros nuevos/iguales/conflictivos, conflictos por registro (clase, historial, evidencia, borrador o lab; nunca elegir silenciosamente por timestamp). Opciones conservar local, usar entrante o conservar ambas donde la estructura lo permite. Para claves únicas preservar copia alternativa en archivo de conflictos y mostrar cómo recuperarla; no fusionar IDs de intentos incompatibles ni marcar resultados como revisados. Origen/procedencia y huellas; la copia original permanece intacta. Preview ligado a revisión del perfil y hash entrante; si cambia el perfil, exigir nuevo preview. Commit atómico con checkpoint y validación final de límites, nada de truncamiento. UI muestra resumen y selección/confirmación explícita, cancelar no escribe. Repetir combinación es idempotente, los datos que ya están no se duplican. Exportación mantiene compatibilidad.

## Aceptación y entrega

Pruebas focales TDD, revisión por tarea y revisión independiente del conjunto; suite existente Windows/Linux y Docker real en CI, verificaciones artefactos, a11y de vistas nuevas y smoke Electron con perfiles temporales. No afirmar pruebas guest o examen oficial no ejecutadas. Nuevo instalador Windows/AppImage público, updater de GitHub existente y guía breve de las seis funciones. Informe de entrega con límites reales y fuentes.
