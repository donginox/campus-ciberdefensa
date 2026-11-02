# VMs propias de Campus

Campus crea equipos nuevos para el perfil activo. No importa, enumera, adopta, elimina ni modifica VMs anteriores. El alumno selecciona una ISO con el diálogo nativo y realiza la instalación y acepta las licencias directamente en el sistema invitado.

Una VM **configurada** tiene hardware y almacenamiento; no demuestra que exista un sistema instalado, que arrancó correctamente o que una práctica fue revisada. El botón de inicio abre el escritorio real de VirtualBox. “Solicitar apagado” envía ACPI; puede requerir apagar desde el invitado. Campus no utiliza apagado forzado.

## Requisitos y límites

- VirtualBox de la familia 7.2. Windows usa `C:\Program Files\Oracle\VirtualBox\VBoxManage.exe`; Linux resuelve un ejecutable absoluto desde un directorio absoluto de PATH. No se instala el motor, Extension Pack, Hyper-V, WSL ni se cambian servicios o firmware.
- Windows: 4096 MiB, 2 CPU, EFI/TPM 2.0, VDI dinámico hasta 80 GiB. Linux: 2048 MiB, 2 CPU, VDI dinámico hasta 30 GiB. Las necesidades del invitado y el espacio libre deben revisarse antes de instalar.
- La única red es interna, con nombre propio por instalación y perfil. Las VMs del mismo perfil pueden comunicarse. No hay NAT, puente, host-only ni puertos publicados. Elegí medios y procedimientos oficiales compatibles con instalación sin Internet; Campus no evita comprobaciones de licencia o cuenta.
- Portapapeles, arrastrar y soltar, USB, audio, VRDE y grabación están apagados. No se agregan carpetas compartidas. No usar esta función como garantía de contención de malware.
- El diagnóstico consulta versión, capacidades y memoria. Un indicador del firmware que Windows oculta al estar activo su hipervisor no prueba que la virtualización esté desactivada. El inicio real puede fallar y debe comprobarse por separado.

## Propiedad y almacenamiento privado

El constructor recibe `dataDir` de los datos privados de la aplicación, fuera del repositorio. Debe mantenerse estable entre actualizaciones:

```text
dataDir/vm-labs/registry.json                 identidad, fases y referencias
dataDir/vm-labs/virtualbox-home/              VBOX_USER_HOME por proceso
dataDir/vm-labs/Campus-<template>-<uuid>/      .vbox, system.vdi y Snapshots
```

El entorno del subproceso fija `VBOX_USER_HOME` sin cambiar el entorno del usuario ni `.VirtualBox` global. Un servidor COM de VirtualBox ya activo en Windows puede afectar la selección de configuración; Campus no lo mata ni repara archivos globales. Los UUID, etiquetas y rutas se comprueban igualmente antes de controlar un equipo.

Cada VM lleva UUID aleatorio y extradata `ar.campus.vm.owner`, `.instance`, `.profile`, `.template`. El registro no contiene credenciales ni se exporta en el portafolio. El renderer no recibe rutas privadas o salida cruda del comando. Toda mutación usa argumentos de una lista fija, sin shell. El parser de `showvminfo --machinereadable` no evalúa código y rechaza claves duplicadas y líneas ambiguas.

Antes de iniciar, apagar, tomar base o restaurarla se verifican UUID, CFG, etiquetas, memoria/CPU, red, integraciones, unidades y cadena de discos. Los discos diferenciales deben seguir dentro de la carpeta y llegar al VDI base registrado. Se rechazan symlinks y junctions en los componentes de las rutas privadas. La cola serializa operaciones de una instancia del manager; el proceso principal debe usar una única instancia.

## Base y recuperación

