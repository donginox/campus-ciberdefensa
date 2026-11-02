# Plan de campus profesional

Spec vinculante: docs/professional-campus-spec.md. Base0adbcca; rama feat/professional-campus. No presupuestotokens solicitado. Autorización de repo público, push/main/release y actualizaciones persiste; no pedir de nuevo. Implementar primero tanda6 y luego auditar para elegir6más antes de declarar completo.

## Task 1: Motor y experiencia de aprendizaje personal

Leer spec secciónLearningHub/ProfessionalCore. Ownership: src/shared/professional-core.js, src/content/learning.json/js, src/renderer/learning-hub.js/css y tests/professional-core.test.cjs,tests/ui-learning.test.cjs. TDD,48preguntas originales, diagnóstico24, plan diario/semanal,5simulacros docentes, calendario y repaso espaciado. No tocar app/index/main/preload/security. Interfaz exacta spec, coordinar por mensajes y avisar API alroot. Tests focales y selfreview, no commit, no subagents. Root hace review e integración.

## Task 2: Prácticas reales Windows/Linux y campañas

Leer spec SystemPracticeHub/SystemObserver. Ownership: desktop/system-observer.cjs, src/content/system-practices.json/js, src/renderer/system-practice-hub.js/css y tests/system-observer.test.cjs,tests/ui-system-practice.test.cjs. TDD observerreadonlyconcomandosfijos y límites/privacidad,10prácticas originales y3campañas conectadas. Root integra IPC/perfil yportfolio. No tocar archivosdeotrosagentes/app/main/preload/security. Tests Windows realread-only si corresponde, Linuxfixtures y CI después. No ejecutar comandos mutantes de alumno en host. No commit, no subagents; reportar contrato y límites.

## Task 3: Gestión segura de VMs propias

Leer spec VirtualMachineHub/Manager. Ownership: desktop/vm-manager.cjs, src/renderer/vm-hub.js/css, tests/vm-manager.test.cjs,tests/ui-vm-hub.test.cjs,docs/vm-labs.md. TDD closedVirtualBoxprovider, creatorownVM, ISOselectednative, GUIstart, ACPIstop,snapshot/restore, robustownershippartialfailure. HostWindows VBox7.2.22 en C:/Program Files/Oracle/VirtualBox/VBoxManage.exe. Leer --help/docinstalada y fuentesOracle. No instalar/alterarhipervisor ni VMs existentes. Root integraISOdialogyconfirmaciónIPC. No commit, no subagents. Rootreview y prueba real aislada si posible.

## Task 4: Integración, Inicio y búsqueda global

Root integra APIs3módulos, seguridad/IPC/actions, vistas/nav, callbacks scopedporperfil concola revision, debounce deinputsiapropiado sinperderflushalclose. IniciopanelHoy, búsquedaCtrlK accesible en todaapp. Pruebasintegradas de diagnóstico→plan→práctica→evidencia→retomar, perfiles/import/errores. Mantenercompatibilidad0.1.9.

## Task 5: Portafolio y verificación primera tanda

Root export HTML/PDF escapado desdeperfil guardado, fuente propia/alcance y evidencias. PruebasPDFreal, smokeElectron y a11ycolor/layout. Review por tarea yreviewconjuntorango. Ledger conresultados/limitaciones. No anunciarVMdesktopprobada sinprueba real. No publicarhasta checks críticos verdes.

## Task 6: Auditoría y siguiente tanda de seis mejoras

Al terminarprimerasseisfunciones, auditarspeccriterios/UX/pedagogía/robustez; documentar6brechas de másvalor eimplementar siguienteplan antescompletar. Iterar hasta nohaber Critical/Important dentroalcance. Mantenerdato privacidad y sinbackend, no añadirfunciones decorativas por completar números. CerrarconQA Windows/LinuxDocker+VMsegúncapacidad, distribuciónGitHub, updater y userguía.
