# Campus profesional: objetivo y criterios

Meta solicitada por el usuario el 2/11/2026. Base publicada0.1.9, commit0adbcca. Audiencia inicial: alumno de cursada, Windows11Pro en este equipo (32GiB, VirtualBox7.2.22 instalado, HypervisorPresent=true), Kali en otra computadora. Horizonte diciembre2026; no se garantiza aprobar ni se equiparan contadores con certificaciones. Mantener app local Windows/Linux, perfiles privados, actualizaciones por releases públicas de main. No servidor multiusuario.

## Terminado significa

1. Las seis mejoras están integradas: diagnóstico/plan personal; prácticas Windows/Linux; desafíos/simulacros; campañas conectadas; gestión de VMs propias; inicio Hoy+búsqueda+calendario+portafolio.
2. Un principiante puede crear perfil, elegir objetivo, hacer diagnóstico, recibir siguiente tarea, resolver práctica, registrar evidencia, consultar brechas y exportar trabajo, sin perder borradores al cerrar/cambiar/importar.
3. Hay evaluación original nueva y explicación, desafíos de transferencia, criterios de evidencia, y relación con fuentes/objetivos de cinco certificaciones. La selección se identifica como tal, con brechas reales visibles.
4. Laboratorios y VMs distinguen requisitos/configurado/listo/ejecutado/revisado. No se adopta, detiene, restaura ni cambia ningún recurso ajeno.
5. Accesibilidad, errores, offline, recuperación, compatibilidad y distribución probadas. Pruebas reales declaradas por separado de fixtures; nunca afirmar VM/instalación probada sin ejecutarla.
6. Después de cerrar la primera tanda, una auditoría selecciona SEIS mejoras adicionales justificadas y se implementan. Repetir auditoría hasta no encontrar brechas críticas/importantes en el recorrido y alcance docente. Evitar crecimiento infinito de funciones sin utilidad.

## Reglas comunes

- TDD para comportamiento, pruebas focales durante trabajo, suite completa al cerrar integración. Preservar152 tests anteriores y contenido24clases/72preguntas/48tarjetas/8ejercicios/3salas/27competencias.
- `desktop/main.cjs`, preload/security y app/index integración son SOLO root. Cada módulo UI tiene CSS propio, usa tokens existentes, teclado,44px, focus/status/busy/error visibles, reducido movimiento, sin scripts inline ni red renderer. No navegar el viejo HTML file como bypass de la restricción anterior.
- Datos de nuevas funciones dentro de `profile.labs` con claves propias; schema1 y cola/revision del perfil se conservan. Entradas limitadas, no tablas enormes ni datos del host guardados automáticamente. Async siempre protege perfil esperado+epoch, incluso importación del mismo perfil.
- UMD o globals clásicos, Node builtin, sin dependencias nuevas salvo necesidad demostrada. JSON y JS contenido deben coincidir. Toda URL externa HTTPS oficial/validada. Material y preguntas originales, sin dumps.
- No instalar Docker/VirtualBox/Hyper-V/WSL, cambiar firmware/servicios/firewall del host, aceptar licencias de sistemas ni tocar VMs existentes. El usuario autoriza funcionalidades y VMs de Campus; las imágenes/ISOs con licencia se eligen desde la app y su instalación la hace el alumno.

## Contratos de integración

Módulos separados; `render(view?)` devuelve HTML; `mount(root)` enlaza al wrapper dentro de main; `dispose()` cancela timers/efectos y epochs. `render` recarga último registro sin inventar progreso.

### LearningHub / ProfessionalCore

`window.LearningHub.create({getProfileId,getProfileEpoch,getRecord,saveRecord,getStudy,getLabs,openLesson,openMission,openPractice,navigate,announce})` -> `{render(view),mount,dispose,summary}`. Vistas: `today`, `diagnostic`, `exam`, `calendar`, `review`. Root guarda `labs['professional-learning']`. `saveRecord(record,expectedProfileId,{retry:false})` conserva cola; retry explícito puede recuperar error global. `summary()` devuelve acciones/indicadores para Inicio sin modificar estado.

`src/shared/professional-core.js` UMD también CJS; reglas puras con now explícito para calificar, planificar y repasar. `src/content/learning.json/js` global `CAMPUS_LEARNING`. Diseñar al menos48 preguntas originales para8dominios (systems/windows/linux/networks/data/security/governance/response), diagnóstico24, cinco conjuntos de simulacro docentes porcert con selección reproducible, respuestas ocultas hasta entrega válida, feedback y criterios propios. Simulacro con tiempo opcional, reanudación tras cerrar sin reiniciar reloj, borradores persistentes, historial acotado20. Nada predice nota oficial.

Estado normalizado version1, settings{targetDate,weeklyMinutes,certificationId}, diagnóstico, intento activo, historial, revisión porpregunta, sesiones calendario. ISOfecha local YYYY-MM-DD sin desvíos UTC en calendario; target por defecto2026-12-15, nunca fabricar recomendaciones en fechas pasadas. Plan semanal basado en debilidades y clases/competencias pendientes; acciones concretas con motivo/minutos. Repetición espaciada simple con próximas fechas y lapsos, no falsa ciencia de exactitud. Calendar permite agregar/editar/quitar sesiones propias y ver plan. Detallar API real a root al cerrar.

### SystemPracticeHub / SystemObserver

`window.SystemPracticeHub.create({desktop,getProfileId,getRecord,saveRecord,openLesson,openMission,openVM,openMaterial,announce})` -> `{render(),mount,dispose,openPractice(id),summary()}`. Cada práctica guarda `labs['practice-'+id]`; campañas `labs['campaign-'+id]`. Callbacks `getRecord(key)`, `saveRecord(key,record,expectedProfileId,{retry:false})`.

