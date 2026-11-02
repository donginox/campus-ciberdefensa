# Plataforma de laboratorios locales

Decisión de arquitectura, verificada el 2026-11-02. Este documento describe el contrato recomendado; no prueba que las imágenes o el flujo aquí propuestos ya estén implementados o publicados.

> Registro de investigación previo a la implementación. Los nombres, endpoints y contratos finales están en [mission-campus-spec.md](mission-campus-spec.md) y [README del runtime](../lab-runtime/README.md). Las recetas implementadas se llaman `soc-response` y `database-fundamentals`; el replay se orquesta en el manager mediante peticiones HTTP reales.

## Alcance y recetas

El campus de Electron administra objetivos Linux en Docker local para Windows y Linux x64. Docker es un requisito del equipo donde se ejecuta Campus. Una máquina Kali en otra computadora no alcanza un servicio publicado exclusivamente en `127.0.0.1`; esta versión abre la aplicación del laboratorio en el navegador del mismo equipo. No hay servidor de laboratorios remoto ni una VM de ataque integrada.

| ID de receta | Servicio real | Interacción | Estado y reinicio |
| --- | --- | --- | --- |
| `juice-shop` | OWASP Juice Shop 20.3.0 | Navegador local, puerto interno 3000 | Mantener el comportamiento actual de contenedor y restablecimiento |
| `defense-http` | Servicio HTTP propio, Python stdlib | Reproducir solicitudes predefinidas, inspeccionar eventos y activar una regla defensiva | Eventos en memoria con límite; reinicio del proceso vuelve a la semilla |
| `database-sqlite` | Servicio HTTP propio con el motor SQLite de CPython | UI de consulta SQL y tareas sobre tablas reales | SQLite en memoria por proceso; reinicio vuelve a la semilla |