Se permite una base `Campus-base`, sólo con la VM en `poweroff`. Se registra su UUID y una huella estructural de sus opciones obtenidas con `snapshot showvminfo`. El parser de la salida inglesa de VirtualBox 7.2 separa campos, almacenamiento, grabación e identidad del snapshot; rechaza duplicados, formas desconocidas y datos incompletos. La huella conserva la configuración y el estado apagado, pero excluye la fecha de ese estado y la estrella que marca el snapshot actual. VirtualBox 7.2.22 puede perder la fracción de segundo de esa fecha al recargar la VM, sin cambiar su configuración.

Antes de registrar la base y antes de restaurarla se verifican también los datos guardados **dentro del snapshot**: UUID/nombre/descripción propios, CFG y carpetas privadas, memoria/CPU, red interna, audio e integraciones apagados, controlador SATA, VDI base con el UUID registrado y medio óptico autorizado. Se compara la huella sin actualizarla para aceptar cambios. Después de restaurar se vuelve a inspeccionar la VM efectiva y su cadena de discos. Huellas textuales de versiones de desarrollo anteriores no se convierten automáticamente: la restauración queda bloqueada y requiere revisión, sin adoptar otro snapshot ni editar el registro.

En EFI inicializado se reconocen `BIOS NVRAM File` y `UEFI Secure Boot`; ambos valores forman parte de la huella. El archivo NVRAM actual debe corresponder a `<nombre de VM>.nvram` dentro de su carpeta privada; puede no existir antes de inicializar el firmware. El snapshot usa una copia existente y regular en `Snapshots/YYYY-MM-DDTHH-mm-ss-nnnnnnnnnZ.nvram`, con todos los componentes de ruta libres de enlaces. Se rechazan rutas ajenas, relativas, duplicados y valores ambiguos. Secure Boot admite los valores nativos `enabled` y `disabled`, sin cambiarlos; su presencia requiere NVRAM de EFI. Una base preboot puede omitir ambos campos. Su aparición, desaparición o cambio posterior no actualiza la huella registrada ni desbloquea una base interrumpida.

El proceso principal muestra la confirmación nativa **antes** de invocar `restore`. La restauración descarta cambios del disco posteriores; apuntes y evidencias guardados en Campus quedan fuera de la VM.

Si falla una creación, permanecen el registro de intención y los archivos. Si todos los pasos terminaron pero se perdió la última respuesta, la próxima comprobación consolida la fase sólo después de verificar el contrato entero, sin repetir mutaciones. Si faltan pasos, hay configuración divergente, un registro corrupto o una base interrumpida sin identidad confirmada, se bloquean los controles. No se borran recursos para “reintentar”. Conservar una copia del directorio privado y revisar el equipo propio con asistencia; no editar identidades ni registrar otra VM como sustituto. Los fallos de inicio/apagado no impiden volver a comprobar el estado.

Esta primera versión no reanuda automáticamente pasos intermedios de creación, no borra VMs, no reinstala sistemas, no cambia la ISO ni crea múltiples bases. El tamaño del VDI es un máximo lógico, no una reserva de espacio disponible. Cancelar el diálogo ISO o la confirmación de restauración no debe invocar el manager.

## Contrato de integración

`desktop/vm-manager.cjs` exporta `VirtualMachineManager`. Constructor `{dataDir, runner?, platform?, executable?, onDiagnostic?}`; runner recibe `(absoluteExecutable, args, execFileOptions)` y devuelve `{stdout}`. Los timeouts son 30 s para consultas/configuración, 60 s para iniciar y 120 s para disco/base/restauración; salida máxima 128 KiB. `onDiagnostic` recibe sólo `{code,templateId}`.

Métodos: `doctor()`, `status(profileId,templateId)`, `create(profileId,templateId,{isoPath})`, `start`, `stop`, `snapshot`, `restore`. Los últimos cuatro reciben `(profileId,templateId)`. `templateId` admite `windows|linux`; el perfil debe ser UUID. `isoPath` debe provenir exclusivamente del diálogo nativo y ser una ruta absoluta `.iso` de archivo existente, no del renderer.