Contenido original `src/content/system-practices.json/js` global `CAMPUS_SYSTEM_PRACTICES`: al menos10prácticas (5Windows,5Linux), cada una teoría, pasos guiados+comandos explicados, desafío sin solución inicial, rúbrica, pistas tras intento, evidencia y clases/certs. Tres campañas conectadas con4-6etapas: investigar acceso HTTP, correo/eventos/contención, datos/recuperación/informe. Vincular salas existentes donde aportan ejecución; no llamar SIEM/forense real a JSON sintético. Ofrecer práctica con propio SO sin necesidad Docker; operaciones que cambian permisos/config se realizan en carpeta/VM de práctica, nunca se ejecutan automáticamente en host.

Observador nativo `desktop/system-observer.cjs`: clase `SystemObserver({platform?,runner?,dataDir?})` -> `info()`, `observe(kind)` con allowlist `processes|services|network|events|permissions`. Solo comandos FIJOS readonly (no args libres ni rutas usuario, sin shell). Windows PowerShell absoluto sistema, NonInteractive NoProfile, output JSON campos acotados, no líneas comando/rutas ejecutables/credenciales ni contenido de mensajes de eventos. Linux lecturas /proc y herramientas readonly, fallos/permiso reducidos a unavailable. Resultado{kind,platform,observedAt,source:'real-host',rows:array<=30,columns:string[],limitations:string[],evidenceId}; cuerpo<=128KiB. `permissions` sobre sandbox creado porCampus con archivos ficticios, sin cambiar ACL host. No matar procesos ni tocar servicios/firewall. La UI dice que son datos reales del equipo, temporales; se guardan solo si alumno decide registrar síntesis.

IPC root: `observeSystem({profileId,kind})`, `systemPracticeInfo()` sinargs. No recopilación automática al abrir, no envío remoto. Root valida perfil/allowlist.

### VirtualMachineHub / VirtualMachineManager

`window.VirtualMachineHub.create({desktop,getProfileId,announce})` -> `{render,mount,dispose}`. `desktop/vm-manager.cjs` export `{VirtualMachineManager}`; constructor `{dataDir,runner?,platform?,executable?,onDiagnostic?}`. Métodos `doctor()`, `status(profileId,templateId)`, `create(profileId,templateId,{isoPath})`, `start(profileId,templateId)`, `stop(profileId,templateId)`, `snapshot(profileId,templateId)`, `restore(profileId,templateId)`. Templatesclosed `windows|linux`; memoriaWindows4096/Linux2048MiB,2CPU, discos dinámicos80/30GiB; VirtualBox7.2CLI verificado con help/doc instalada. Doctor usa ruta absoluta normal OracleWindows o PATHLinux comprobado, version y recursos; HypervisorPresent no significa firmware desactivado: no falsear diagnóstico. No listar/adoptar recursos ajenos para mostrarlos.

Crear únicamente VMnueva con UUID generado/metadata propia bajo dataDir, etiquetas extradataowner/instance/profile/template y CFG/VDI dentro del directorio verificado (sin symlinks/junctions fuera). Red interna porperfil, sinNAT/bridge/hostonly/portforward, clipboard/dragdrop/USB/sharedfolders/VRDE apagados. Preservar y revalidar contrato/propiedad antes de start/stop/snapshot/restore. `isoPath` viene SOLO de diálogo nativo root, absolute .iso file validado; no aceptar path desde renderer. No descargas/instalaciones deSO automáticas ni licencias aceptadas. Crear configura la VM; UI diferencia OS pendiente y ofrece iniciar instalador en escritorio VirtualBox. No prometer OS listo por existir definición.

Start abre GUI como pide usuario (comando CLI oculto, desktopguest visible). Stop envía ACPI, no hard poweroff automático. Snapshot inicial soloVMapagada, nombre fijo `Campus-base` registradoID. Restore solo snapshot propio yVMapagada, confirmación nativa root; conservar apuntes fueraVM. Cancelación no muta. Fallos parciales recuperables sin borrar ni adoptar discos/VMajenos; registros corruptos bloquean controles. Límites CLI/timeouts/json salida sinstderr sensible. No función borrarVM en primera tanda. UI ofrece guías oficiales ISO/licencias/prerrequisitos.

IPCroot: `vmDoctor()` sinargs; `vmStatus|vmCreate|vmStart|vmStop|vmSnapshot|vmRestore({profileId,templateId})`. vmCreate abre diálogoISO; vmRestore confirma. Escribir contratos/resultados exactos a root.

### Root: Hoy, búsqueda, calendario y portafolio

Integrar vistas sin duplicar persistencia. Inicio mantiene cursos y ofrece panelHoy/diagnóstico/próximo paso. Búsqueda global local porclases/salas/competencias/prácticas/recursos conCtrl+K, accesible, resultados y navegación directos; sin HTML sin escapar. AgendaLearningHub. Portafolio construye desde perfil guardado y fuentes propias, exporta HTML/PDF nativo con texto escapado, evidencias/resúmenes/rúbrica y brechas; no adjuntos host automáticos. PDF generado ventana sandbox sinpreload/scripts, dialogosave; prueba real de render/texto/paginación. Root garantiza migración/backup, preload/security/actions, contenido/import, pruebas integradas y distribución.

Perfil/import: root incrementa profileGeneration en adopt y LearningHub recibe getProfileEpoch. La persistencia pendiente se liga a id+generación; remontar la vista conserva estados de guardado, importar el mismo perfil invalida resultados del estado anterior.