Los dos servicios propios evitan librerías descargadas por pip, montajes del host, credenciales y procesos externos. Son servicios ejecutados en un contenedor; no se deben presentar como máquinas virtuales ni como servidores PostgreSQL. SQLite es un motor real, aunque no un servidor PostgreSQL: su interfaz SQL está documentada en [CPython](https://docs.python.org/3.13/library/sqlite3.html).

No se recomienda PostgreSQL para esta primera receta: la imagen oficial necesita inicialización, directorios de datos y un cliente/UI adicional, y declara almacenamiento que no cumple directamente la política actual de cero montajes. Agregarla requeriría una receta y verificación explícitas de volúmenes, semilla, credenciales y dos servicios; no relajar globalmente el verificador. La [imagen oficial PostgreSQL](https://hub.docker.com/_/postgres) queda como extensión independiente.

## Imágenes fijadas

Verificación por API pública de Docker Registry, solicitando índices OCI/manifest list y seleccionando `linux/amd64`. Los siguientes digests son resultados de investigación, no hashes inventados para las imágenes propias aún sin construir.

- Juice Shop: conservar exactamente `bkimminich/juice-shop@sha256:cea5a4af4aacee498c491491af0408934ec81d004035c0a02ef3e54395e3bf27`, confirmado contra `v20.3.0`. Manifest de plataforma amd64: `sha256:590a451634fe564eff575ecb353a0e67ed6b3abef77005b223281663abda867e`.
- Base propia: `python:3.13.18-slim-bookworm@sha256:281d39ff02e3b389401586134ff9e6572954687822a58055ec07a60ded4e0b7f`. Manifest de plataforma amd64: `sha256:70bda1e795ded2a684ef9815955e05829b14ee5bb5c3eb2a940648e88f10fce9`. Config de imagen: `sha256:b7ddb46f14cdb6312b0ac3816e0513fe55904bd66e4525b8845058d3c1aa0f79`, `PYTHON_VERSION=3.13.18`, sin volúmenes declarados. Usar `--platform linux/amd64`.
- Alternativa investigada, no seleccionada: `postgres:17-bookworm@sha256:839fbb5a4942a7758dd93e18b42ea5649807491a0545b5eeeb8f0b8bb11857a5`, amd64 `sha256:2cd2c0f809604aaeff6f0ec8f40aecbd025613107561015c69369a1a7f1d3416`.
- Mantener Node 22 para CI y actualizar el parche fijado a `22.23.4` (publicación oficial 2026-10-20), en lugar del `22.17.0` actual. No instalar Node o Python en la computadora del alumno: Electron y las imágenes proveen sus runtimes. Fuentes: [releases Node](https://nodejs.org/en/about/previous-releases), [índice oficial Node](https://nodejs.org/dist/index.json), [imagen Python](https://hub.docker.com/_/python).

Las recetas finales deben fijar sus propios image IDs y hashes de archivo generados por CI. Un tag versionado ayuda a diagnosticar; nunca es una prueba de identidad por sí mismo. Docker recomienda [fijar las versiones base y probar en CI](https://docs.docker.com/build/building/best-practices/).

## Contrato de los servicios propios

El servidor utiliza un handler HTTP explícito, sin `SimpleHTTPRequestHandler`, navegación del filesystem ni CGI. Solo sirve rutas estáticas autorizadas desde bytes incluidos en la imagen, JSON y endpoints enumerados. Escapa los datos mostrados como texto; agrega CSP restrictiva; no incorpora scripts ni fuentes remotas. Python advierte que [http.server no es un servidor de producción](https://docs.python.org/3.13/library/http.server.html); aquí se usa solamente para una práctica acotada en loopback.

Cada arranque crea `runId`, `recipeVersion`, `seedVersion` y una semilla determinista. `GET /health` responde con esos campos y `ready: true` únicamente después de crear tablas/semilla. `GET /api/tasks` devuelve IDs de tareas y su estado derivado del servicio. No aceptar comandos, URL de destino, código Python o rutas desde el renderer.

Para defensa:

1. `POST /api/replay` acepta únicamente un ID de escenario enumerado y un máximo fijo de solicitudes. Un worker interno usa `http.client` para llamar al socket HTTP del propio servicio en `127.0.0.1`, sin destino configurable ni redirecciones. Debe haber concurrencia controlada para no bloquear el servidor que atiende el replay.
2. El escenario genera navegación normal y solicitudes de prueba de autenticación con cuentas ficticias y rutas de práctica fijas. No realiza escaneo, malware ni tráfico hacia otros equipos.
3. Cada solicitud atendida produce un evento real con secuencia, hora UTC, método, ruta limitada, estado, regla aplicada y `runId`. Límite de eventos y bytes; sin contraseñas ni cuerpos completos. La UI obtiene eventos por `GET /api/events?after=N` y permite descarga de JSON/NDJSON desde el navegador.
4. `POST /api/rules` acepta una regla enumerada, por ejemplo límite de intentos de autenticación. Repetir el escenario debe observar respuestas bloqueadas y cambiar las tareas con evidencia de eventos; no marcar éxito por pulsar un botón.

Para bases de datos:

1. Sembrar tablas pequeñas, por ejemplo `assets`, `users` y `events`, en una conexión SQLite en memoria. Serializar consultas con un lock o usar un único worker; no crear una conexión vacía por petición.
2. `POST /api/query` ejecuta una única sentencia con tamaño máximo. Para la primera receta permitir lectura (`SELECT`, CTE de lectura) y bloquear operaciones peligrosas con el authorizer de SQLite: `ATTACH`, `DETACH`, cambios de PRAGMA, extensiones, carga de funciones y escritura de archivos. Una regex de prefijo no basta.
3. Establecer límites de SQL, filas y resultado; instalar un progress handler con presupuesto de instrucciones/tiempo para cortar joins abusivos. Retornar nombres de columnas y filas realmente obtenidas. Usar parámetros para las operaciones internas.
4. Las tareas deben comprobar propiedades de los resultados (columnas, orden y valores), no una cadena SQL exacta. Explicar que el dialecto y las funciones son SQLite.

Todo POST de control requiere JSON, validación de `Host` y `Origin` para el puerto loopback efectivo, y protección frente a peticiones de páginas ajenas. No permitir CORS de terceros. La capa Electron, si consulta el servicio, deriva la dirección exclusivamente del contenedor ya verificado, limita tiempo/tamaño, rechaza redirecciones y comprueba identidad del healthcheck.

## Propiedad y ciclo de vida

Extender `RealLabManager`, `RealLabActions`, validación IPC y preload con un `labId` enumerado. Los argumentos deben ser `{profileId, labId}` verificados antes de tocar disco o lanzar subprocesos. El renderer no aporta flags Docker, imagen, rutas de archivos o URL de descarga. Los handlers deben seguir comprobando la existencia del perfil con `ProfileStore`.

Preservar por compatibilidad las identidades y nombres Juice Shop actuales: `campus-${instanceId}-${profile}-juice-shop` y `campus-${instanceId}-${profile}-internal`, con las mismas labels. Cada receta nueva recibe su contenedor y una red interna independiente, por ejemplo `...-defense-http` y `...-defense-http-internal`, sin permitir miembros extra. No conectar los tres servicios a una red compartida.

Mantener las garantías actuales: contexto Docker local `npipe`/Unix, contenedores Linux, Engine >=28, `execFile` con `shell:false`, entorno sin `DOCKER_*`, límites de CPU/memoria/PIDs, todas las capabilities eliminadas, `no-new-privileges`, sin restart automático, sin dispositivos, socket Docker, host networking ni privilegios. El mínimo Engine 28 es relevante por el [aislamiento de puertos localhost](https://docs.docker.com/engine/network/port-publishing/).

Cada receta define configuración esperada cerrada: image identity, puerto, comando, entrypoint, user, working directory, entorno, límites y montajes. Construir imágenes propias con usuario numérico no root y sin `VOLUME`; se puede usar raíz de solo lectura porque los datos son de memoria y `PYTHONDONTWRITEBYTECODE=1`. Verificar también esa propiedad. No heredar excepciones de una receta a otra.

Inspeccionar antes y después de cada mutación. Cambiar o eliminar únicamente IDs completos recién verificados, nunca nombres solos ni selectores amplios de labels. Recursos con identidad/configuración alterada producen `unsafe`, sin adopción ni borrado. Serializar operaciones por directorio de datos como hoy y detectar colisiones entre procesos o evitar múltiples instancias de Campus.

Agregar estados concretos `downloading`, `verifying`, `loading`, `starting`, `running`, `stopped`, `unavailable`, `unsafe` y `error`, con progreso acotado y posibilidad de reintentar. `running` requiere Docker en ejecución más healthcheck del servicio; conservar un estado transitorio mientras el servidor se prepara. Detener un laboratorio no borra imágenes ni los otros objetivos. Restablecer pide confirmación que nombre la receta y recrea solo el contenedor propio. Aclarar que los dos servicios en memoria pierden su sesión al detener/reiniciar; las notas y progreso del campus se guardan aparte.

## Distribución y confianza

Publicar archivos `campus-defense-http-<version>-linux-amd64.tar.gz` y `campus-database-sqlite-<version>-linux-amd64.tar.gz` en el release público de GitHub existente. Esto evita exigir cuenta o token de un registry. GHCR sí soporta [lecturas anónimas para imágenes públicas](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry), pero su visibilidad es una configuración separada que no conviene asumir.

Formato recomendado: archivo generado con `docker image save` y gzip. No llamarlo archivo OCI: los [exportadores OCI y Docker producen layouts diferentes](https://docs.docker.com/build/exporters/oci-docker/), y `docker save` tiene una ruta [documentada hacia docker load](https://docs.docker.com/reference/cli/docker/image/save/). No descomprimir en el filesystem del usuario; verificar el gzip completo y entregar el archivo aprobado directamente a Docker.

El manifest contiene schemaVersion, releaseVersion, commit, labId, platform, filename, bytes, sha256 del gzip, imageId/config digest y tag local esperado. Flujo de confianza:

1. CI construye y prueba las dos imágenes antes de compilar los instaladores.
2. Genera el manifest a partir de los bytes finales y del `docker image inspect`. Los builds Windows/Linux descargan ese artifact de la misma ejecución y lo incluyen en `app.asar`.
3. Main acepta únicamente recetas incluidas en ese manifest local empaquetado. Descarga `https://github.com/donginox/campus-ciberdefensa/releases/download/<tag-fijo>/<archivo-fijo>`; permite solo redirects HTTPS necesarios a hosts oficiales de assets, con límite de redirects, timeout y máximo de bytes. Nunca aceptar URL del renderer o `latest/download`.
4. Escribe temporal privado en `userData`, calcula SHA-256 en streaming, compara bytes y hash contra el manifest embebido y recién entonces hace `docker image load --input <archivo>`. La descarga de un checksum desde el mismo release no constituye una firma ni basta como raíz de confianza.
5. Tras cargar, `docker image inspect <imageId>` debe probar ID exacto, plataforma y configuración de la receta. Crear por imageId y comprobar que el contenedor usa ese mismo ID. `RepoDigests` puede estar vacío para imágenes cargadas desde archivos; no relajar la verificación existente de Juice Shop, que sigue descargándose por digest del registry.
6. Cachear por hash aprobado; escrituras atómicas. Interrupción, archivo parcial, hash distinto, imagen ausente o identidad inconsistente impiden ejecutar el servicio y permiten reintento seguro.

La confianza de ejecución hereda la del instalador y su manifest embebido. El CI puede agregar [attestations de GitHub](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations) para que un auditor compruebe repo, commit y workflow con `gh attestation verify`. No anunciar archivos firmados o provenance verificada en runtime si la aplicación no verifica esa firma. Una actualización independiente de recetas necesitaría una firma de manifest y una clave pública fijada en la app; queda fuera de esta primera versión.

## CI que prueba contenedores reales

Agregar un job `lab-images` en `ubuntu-24.04`, anterior a la matriz de instaladores. Debe comprobar Docker, construir ambas imágenes desde base fijada y probar el mismo perfil de ejecución seguro que usa la aplicación. Sin Docker en la máquina de desarrollo, la validación del contenedor se hace en ese runner; no sustituirla por mocks.

Pruebas mínimas reales: levantar ambas imágenes con redes internas propias y puertos loopback aleatorios, esperar health con deadline, obtener UI y tareas, reproducir defensa y verificar secuencias de eventos HTTP, activar regla y comprobar bloqueo; ejecutar consulta SQLite y comprobar filas reales, bloquear `ATTACH` y abortar consulta costosa; detener y reiniciar; comprobar semilla y limpieza selectiva. Inspeccionar límites, user, mounts y red del contenedor resultante. Guardar logs de falla sin secretos.

Después, `docker save` + gzip determinista, SHA-256 y manifest; borrar únicamente los contenedores/redes de smoke test; cargar los archivos en un daemon limpio o retirar los tags/IDs del build si no están en uso, y repetir los smoke tests contra imágenes cargadas. Este segundo tramo detecta problemas de layout, tag e identidad tras `load`.

Conservar un artifact CI con los dos gzip, manifest y logs. Ambos builds de instaladores deben depender de ese job y embeber exactamente el mismo manifest. El job de release depende de imágenes e instaladores, verifica presencia de todos los assets, publica primero como draft y solo marca latest después de subirlos completos. Fijar acciones por SHA completo como el workflow actual. Una falla de imagen o smoke test bloquea todo el release; no publicar un instalador que referencia assets faltantes.

## Evidencia y límites de esta decisión

Se inspeccionaron `desktop/real-labs.cjs`, `desktop/real-lab-actions.cjs`, `desktop/main.cjs`, `desktop/preload.cjs`, `package.json` y `.github/workflows/release.yml`. El manager actual tiene una única receta hardcodeada y controles estrictos; la acción de reset también nombra Juice Shop de forma fija. El workflow actual ejecuta tests de Node y empaqueta instaladores, pero no construye ni prueba imágenes propias. Las nuevas recetas requieren implementación y ejecución real de CI antes de afirmar que funcionan en Docker. No se instaló Docker ni se usó un motor remoto para esta investigación.
