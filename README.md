# Campus Ciberdefensa

Aplicación de escritorio para estudiar, practicar y preparar certificaciones. Funciona sin servidor ni cuenta obligatoria. Los perfiles, notas y evidencias escritas se guardan en el equipo; GitHub distribuye el código y las actualizaciones, nunca esos datos personales.

## Instalar

Descargá el instalador de Windows o la AppImage de Linux desde [Releases](https://github.com/donginox/campus-ciberdefensa/releases). En Windows ejecutá el instalador por usuario; el acceso directo abre la aplicación. En Linux otorgá permiso de ejecución a la AppImage y abrila.

La primera versión se construye sin certificado de firma de Windows. El repositorio prepara la firma mediante secretos de CI; no se incluye ningún certificado ni credencial en el código.

## Estudiar y practicar

- Guía de inicio reanudable: prioridad, fecha, disponibilidad flexible y entornos viables.
- Diagnóstico de 24 preguntas, plan personal, agenda y repaso espaciado. Cinco simulacros docentes seleccionan preguntas de un banco propio de 48; repetirlas no mide preparación oficial.
- 24 clases con teoría, prácticas, 72 preguntas y 48 tarjetas.
- Windows y Linux, sistemas, redes, datos, programación y decisiones de seguridad.
- Final integrador de siete estaciones y criterios de evidencia.
- Roadmap de ISC2 CC, CCST Cybersecurity, Security+, BTL1 y eJPT, con enlaces directos.
- Matriz «Qué necesito saber»: 27 competencias, clases, prácticas, evidencias y brechas con fuentes oficiales.
- Cinco espacios de certificación y una bitácora con procedimiento, resultado, interpretación, asistencia y revisión declarada.
- Diez prácticas Windows/Linux y tres campañas conectadas; observación real del equipo únicamente a pedido, sin guardar filas del host.
- Dos casos PCAP originales con registros correlacionados, descarga ZIP sin conexión y correcciones después de registrar el informe.
- Dos evaluaciones prácticas web/defensa con alcance previo, informes inmutables y registro de ayuda. El historial separa repetición, orientación y evidencia nueva.
- Exportación PDF/HTML del portafolio; recuperación de datos dañados, checkpoints acotados y respaldo JSON externo.
- Tres salas guiadas con tareas, pistas tras intento, notas y objetivos locales reales.
- Ocho laboratorios locales; la aplicación identifica simulaciones, consultas SQL reales sobre datos sintéticos y prácticas guiadas que se realizan en Windows o Linux.
- Perfiles locales separados y copia/restauración; un perfil local no sustituye autenticación o aislamiento entre cuentas del sistema operativo.
- Lectura ampliada, contraste alto, temas claro/oscuro, espaciado y navegación con teclado.

Para traer el progreso de la aplicación HTML anterior, descargá su copia JSON en «Guardado y ayuda» e importala en un perfil del programa nuevo. La aplicación no inspecciona el almacenamiento de tu navegador. Los archivos originales se conservan fuera de este repositorio.

Empezá por **Guía de inicio**, continuá con el diagnóstico y abrí la primera tarea de **Mi plan**. Usá **Certificaciones** para relacionar cada competencia seleccionada con una evidencia y su próxima acción. La [guía de uso](docs/user-guide.md) explica el recorrido completo.

## Entornos de práctica reales

En «Salas prácticas» podés leer las instrucciones antes de encender un objetivo. El campus comprueba Docker local (motor Linux 28 o superior), conserva el avance docente separado del estado del entorno y ofrece iniciar, abrir, detener y restablecer. Restablecer exige una confirmación nativa con el nombre del objetivo.

| Sala | Qué corre realmente | Qué practica |
| --- | --- | --- |
| Investigación web | OWASP Juice Shop, imagen fijada por digest | Observación de una aplicación vulnerable, evidencia e hipótesis con revisión manual |
| Investigación defensiva | Servicio HTTP propio y eventos capturados | Tráfico de prueba, análisis de fallos/acceso, comprobación de hipótesis y bloqueo dentro de la aplicación |
| Investigación SQL | SQLite real en un servicio propio | Consultas de solo lectura sobre registros sintéticos variables y evaluación del resultado |

Cada objetivo permanece en una red interna sin puertos publicados. Un proxy propio de destino fijo abre el acceso exclusivamente en `127.0.0.1`; es el único componente con una segunda red de acceso. Los contenedores tienen límites de recursos y no montan carpetas del equipo. Defensa y SQLite se incluyen en el instalador como un archivo Docker verificado antes de cargarlo; Juice Shop requiere conexión inicial para obtener su imagen inmutable. Las notas y evidencias se guardan en el perfil; el estado en memoria de los casos propios se pierde al detener/reiniciar.

En **Windows**, Docker Desktop con contenedores Linux permite ejecutar estos mismos servicios. Además, **Escritorios VM** prepara máquinas propias Windows o Linux mediante VirtualBox 7.2: seleccionás una ISO válida, instalás el invitado manualmente, abrís su escritorio y guardás/restaurás una base. La app administra exclusivamente sus máquinas en un registro privado y comprueba propiedad, configuración y rutas antes de controlarlas. Usa una red interna, sin puente o NAT. Ver [máquinas virtuales](docs/vm-labs.md).

El campus no instala Docker, VirtualBox, WSL/Hyper-V ni sistemas operativos automáticamente. Si Kali está en otra computadora, abrí la app Linux allí para trabajar sobre su localhost; los objetivos de Windows no se exponen a la red doméstica. Sin motores podés estudiar, guardar informes y usar los ejercicios y archivos descargables. Las prácticas de sistemas se realizan en tu equipo o en un invitado preparado; las brechas de disco/memoria, SIEM, explotación entre hosts y pivoting siguen explícitas y requieren entornos adicionales.

## Evidencias y recuperación

El portafolio reúne resúmenes, procedencia elegida, rúbricas, bitácora y reportes entregados, con sus límites y brechas. Las declaraciones de ejecución, ayuda o tutor no verifican por sí solas identidad ni dominio. Los borradores de exámenes e informes prácticos no se exportan como entregas.

**Copias y recuperación** permite inspeccionar versiones válidas y restaurarlas mediante confirmación nativa. Antes de reemplazar los datos se preserva el archivo actual. Hay hasta cinco checkpoints y cinco originales preservados; al alcanzar este último límite la app pide archivarlos antes de otra recuperación. La inspección y la cancelación no reemplazan datos. Exportá también JSON fuera del disco de estudio. Ver [recuperación](docs/recovery.md).

Ver [topología y prácticas](docs/real-labs-topology.md), [competencias y brechas](docs/certification-competencies.md) y [referencias públicas del diseño](docs/learning-experience-research.md). Al cerrar el campus, un contenedor puede seguir encendido hasta elegir Detener. No hay servidor multiusuario ni sincronización entre equipos.

## Actualizaciones

La app instalada comprueba versiones publicadas al abrirse y permite una comprobación manual. La falta de Internet no impide estudiar. Descarga las versiones nuevas y conserva los datos fuera de la instalación; el reinicio se realiza después de guardar.

Cada cambio que llega a `main` pasa por las pruebas y una compilación para Windows y Linux. El flujo publica una release con instaladores y manifiestos de actualización; el cliente descarga esas versiones, no ejecuta código de una rama de Git. Ver [actualizaciones](docs/updates.md).

## Desarrollar

Requiere Node.js 22.12 o superior. Las dependencias están fijadas en el lockfile.

```sh
npm ci
npm test
npm start
```

```sh
# Primero, con Docker disponible, preparar el runtime incluido:
python scripts/build-lab-runtime.py --version 0.1.0 --output-dir .local/lab-runtime
python scripts/smoke-lab-runtime.py --runtime-dir .local/lab-runtime
npm run dist:win
npm run dist:linux
```

La compilación Linux se realiza en Linux (también en CI). La Windows usa NSIS. No se necesita un servidor para ejecutar la aplicación.

## Estructura

```text
desktop/       ventana, perfiles, archivos, IPC y actualizaciones
src/renderer/ interfaz de estudio
src/labs/     motores aislados y simuladores
src/shared/   reglas de progreso y copias
src/content/  clases, roadmap, misiones y competencias
lab-runtime/ servicio HTTP/SQLite propio empaquetado como imagen Docker
assets/       materiales docentes y datos sintéticos
tests/        pruebas de comportamiento
```

La persistencia se encapsula en el escritorio para poder agregar otro adaptador más adelante. El servidor multiusuario y la sincronización entre equipos son una evolución pendiente; esta versión no presenta perfiles locales como usuarios online.

## Material y alcance

Identidad propia: no es una aplicación oficial de UNDEF ni de los organismos certificadores. El contenido es elaboración docente sobre fuentes parcialmente revisadas; las fuentes y sus límites se conservan en los materiales. Los sitios externos mantienen sus condiciones y algunos requieren cuenta o pago. Los contadores y simulaciones no garantizan aprobar materias o certificaciones.

La licencia MIT cubre el código y el material propio del proyecto. Los documentos y servicios externos enlazados conservan sus derechos y condiciones. No se distribuyen los PDF originales del campus ni el inventario personal del alumno.
