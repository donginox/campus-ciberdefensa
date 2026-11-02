# Runtime de prácticas

Una imagen propia sirve dos objetivos: `CAMPUS_LAB_MODE=soc` o `database`, y el
proxy de acceso con `CAMPUS_LAB_MODE=proxy`.
`CAMPUS_SEED` acepta enteros entre 1 y 2147483647. Cada proceso crea una sesión
vacía, con un `runId` nuevo y un `caseId` determinista por modo y semilla. Toda
la actividad y la base SQLite viven en RAM. Detener/arrancar pierde la sesión;
el progreso que guarda la aplicación de escritorio es independiente.

La imagen usa la base y el digest de `docs/mission-campus-spec.md`, puertos 8080
(objetivo) y 8081 (proxy),
usuario `10001:10001`, directorio `/app`, entrypoint nulo y comando
`["python", "/app/server.py"]`. No declara volúmenes ni instala paquetes.
Funciona con raíz de solo lectura. Cada objetivo se conecta únicamente a su
red interna, sin puertos publicados. Un sidecar conecta esa red y una segunda
red bridge de acceso; solo publica su puerto 8081 en loopback. El manager
configura límites de CPU, memoria y PIDs para ambos contenedores.

Una red exclusivamente `--internal` no tiene gateway y Moby no publica sus
puertos, aunque conserve la solicitud en `HostConfig.PortBindings`. Por eso la
comprobación usa la publicación efectiva en `NetworkSettings.Ports`, y el
sidecar conserva la red interna del objetivo. El proxy sí tiene una ruta de
salida por su red de acceso; su código solo permite el destino configurado.
Referencia primaria: [explicación del maintainer de Moby](https://github.com/moby/moby/discussions/53256).

El proxy acepta `CAMPUS_TARGET_NAME=target-<24 hex>`, un alias DNS corto derivado
por el manager del nombre completo del objetivo. `CAMPUS_TARGET_PORT` es 8080
para `CAMPUS_TARGET_MODE=soc|database`, o 3000 para `juice-shop`. Esas variables
solo provienen del manager; ninguna petición HTTP cambia el destino.
`GET /_campus_proxy/health` devuelve identidad del proxy, destino y
`ready`/`backendReady` derivados de una solicitud real al objetivo. Las demás
rutas se reenvían al destino fijo. El proxy valida Host/Origin de loopback,
reescribe ambos para el servicio interno, elimina headers hop-by-hop y los
declarados en Connection, no sigue redirecciones y rechaza respuestas 3xx.
Admite 1 MiB de cuerpo de solicitud, 16 MiB de respuesta, timeout de 5 segundos
y un máximo de 16 threads simultáneos. Solo el GET de polling Engine.IO 4 de
Juice Shop en `/socket.io/?EIO=4&transport=polling` dispone de 55 segundos para
recibir su ping periódico; conserva los mismos límites de bytes y concurrencia.
No admite Upgrade de WebSocket, CONNECT ni URLs absolutas.

## API del protocolo 1

- `GET /health`: identidad, modo, caso y sesión lista.
- `GET /api/case`: descripción y objetivo, sin respuestas. SOC incluye una
  cuenta de práctica pública en `trainingAccount` y `actors` enumerados.
- `GET /api/events`: últimos 300 eventos. `actor` es una etiqueta ficticia;
  `peer` viene del socket HTTP real y puede ser la puerta de enlace de Docker.
- SOC: `POST /login {username,password}`, `GET /catalog`, `GET /admin`.
  `X-Campus-Actor` admite `sonda`, `visitante` u `operador`; el valor por defecto
  es `visitante`. La cuenta pública es `analista` / `campus-practica`.
- SOC: `POST /api/assess {actor,failures}` compara los fallos exactos del actor
  con los eventos actuales. Requiere al menos tres fallos y después un login
  exitoso seguido de una solicitud a `/admin`.
- SOC: `POST /api/control {action:"block",actor}` aplica una regla dentro de
  esta aplicación. Los próximos accesos de ese actor devuelven 403 y registran
  `outcome:"blocked"`. No cambia el firewall del host.
- DB: `POST /api/query {query}` devuelve columnas, filas, límites aplicados,
  tiempo y evaluación del resultado real, sin comparar el texto SQL.

El replay del manager hace seis solicitudes HTTP: tres logins fallidos de
`sonda`, catálogo, login con la cuenta de práctica y administración. El
servicio no fabrica los eventos ni ofrece un endpoint que apruebe una tarea
por ejecutar el replay.

SQLite tiene tablas `auth_events`, `assets` y `users`; `/api/case` describe sus
columnas. El objetivo pide `source_ip` y `failures`, contando `outcome='failure'`,
con tres o más fallos y orden por origen ascendente. Hay dos resultados y sus
valores varían con la semilla. El authorizer solo habilita lecturas y funciones
enumeradas; bloquea escritura, PRAGMA, ATTACH y extensiones. Una consulta admite
8 KB, una sentencia SELECT/WITH, 64 columnas y 200 filas. Cada celda tiene como
máximo 4096 caracteres. El resultado HTTP no supera 512 KB; el progress handler
corta a los 2 segundos o al agotar el presupuesto de instrucciones. SQLite usa
almacenamiento temporal en memoria y un límite adicional de longitud interna.

Las rutas estáticas están enumeradas; no hay navegación del filesystem, CGI,
subprocesos, CORS ni contenido remoto. Las solicitudes requieren un Host de
loopback. Los POST requieren JSON y, si el cliente envía Origin, debe coincidir
exactamente con el Host y puerto de esa solicitud. Docker traduce el puerto
publicado, por eso el servidor no lo compara con su puerto interno 8080.

## Validación y empaquetado

Desde la raíz del proyecto, sin Docker:

```text
python tests/python-runtime.py -v
python tests/python-runtime-proxy.py -v
python tests/python-runtime-build.py -v
```

Los tests HTTP abren sockets reales de loopback y usan SQLite real. El nombre
con guion no funciona con el descubrimiento automático de `unittest`: ejecutar
los archivos directamente. El Python local puede diferir del 3.13.18 de la
imagen; la comprobación de esa imagen corresponde al CI con Docker.

Con un motor Docker local Linux amd64, versión 28 o posterior:

```text
python scripts/build-lab-runtime.py --version 0.1.0 --output-dir .local/lab-runtime
python scripts/smoke-lab-runtime.py --runtime-dir .local/lab-runtime
```

Build produce `runtime.tar.gz` con `docker image save` y gzip sin fecha, más
`manifest.json` con el ID exacto, versión, tag, tamaño y SHA-256 del gzip final.
El manifest se publica al terminar el archivo. Smoke verifica tamaño y hash
antes de `docker load`; verifica el ID cargado y levanta ambas modalidades con
sus propios objetivos internos y sidecars de destino fijo con puertos
aleatorios de loopback. Comprueba HTTP,
evaluación, bloqueo de aplicación, SQL, límites, salida a red pública bloqueada
y reinicio de sesión. Verifica que cada objetivo carezca de publicación y de
ruta de salida pública, y que solo el proxy tenga la red de acceso. Ante una
falla imprime inspecciones acotadas de estado, puertos solicitados/efectivos y
redes, sin variables de entorno. Elimina solo los IDs que creó. La carga se comprueba en
el mismo daemon del build; no afirma haber usado un daemon vacío.

El manifest de confianza se incorpora al instalador desde el artifact de la
misma ejecución de CI. Estos scripts no consultan manifests remotos ni anuncian
firmas o attestations que el runtime no verifica.
