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
- Ocho laboratorios locales; la aplicación identifica simulaciones, consultas SQL reales sobre datos sintéticos y prácticas guiadas que se realizan en Windows o Linux.
- Perfiles locales separados y copia/restauración; un perfil local no sustituye autenticación o aislamiento entre cuentas del sistema operativo.
- Lectura ampliada, contraste alto, temas claro/oscuro, espaciado y navegación con teclado.

Para traer el progreso de la aplicación HTML anterior, descargá su copia JSON en «Guardado y ayuda» e importala en un perfil del programa nuevo. La aplicación no inspecciona el almacenamiento de tu navegador. Los archivos originales se conservan fuera de este repositorio.

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
src/content/  clases y roadmap
assets/       materiales docentes y datos sintéticos
tests/        pruebas de comportamiento
```

La persistencia se encapsula en el escritorio para poder agregar otro adaptador más adelante. El servidor multiusuario y la sincronización entre equipos son una evolución pendiente; esta versión no presenta perfiles locales como usuarios online.

## Material y alcance

Identidad propia: no es una aplicación oficial de UNDEF ni de los organismos certificadores. El contenido es elaboración docente sobre fuentes parcialmente revisadas; las fuentes y sus límites se conservan en los materiales. Los sitios externos mantienen sus condiciones y algunos requieren cuenta o pago. Los contadores y simulaciones no garantizan aprobar materias o certificaciones.

La licencia MIT cubre el código y el material propio del proyecto. Los documentos y servicios externos enlazados conservan sus derechos y condiciones. No se distribuyen los PDF originales del campus ni el inventario personal del alumno.
