# Distribución y actualizaciones

Campus funciona localmente sin servidor y sin cuenta obligatoria. El código y las distribuciones se publican en [donginox/campus-ciberdefensa](https://github.com/donginox/campus-ciberdefensa). GitHub se usa únicamente para descargar nuevas versiones; el contenido del campus y los perfiles funcionan sin conexión.

El cliente instalado usa `electron-updater` 6.8.11 con el proveedor público GitHub. Comprueba actualizaciones al abrir, descarga automáticamente y aplica una versión descargada al cerrar, o al solicitar reinicio. Antes de cerrar, main espera la señal de la interfaz de que terminó su cola de guardado y después vacía su propia cola. Si la interfaz no confirma el guardado, el cierre queda bloqueado. Un error de red deja el campus disponible y muestra un estado de actualización recuperable. En desarrollo, las actualizaciones están desactivadas.

No se necesita un token en el cliente. Nunca deben agregarse `GH_TOKEN`, `GITHUB_TOKEN`, contraseñas ni certificados a archivos de configuración, perfiles, renderer o recursos distribuidos. No se ejecuta código de la rama main ni se hace `git pull` en el equipo del alumno. Se instala una distribución versionada con los hashes que comprueba el updater y transporte HTTPS. Estos hashes no equivalen a una firma independiente del manifiesto Linux.

## Publicación en main

Antes de compilar, CI construye una imagen propia de laboratorio desde una base fijada por digest, ejecuta sus pruebas Python/HTTP y pruebas reales de Docker. Genera un único archivo Docker comprimido con SHA-256, tamaño e ImageID; los dos instaladores incorporan exactamente ese recurso. El manager verifica el archivo antes de cargarlo y comprueba su ImageID después. Las identidades previamente cargadas desde archivos verificados se registran en un historial privado de la instancia. Si cambia la imagen incluida, un objetivo anterior validado muestra que requiere actualización y permite detener/restablecer, sin habilitar práctica. Restablecer lo migra a la imagen actual y conserva las notas. Una imagen desconocida o un recurso adulterado permanece bloqueado.

La imagen de Juice Shop conserva su digest fijo y no se incluye en ese archivo.

Cada push a main ejecuta pruebas con Node 22.23.4 y construye NSIS x64 en Windows y AppImage x64 en Linux. La versión es `0.1.<github.run_number>`, creciente para este workflow. La versión local inicial es 0.1.0. Mantener este workflow y su contador; no reutilizar números ni modificar una release ya publicada. Un nuevo intento de una ejecución ya publicada no reemplaza sus artefactos.

Las pull requests ejecutan los mismos checks y compilan instaladores sin publicar una release. Solo main o un dispatch sobre main pueden publicar.

Los dos jobs generan instaladores y metadatos con electron-builder 26.18.0 y Electron 45.2.1. El job final descarga ambos conjuntos completos, exige el instalador Windows, su blockmap, el AppImage y `latest.yml`/`latest-linux.yml`, crea una release borrador, sube todos los archivos y recién entonces la publica. Si falla una compilación o una subida, no aparece una release estable incompleta. Un borrador fallido puede inspeccionarse y eliminarse desde GitHub antes de repetir la publicación. La credencial automática `GITHUB_TOKEN` tiene permisos de publicación solamente en el job final y nunca entra al paquete.

## Firma Windows

Los secretos opcionales `WIN_CSC_LINK` y `WIN_CSC_KEY_PASSWORD` permiten firmar con un certificado de producción propio. Cuando existe el certificado, CI activa `forceCodeSigning` para fallar si la firma no se completa. `verifyUpdateCodeSignature` está habilitado en builder; las compilaciones firmadas incluyen el editor derivado de su certificado. Mantener estable ese editor entre versiones.

Sin esos secretos, el instalador se genera **sin firma**. El repositorio no incluye un certificado ni declara que el binario esté firmado. Windows puede mostrar advertencias al abrirlo. La firma no garantiza eliminar avisos de SmartScreen. No publicar una release como firmada sin comprobar la firma del artefacto real.

## Ubicación y recuperación de perfiles

Los perfiles se guardan en `app.getPath('userData')/campus-data/profiles.json`, fuera del directorio de instalación. El archivo se escribe mediante temporal, sincronización y renombrado; `profiles.json.bak` conserva la revisión anterior válida. El instalador por usuario conserva estos datos al actualizar y desinstalar. Los perfiles son una organización local, sin autenticación ni aislamiento entre personas que usan la misma cuenta del sistema operativo.

Un archivo corrupto no se reemplaza automáticamente. Cerrá la aplicación, conservá copias de `profiles.json` y `.bak`, y recuperá el `.bak` válido mediante una copia manual a `profiles.json`. Esta acción restaura la revisión anterior. La aplicación informa el problema para evitar pérdida silenciosa. Los respaldos exportados se pueden importar en un perfil elegido explícitamente; se admiten el formato de escritorio v1 y las copias anteriores `academia-ciberdefensa` v1. Nunca se busca progreso en el navegador.

## Verificación antes de declarar una actualización probada

Construir y abrir el instalador no prueba la actualización. Para verificar el recorrido completo hay que publicar una versión mayor, abrir una instalación anterior, comprobar descarga y estado, dejar cambios pendientes, cerrar, volver a abrir y confirmar versión nueva y perfiles conservados. Ejecutar la prueba en Windows para NSIS y en Linux para AppImage. Registrar por separado las plataformas realmente probadas. Los tests de estado, validación y guardado no sustituyen este recorrido ni la inspección de firma.
