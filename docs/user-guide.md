# Tu primera semana en Campus Ciberdefensa

## Abrir la aplicación

Instalá la versión de Windows desde [las versiones publicadas](https://github.com/donginox/campus-ciberdefensa/releases/latest) y abrí **Campus Ciberdefensa** desde Inicio o su acceso directo. En Linux, otorgá permiso de ejecución a la AppImage y abrila. Cada computadora guarda sus propios perfiles. Para trasladar el trabajo entre Windows y Kali usá una copia JSON; no hay sincronización online.

El nombre del perfil identifica tus apuntes locales. No es una cuenta protegida por contraseña: otras personas que usen la misma cuenta del sistema operativo pueden abrirlo.

## Decidir qué estudiar hoy

1. Abrí **Mi plan** y elegí una certificación principal y una fecha de revisión. Podés preparar fundamentos comunes para varias, pero conviene tener una prioridad.
2. Hacé el **Diagnóstico personal**. Es una muestra docente de 24 preguntas. Contestá sin buscar respuestas para que el refuerzo tenga sentido.
3. Revisá los dominios que necesitás reforzar y abrí la primera tarea propuesta. El plan combina clases, prácticas y repasos.
4. Reservá una sesión en **Mi agenda**. El tiempo indicado por el campus es orientativo.
5. Al terminar, escribí qué hiciste, qué observaste y qué conclusión podés sostener. Guardar una respuesta no equivale a haberla validado.

Usá el botón de búsqueda o **Ctrl+K** para encontrar una clase, práctica, sala o recurso. En Mac el atajo también acepta Cmd+K. **Tab** recorre los controles; **Escape** cierra los diálogos del campus.

## Practicar en Windows y Linux

**Sistemas y casos** reúne prácticas de procesos, servicios, red, registros y permisos para ambos sistemas. Leé la explicación, realizá el procedimiento en el entorno indicado y resolvé el desafío antes de consultar pistas. Registrá la síntesis y revisá los criterios de la rúbrica.

El botón para observar el equipo ejecuta únicamente una lectura acotada a pedido. No detiene procesos, cambia servicios ni modifica el firewall. Las filas temporales desaparecen al descartarlas o cambiar de vista; el perfil conserva solo la síntesis que elegís registrar. En permisos, la observación usa archivos ficticios creados por el campus.

Si Kali está en otra computadora, realizá allí los pasos Linux. Para llevarte el trabajo, exportá el perfil e importalo en la app de esa computadora. Revisá cuál copia es la más reciente antes de reemplazar el trabajo existente.

## Encender un laboratorio o un escritorio

Las **Salas prácticas** ejecutan servicios locales mediante Docker con contenedores Linux: una aplicación web, un caso defensivo y una base SQLite. Podés leer y guardar respuestas sin Docker. Cuando el motor está disponible, el campus comprueba requisitos y permite iniciar, abrir, detener y restablecer el objetivo propio.

**Escritorios VM** administra únicamente máquinas creadas por esta app en VirtualBox. Elegís una ISO que tengas derecho a usar y la app prepara la máquina con red interna. Después iniciás su escritorio e instalás el sistema manualmente. La app no instala VirtualBox, descarga Windows, acepta licencias ni convierte una definición de VM en un sistema listo.

Instalá y prepará el invitado, apagalo desde su menú y guardá **Campus-base**. Restaurar esa base descarta los cambios posteriores dentro del invitado y requiere confirmación. Los apuntes del campus quedan fuera de la VM. La parada solicita un apagado ACPI; puede tardar o requerir que el invitado responda.

Los objetivos Docker se abren en el `localhost` de la computadora que los ejecuta. Kali en otra computadora no puede alcanzarlos por la red doméstica. No agregues puentes o publicación de puertos para seguir estas prácticas.

## Saber qué falta antes de rendir

Consultá **Qué necesito saber** y **Roadmap**: muestran fuentes oficiales, actividades del campus y brechas. CC y CCST comparten fundamentos; Security+, BTL1 y eJPT requieren preparación adicional específica. Un simulacro de elección múltiple no reemplaza investigar evidencias, usar un SIEM o trabajar con explotación y pivoting en entornos autorizados.

En **Certificaciones**, abrí tu ruta y elegí una competencia para registrar fecha, entorno, procedimiento, resultado e interpretación. Declará la ayuda recibida y el estado de revisión. Elegir una ruta como prioridad actualiza **Mi plan**. Las fuentes y brechas visibles permiten distinguir apoyo local, trabajo externo y objetivos todavía sin verificar.

Entregá los **Simulacros docentes** para ver la explicación y las omisiones. El tiempo opcional continúa aunque cierres la app. Los resultados describen esa selección propia de preguntas y no predicen una nota oficial. Repetí las competencias con casos nuevos y ayuda reducida.

En **Mi plan → Revisar mi avance**, abrí cualquier intento retenido y compará muestras compatibles. Mirá también cuántas preguntas se repiten. El refuerzo propone hasta tres acciones concretas; los resultados de los casos prácticos aparecen separados.

## Usar un caso nuevo

**Análisis de paquetes** permite descargar un ZIP con consignas, PCAP, registros y hashes. Extraelo, conservá una copia original y analizá el caso guiado con Wireshark en Windows o Linux. Registrá filtros, números de paquete, cronología, interpretación y una hipótesis alternativa. Después de guardar el primer informe podés consultar su corrección. Resolvé el caso de transferencia con evidencia nueva. Todo el tráfico del paquete es sintético; no captura tu red.

En **Evaluación práctica**, definí entorno, línea de base y alcance autorizado antes de iniciar. Abrí la sala correspondiente para encender el objetivo propio cuando el motor esté disponible. El informe registra hallazgos, intentos fallidos, evidencia, impacto, remediación, límites y asistencia. Entregar conserva una versión inmutable; consultar orientación y repetir el mismo caso queda señalado. Las prácticas externas de sistemas y pivoting conservan sus requisitos propios.

## Conservar y revisar el trabajo

En **Mi portafolio**, exportá PDF o HTML con los textos y evidencias guardados. Revisá los datos personales antes de compartirlo y contrastá procedimiento, resultado, interpretación y límites. El informe distingue declaraciones y comprobaciones acotadas; no acredita una certificación.

En **Ajustes**, exportá una copia JSON a una carpeta que respaldes. El PDF sirve para leer; el JSON permite volver a importar el progreso. La actualización de la app conserva los perfiles fuera de la instalación. Sin Internet podés seguir estudiando y comprobar actualizaciones más tarde.

Si el campus no puede abrir los datos, presenta **Copias y recuperación**. Inspeccioná fecha y perfiles de una copia, elegila y confirmá la restauración. El archivo actual se conserva aparte. Si no hay copia interna válida, elegí tu JSON externo. Cancelar conserva los datos. Las copias internas están en el mismo disco: mantené además tu respaldo externo.
