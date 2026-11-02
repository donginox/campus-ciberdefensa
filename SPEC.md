# Campus Ciberdefensa · primera aplicación de escritorio

La instrucción más reciente pide trabajar SIN servidor. Entregar una aplicación Windows instalable y funcional, local y sin cuenta obligatoria; el servidor multiusuario queda como evolución, no se simula una sincronización online. Repositorio público autorizado: https://github.com/donginox/campus-ciberdefensa, rama main. Datos de perfiles fuera de Git y fuera del directorio de instalación. No distribuir tokens ni progreso del creador.

La UI universitaria utiliza azul institucional, crema, borgoña y oro; identidad propia, no representa oficialmente a UNDEF. Conservar 24 clases, 72 preguntas, 48 tarjetas, final y roadmap de cinco certificaciones. Laboratorios propios interactivos offline, diferenciando simulación, ejecución SQL real aislada y prácticas guiadas en el equipo. Nunca ejecutar comandos arbitrarios del alumno en el SO anfitrión.

## Contratos entre tareas

Contenido en src/content/campus.json y content.js (window.CAMPUS_CONTENT). Núcleo UMD en src/shared/study-core.js y CJS equivalente. Materiales incluidos en assets/materials; la lista permitida es src/content/materials-manifest.json. Perfiles locales no equivalen a autenticación ni permisos entre personas del mismo equipo.

window.campusDesktop es la única interfaz del renderer al escritorio. Métodos async:

- getAppInfo() -> {version, platform, packaged, repository, updatesEnabled}
- listProfiles() -> [{id,name,updatedAt}]
- getActiveProfile() -> record|null
- createProfile(name) -> record (también lo activa)
- selectProfile(id) -> record (actualiza activo)
- renameProfile({id,name}) -> record
- saveProfile({id,expectedRevision,study,labs}) -> record; conflicto rechaza con mensaje/código. study se valida con StudyCore; labs es objeto de datos JSON sin claves peligrosas, máximo1MB. Nunca truncar ni reemplazar silenciosamente un archivo corrupto.
- exportBackup(id) -> {canceled:boolean}; diálogo nativo; formato nuevo app=campus-ciberdefensa-desktop/version=1, perfil sin ids locales. importBackup(id) acepta ese formato o copia vieja academia-ciberdefensa/version1. UI confirma reemplazo antes de llamar; devuelve {canceled,profile?}.
- openMaterial(relative) -> {opened:true}; solo lista permitida, ventana secundaria sin preload ni Node. exportMaterial(relative) -> {canceled}; diálogo nativo. No rutas arbitrarias del renderer.
- getSystemLabInfo() -> {platform,release,cpuCount,totalMemoryGiB}; sin hostname, cuentas, interfaces ni seriales.
- checkForUpdates() -> snapshot; installUpdate() -> bool.
- onUpdateStatus(callback) -> unsubscribe, snapshot {status,version?,percent?,message}; solo datos, nunca evento IPC crudo.
- onBeforeClose(callback) -> unsubscribe; UI espera su cola de guardado y llama readyToClose(). Sin debounce que pueda perder texto al cerrar. Si falla el guardado, informar y no confirmar cierre sin decisión.
- readyToClose() -> void.
- runSqlLab({query,taskId}) -> {columns,rows,rowCount,truncated,elapsedMs}; worker sql.js aislado y descartable, semilla fija de datos sintéticos, límite de consulta/filas/tiempo, sin archivos del host. Si labs agent implementa motor async, escritorio lo invoca.

record = {id,name,createdAt,updatedAt,revision,study,labs}. study conserva schema1. Un perfil no existe por defecto: primera pantalla permite crear uno; importar progreso anterior requiere que el alumno elija su copia (nunca se inspecciona el almacenamiento del navegador).

## Archivos y propiedad

Agente desktop: desktop/**, electron-builder.yml, .github/workflows/**, tests/desktop*.test.cjs, tests/store*.test.cjs, docs/updates.md. Root es dueño package.json/lock, scripts/**, README, contenido y empaquetado.
Agente labs: src/labs/**, tests/labs*.test.cjs. Exportar API CJS/UMD LabEngine con catalog, startLab(id), runCommand(state,input) para simuladores puros, evaluate(id,answers), queryLog(filter), crypto/text si aplica. SQL worker en src/labs/sql-worker.cjs invocable por desktop; SQL API de worker se coordina por mensajes.
Agente frontend: src/renderer/**, tests/ui*.test.cjs. Leer implementaciones anteriores en ../work/study-app para reutilizar lectura/roadmap sin romper accesibilidad. Fuente libre de fetches remotos; todo empaquetado. Integrar laboratorio con LabEngine global src/labs/lab-engine.js y desktop.runSqlLab. Consultar catalog de labs cuando esté disponible.

## Actualización y publicación

electron45.2.1, builder26.18.0 y updater6.8.11 estables verificados. Instalador NSIS por usuario y AppImage Linux en CI. Actualización GitHub pública, comprobación al abrir sin bloquear funcionamiento offline, descarga automática, instalación al cerrar o reiniciar explícitamente después de guardar. No git pull ni ejecución de código de una rama en cliente. Usar release versionada y verificación estándar de hashes/HTTPS del updater. Windows firma preparada con secrets, sin inventar certificado. Si no hay firma, documentar instalador sin firma. Nunca incrustar GH_TOKEN.

CI push main: probar y compilar Windows+Linux, crear una versión semver creciente con base0.1 y github.run_number; publicar release después de subir todos los instaladores y manifiestos. Código de feed owner donginox/repo campus-ciberdefensa. La actualización solo se habilita en instalación empaquetada, no en desarrollo. Build local0.1.0 puede recibir primer release0.1.1. Entregar instalador real verificado y repo conectado.

TDD en comportamientos de datos, IPC, labs y UI. Revisiones de seguridad y evidencia antes de completar. Sin navegador/servidor para sortear la restricción previa de navegación file; QA con Node/JSDOM y runtime propio cuando sea pertinente, sin afirmar validación visual.
