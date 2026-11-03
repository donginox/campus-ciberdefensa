# Guía de las seis funciones

Abrí **Campus Ciberdefensa** desde su acceso directo o la AppImage y elegí tu perfil. El recorrido funciona sin servidor. Las actualizaciones se distribuyen por GitHub; tus notas, informes y perfiles se guardan localmente.

## 1. Elegir un examen y revisar sus objetivos

En **Objetivos por examen** elegí la certificación y su versión. Cada fila reúne el objetivo, un refuerzo teórico, recursos relacionados, una actividad, la evidencia que conviene producir y lo que todavía falta practicar. Podés filtrar por dominio, buscar y guardar una próxima acción.

El catálogo contiene 156 objetivos públicos: 19 de CC, 23 objetivos provisionales del curso oficial CCST, 28 de Security+ SY0-701, 27 de SY0-801, 37 temas públicos de BTL1 y 22 resultados públicos de eJPT. No son 156 objetivos oficiales numerados: la pantalla identifica la procedencia y los IDs asignados por Campus. El detalle oficial completo del examen CCST no pudo verificarse; sus enlaces y esa brecha quedan visibles.

SY0-701 y SY0-801 se muestran por separado. Según las fuentes revisadas, SY0-801 se anuncia para el 17 de noviembre de 2026 en inglés; SY0-701 sigue siendo el recorrido predeterminado para esta preparación en español. Antes de contratar un examen, comprobá la versión y el idioma en su página oficial.

Usá **Certificaciones** para la bitácora más amplia de 27 competencias seleccionadas. «Demostración declarada» expresa tu evaluación personal; no es una aprobación del examen. Los enlaces de refuerzo abren la sección correspondiente de las 41 lecturas originales.

## 2. Resolver preguntas y casos nuevos

**Mi plan** ofrece el diagnóstico y los formularios docentes de 24 preguntas. El banco tiene 128 preguntas propias: conserva las 48 anteriores y agrega 80 situaciones nuevas con explicaciones. Las clases mantienen sus 72 preguntas y 48 tarjetas. Una respuesta memorizada o un buen porcentaje no demuestra cobertura completa de una certificación.

En **Evaluación práctica** hay ocho casos. Los seis nuevos trabajan acceso a una carpeta Windows, recuperación de un servicio Linux, política de segmentos, aislamiento de sesiones web, evidencias forenses y contención de correo. Abrí los artefactos, elegí una variante y delimitá tu entorno antes de empezar. Diferenciá lo que observaste de lo que inferís; documentá procedimientos, hipótesis alternativas, impacto, corrección y ayuda recibida.

La entrega queda inmutable. La orientación se desbloquea después de guardar el informe; consultarla también queda registrada. Repetir una variante del mismo caso se identifica como repetición. Hay hasta 12 intentos y un presupuesto de 350000 bytes; si alcanzás un límite, conservá una copia y resolvé el aviso antes de seguir. Los límites no descartan informes antiguos para simular un guardado.

**Ctrl K** permite buscar un objetivo o un caso por su nombre o ID y abrirlo directamente.

## 3. Preparar la red Windows/Linux

**Red de práctica** administra tres VMs propias mediante VirtualBox 7.2:

| Nodo | Recursos de invitado | Conexión |
| --- | --- | --- |
| Estación Windows | 4 GiB RAM, 80 GiB de disco dinámico | Segmento Usuarios |
| Salto Linux | 2 GiB RAM, 20 GiB de disco dinámico | Usuarios y Servidores |
| Servidor Linux | 2 GiB RAM, 30 GiB de disco dinámico | Segmento Servidores |

La topología reserva hasta 8 GiB de RAM para invitados y mantiene 8 GiB disponibles para el host. Los tamaños de disco son máximos dinámicos, no espacio ya ocupado. Todos los adaptadores son internos; el campus no crea puente, NAT ni acceso desde la red doméstica.

Elegí una ISO que tengas derecho a usar para cada nodo. La aplicación crea su hardware, permite abrirlo, solicitar apagado y guardar/restaurar una base propia. **Crear o encender no instala ni verifica el sistema invitado.** La instalación, las dependencias y las pruebas dentro del invitado se hacen siguiendo la guía.

Cuando estén creados los tres nodos, guardá el kit y abrí la guía para extraer sus cuatro archivos en una carpeta nueva. Los scripts comprueban VirtualBox, UUID y MAC contra el manifiesto antes de preparar cuentas y servicios. Leé sus pasos manuales: las direcciones y reglas Linux son temporales, y la contraseña/reinicio de SSH requieren intervención. No hay instalación automática de paquetes ni aceptación de licencias.

Las campañas permiten contrastar acceso autorizado, servicio privado, permisos, firewall y un túnel SSH limitado al laboratorio. El reenvío IP permanece desactivado en la línea de base. Registrá los resultados en la evaluación o la bitácora. La restauración es por nodo; después comprobá que los tres sigan siendo compatibles.