`doctor` devuelve `{ready,code,message,version?,totalMemoryMiB?,availableMemoryMiB?,limitations?,setupUrl?}`. Las operaciones devuelven `{templateId,state,code,message,osInstalled:false,canCreate,canStart,canStop,canSnapshot,canRestore,snapshotId?}`. `osInstalled:false` significa que Campus no verificó una instalación; no impide usar una VM ya instalada por el alumno. Estados: `missing|configured|running|stopping|unsafe|unavailable|error`. No se deben inferir capacidades de un código de error. Para `unsafe` todas las capacidades son falsas.

`window.VirtualMachineHub.create({desktop,getProfileId,announce})` devuelve `{render,mount,dispose}`. El bridge usa `vmDoctor()` y `vmStatus|vmCreate|vmStart|vmStop|vmSnapshot|vmRestore({profileId,templateId})`. `vmCreate` abre el diálogo nativo; `vmRestore` confirma. La UI admite `{canceled:true}` y `{canceled:false,snapshot:<resultado>}`, o un resultado directo. `dispose` invalida operaciones async incluso si vuelve el mismo perfil tras importar. El principal debe revalidar perfil/época después de los diálogos.

Incluir `vm-hub.js` y `vm-hub.css`; los enlaces externos deben pasar la allowlist central. No hay selección de ruta, comandos libres o confirmación HTML en el renderer.

## Evidencia y fuentes

El 2 de noviembre de 2026 se consultaron `VBoxManage --version`, `help createvm`, `help modifyvm`, `help storageattach`, `help snapshot`, `help showmediuminfo` y `list hostinfo` de Oracle VirtualBox **7.2.22r175245** instalado. Las pruebas automáticas usan un adaptador de CLI controlado y archivos temporales reales: no equivalen a instalar o arrancar un invitado. La verificación real de creación/arranque debe registrarse aparte durante integración.

La regresión de huella incluye la forma completa capturada de `snapshot showvminfo`, con identidades y rutas temporales de prueba. También se reprodujo por lectura de dos capturas nativas que `State` pasó de una fracción `.116000000` a `.000000000`; ambas producen la misma huella estructural. Esa reproducción no ejecuta una restauración ni demuestra arranque del sistema invitado.

El fixture de Windows con EFI inicializado sigue el formato de la captura preboot y el comportamiento de NVRAM descrito por el código oficial; prueba copia a ruta de snapshot, recarga y restore con un adaptador de CLI y archivos temporales. La comprobación de las dos capturas nativas de Windows preboot conserva sus huellas anteriores. No se ejecutó un SO Windows para obtener la variante inicializada: esa compatibilidad se verificó con fuentes y fixtures, y requiere una prueba nativa aparte.

Fuentes oficiales consultadas:

- [Oracle: referencia VBoxManage 7.2](https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/vboxmanage.html), opciones, ACPI y snapshots.
- [Oracle: diagnóstico 7.2](https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/Troubleshooting.html), configuración, `VBOX_USER_HOME` y servidor COM.
- [Manual oficial de VirtualBox](https://www.virtualbox.org/manual/).
- [Oracle: emisión de los campos NVRAM y Secure Boot](https://github.com/VirtualBox/virtualbox/blob/main/src/VBox/Frontends/VBoxManage/VBoxManageInfo.cpp), [rutas de NVRAM](https://github.com/VirtualBox/virtualbox/blob/main/src/VBox/Main/src-server/MachineImpl.cpp), [copia y restauración de NVRAM en snapshots](https://github.com/VirtualBox/virtualbox/blob/main/src/VBox/Main/src-server/SnapshotImpl.cpp) y [carga condicional del almacén EFI](https://github.com/VirtualBox/virtualbox/blob/main/src/VBox/Main/src-all/NvramStoreImpl.cpp).
- [Windows 11 Enterprise: evaluación y requisitos](https://www.microsoft.com/en-us/evalcenter/evaluate-windows-11-enterprise).
- [Kali: imágenes oficiales](https://www.kali.org/get-kali/) e [instalación en VirtualBox](https://www.kali.org/docs/virtualization/install-virtualbox-guest-vm/).
