# Entornos reales locales

Pedido: aumentar realismo y acercarse a laboratorios como TryHackMe. La versión0.1.3 no levanta VMs: terminal y casos simulados, SQLite real aislado. La nueva sección debe decir exactamente qué ejecuta y qué falta.

Mantener app sin backend remoto. Primer objetivo ejecutable: OWASP Juice Shop oficial, aplicación web real vulnerable dentro de contenedor Linux, gestionada mediante Docker local. Un contenedor no es una VM y la red interna de Docker no se presenta como aislamiento absoluto del host. No instalar Docker, aceptar licencias ni alterar Hyper-V/WSL durante la actualización del campus.

El entorno de desarrollo no tiene Docker disponible. Kali se utiliza en otra computadora: ejecutar Campus Linux y el objetivo en ese equipo es la primera ruta. No se automatizan instalaciones de motores ni cambios en VMs personales.

## API y propiedad

Manager: desktop/real-labs.cjs y tests/real-labs-manager.test.cjs. Exportar RealLabManager({dataDir, runner?, platform?}), methods async doctor(), status(profileId), start(profileId), stop(profileId), reset(profileId). doctor/status datos seguros, no proceso arbitrario. runner seam de proceso para tests es función (exe,args,options)->Promise<{stdout,stderr?}>; defaults child_process.execFile, shellfalse, windowshide true, maxBuffer limitado, timeout. status snapshot {id:'juice-shop',state:'missing'|'unavailable'|'stopped'|'running'|'starting'|'unsafe'|'error',message,url?,engine?,imageVersion:'20.3.0'}. doctor {ready,code,message,version?,setupUrl:'https://docs.docker.com/desktop/setup/install/windows-install/'} adaptable Linux.

Imagen inmutable verificada: bkimminich/juice-shop@sha256:cea5a4af4aacee498c491491af0408934ec81d004035c0a02ef3e54395e3bf27 (v20.3.0).

Recursos por perfil UUID y propiedad por instanceId aleatorio persistente dentro dataDir. Nombres derivados de UUID, etiquetas ar.campus.ciberdefensa.owner / instance / profile / lab. Contexto Docker solo local(npipe/unix) y daemon Linux>=28. Rechazar DOCKER_HOST remoto, contexts tcp/ssh y otros endpoints; usar --context explícito y entorno limpio para todas las operaciones. No montar rutas/volúmenes del host ni docker.sock. Red bridge interna propia. Publicar solamente3000/tcp en127.0.0.1 con hostport dinámico. Limitar CPU1/mem768m/PIDs256 y capabilities; no usar privileged ni hostnetwork. Capa writable propia permitida por necesidad JuiceShop; no simular read-only sin comprobar la imagen.

Antes de reutilizar, start,stop,reset o abrir: inspect y verificar labels+image exacta+red bridge interna propiedad+bind localhost/sin extras+no mounts/privileged/extra caps/host pid/ipc. Colisiones ajenas o recursos modificados se reportan unsafe y no se alteran. reset elimina solo contenedor propio validado, pierde estado del objetivo; recrea después. Nada de prune ni operaciones globales. No parar VMs/contenedores ajenos. Serializar operaciones para evitar carreras. Fallos informados sin perder progreso del campus.

UI: src/renderer/real-environments.js y real-environments.css, tests/ui-real-environments.test.cjs. Exportar window.RealEnvironments.create({desktop,getProfileId,escape,announce}) -> {render(),mount(root),dispose()}. Módulo autónomo con eventos delegados propios, no editar app.js/style.css/index.html (root integra). render devuelve sección con h1 y status, botones comprobar/iniciar/abrir/detener/restablecer; mount engancha solo su root, estado de proceso con aria-live, botones deshabilitados durante operaciones, errores persistentes y foco. Usar snapshot del backend; sin anunciar VM real cuando solo hay Docker o no hay motor. Llamar APIsdesktopverabajo. El backend abre siempre URL loopback propiedad; renderer no pasa URLs. Reset tiene confirmación nativa antes de perder estado. Guía conecta Windows-host localhost vs Kali-guest: localhost de Kali no es Windows. En red privada VMs usar Internal Network/host-only sin bridged ni NAT en objetivos. Referencias oficiales y externos reales con HTTPS, cuenta necesaria cuando corresponda, sin soluciones.

Root: desktop/main.cjs/preload.cjs/security.cjs,src/renderer/app.js/index.html,docs, integración y release.

Puente nativo nuevo: realLabDoctor()sinargs, realLabStatus(profileId), startRealLab(profileId), stopRealLab(profileId), resetRealLab(profileId), openRealLab(profileId). profileId validado y existente en store antes managerops. resetRealLab pide confirmación dialog nativo primero y devuelve {canceled,snapshot?}; no doble popupenUI. openRealLab status revalida dueño y URL127.0.0.1 puerto2000..65535; shell.openExternal solo ese destino. Helpers existentescontinúanHTTPSestricto. No comandos ni imagen/paths arbitrarios desde IPC.

Cerrar campus no borra el contenedor. Mostrar que el objetivo puede seguir encendido hasta Detener y que se conserva el estado al parar; al reiniciar se pierde solo el objetivo. No añadir cleanup destructivo global al cerrar. Puerto interno no da acceso directo desde KaliVM; no mentir que sí.

TDD de args/ownership/collisions/remote contexts/oldDocker/nohostmounts/resetcancel y estadosUI. SinDockerinstalado: no afirmar pruebas live del objetivo; tests de controlador y proceso por boundary runner, y doctor real del host se reportan separados. Docker/VM setup permanece acción explícita del usuario. External labs sirven de alternativa real inmediata.