Kali en otra computadora tiene su propio host y sus propios entornos. No puede incorporarse a estas redes internas de VirtualBox: para esta topología usá el Linux creado aquí. Los escritorios individuales anteriores siguen en **Escritorios VM**.

## 4. Investigar disco, memoria, eventos y red

En **Forense y SIEM** exportá el paquete ALAMEDA y leé su guía. Incluye una imagen FAT16 real de 4 MiB, con un archivo borrado recuperable, y registros ficticios identificados como sintéticos. Trabajá sobre copias y comprobá los SHA256 del manifiesto. Autopsy, FTK Imager o Sleuth Kit permiten practicar el análisis del sistema de archivos.

El paquete nativo separado contiene un minidump real de un proceso C# creado exclusivamente para el ejercicio, cinco eventos Windows Application de un proveedor propio y su XML. Se genera y verifica en un entorno efímero de construcción de Windows. **No se adquieren memoria, discos ni eventos de tu computadora.** Los eventos describen acciones ficticias y no son registros Security 4624/4625.

El minidump contiene regiones privadas de un proceso; no es RAM completa del equipo ni debe suponerse compatible con Volatility. Usá un lector minidump o WinDbg para ese archivo. Los análisis de RAM completa y otras herramientas pendientes aparecen como brechas en los objetivos de certificación.

El SIEM didáctico local ingiere e indexa eventos en SQLite, reconoce duplicados, ejecuta reglas y conserva su índice por perfil. Cargá ALAMEDA, consultá por tipo, actor o IP y contrastá los IDs que sustentan una detección. También podés elegir un JSONL propio de laboratorio con el esquema de la guía; debe ser UTF-8. La huella mostrada corresponde a los bytes originales del archivo. El motor no monitorea tus equipos ni ejecuta SQL arbitrario.

El máximo es 5000 eventos, 2 MiB por importación y 16 MiB para el índice. Una detección muestra una muestra acotada de evidencia y, donde corresponde, el total de fallos que califican. Reiniciar el índice requiere confirmación; no borra tus informes ni los archivos fuente. Conservá tus ZIP/JSONL: el respaldo del perfil lleva los informes y borradores, no el índice SQLite ni los discos de las VMs.

## 5. Pedir una devolución por archivo

En **Devoluciones**, elegí una entrega de Evaluación práctica o Análisis de paquetes y guardá el paquete de revisión. Se incluyen sus secciones entregadas y su procedencia; no los borradores, las soluciones ni las filas temporales del host. Revisá tus propios textos antes de compartirlos.

Guardá también la herramienta HTML del tutor. La otra persona puede abrirla localmente, cargar el paquete, completar comentarios/rúbrica/próxima práctica y descargar una devolución JSON. El campus no envía mensajes ni contacta a nadie.

Al recibirla, elegí el JSON, comprobá la vista previa y confirmá. Se valida la relación por SHA256 con el informe original, que permanece intacto. Una devolución duplicada no se agrega dos veces. La identidad del tutor es declarada, no una firma ni una identidad verificada. El historial admite hasta 12 devoluciones y 120000 bytes; un exceso se informa sin recortar revisiones anteriores.

## 6. Combinar avances entre Windows y Kali

Exportá el respaldo JSON desde el equipo de origen. En el otro, abrí **Combinar equipos**, elegí la copia y revisá los registros nuevos, iguales y conflictivos. Elegir o cancelar la copia no reemplaza el perfil.

En cada conflicto decidí conservar el local, usar el entrante o conservar ambas versiones. Cuando un formato solo permite una versión activa, la alternativa completa queda en el archivo de conflictos con su origen y sus huellas; podés leerla y recuperarla manualmente. No se elige automáticamente la versión con fecha más reciente.

Confirmar vuelve a comprobar la revisión del perfil y guarda una combinación atómica con checkpoint. Si cambió el perfil, generá otra vista previa. Repetir la misma combinación no duplica los datos que ya estaban. Un límite o un formato incompatible detiene la operación y conserva los originales.

**Reemplazar** sigue siendo otra operación: sustituye el progreso del perfil por la copia. Usá Combinar cuando quieras conservar trabajo de ambos equipos. No se sincronizan VMs, instalaciones, archivos fuente ni índices SIEM; trasladalos por sus medios correspondientes y conservá copias originales.

## Un cierre de estudio útil

Elegí un objetivo, leé su refuerzo, practicá, entregá una explicación reproducible y registrá qué falta. Contrastá tu trabajo con un caso distinto y, si podés, con una devolución externa. El portafolio PDF/HTML reúne entregas, avance declarado, revisiones vinculadas y brechas; los borradores no aparecen como resultados terminados.

Las certificaciones y sus condiciones pertenecen a sus entidades. La aplicación ofrece preparación independiente y evidencia de aprendizaje; no emite esas credenciales ni garantiza aprobar.
