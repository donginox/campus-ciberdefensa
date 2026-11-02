# Campus Ciberdefensa

Aplicación de escritorio para estudiar, practicar y preparar certificaciones. Funciona sin servidor ni cuenta obligatoria. Los perfiles, notas y evidencias escritas se guardan en el equipo; GitHub distribuye el código y las actualizaciones, nunca esos datos personales.

## Instalar

Descargá el instalador de Windows o la AppImage de Linux desde [Releases](https://github.com/donginox/campus-ciberdefensa/releases). En Windows ejecutá el instalador por usuario; el acceso directo abre la aplicación. En Linux otorgá permiso de ejecución a la AppImage y abrila.

La primera versión se construye sin certificado de firma de Windows. El repositorio prepara la firma mediante secretos de CI; no se incluye ningún certificado ni credencial en el código.

## Estudiar y practicar

- 24 clases con teoría, prácticas, 72 preguntas y 48 tarjetas.
- Windows y Linux, sistemas, redes, datos, programación y decisiones de seguridad.
- Final integrador de siete estaciones y criterios de evidencia.
- Roadmap de ISC2 CC, CCST Cybersecurity, Security+, BTL1 y eJPT, con enlaces directos.
- Matriz «Qué necesito saber»: 27 competencias, clases, prácticas, evidencias y brechas con fuentes oficiales.
- Tres salas guiadas con tareas, pistas tras intento, notas y objetivos locales reales.
- Ocho laboratorios locales; la aplicación identifica simulaciones, consultas SQL reales sobre datos sintéticos y prácticas guiadas que se realizan en Windows o Linux.
- Perfiles locales separados y copia/restauración; un perfil local no sustituye autenticación o aislamiento entre cuentas del sistema operativo.
- Lectura ampliada, contraste alto, temas claro/oscuro, espaciado y navegación con teclado.

Para traer el progreso de la aplicación HTML anterior, descargá su copia JSON en «Guardado y ayuda» e importala en un perfil del programa nuevo. La aplicación no inspecciona el almacenamiento de tu navegador. Los archivos originales se conservan fuera de este repositorio.

## Entornos de práctica reales

En «Salas prácticas» podés leer las instrucciones antes de encender un objetivo. El campus comprueba Docker local (motor Linux 28 o superior), conserva el avance docente separado del estado del entorno y ofrece iniciar, abrir, detener y restablecer. Restablecer exige una confirmación nativa con el nombre del objetivo.

| Sala | Qué corre realmente | Qué practica |
| --- | --- | --- |
| Investigación web | OWASP Juice Shop, imagen fijada por digest | Observación de una aplicación vulnerable, evidencia e hipótesis con revisión manual |
| Investigación defensiva | Servicio HTTP propio y eventos capturados | Tráfico de prueba, análisis de fallos/acceso, comprobación de hipótesis y bloqueo dentro de la aplicación |
| Investigación SQL | SQLite real en un servicio propio | Consultas de solo lectura sobre registros sintéticos variables y evaluación del resultado |

Cada objetivo permanece en una red interna sin puertos publicados. Un proxy propio de destino fijo abre el acceso exclusivamente en `127.0.0.1`; es el único componente con una segunda red de acceso. Los contenedores tienen límites de recursos y no montan carpetas del equipo. Defensa y SQLite se incluyen en el instalador como un archivo Docker verificado antes de cargarlo; Juice Shop requiere conexión inicial para obtener su imagen inmutable. Las notas y evidencias se guardan en el perfil; el estado en memoria de los casos propios se pierde al detener/reiniciar.

En **Windows**, Docker Desktop con contenedores Linux permite ejecutar estos mismos objetivos. El campus no instala Docker, modifica WSL/Hyper-V ni inicia VMs existentes. Son servicios en contenedores, no escritorios completos Windows o Kali. Si Kali está en otra computadora, abrí la app Linux y Docker allí para trabajar sobre su localhost. No se expone el objetivo de Windows a la red doméstica.

Sin Docker podés estudiar las salas, guardar respuestas y utilizar los ocho ejercicios anteriores. Las prácticas Windows/Linux con sistemas completos, forense y pivoting quedan identificadas como pendientes de ejecutar en otro entorno; no se acreditan con estas salas.

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
