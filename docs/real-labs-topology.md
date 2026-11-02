# Topologías para práctica real

Diseño docente propio, revisado el 2 de noviembre de 2026. La aplicación administra Juice Shop en Docker local; las VMs se preparan aparte. Esta documentación no instala ni descarga software.

## Primer paso: navegador y objetivo en el mismo sistema

```text
Windows: navegador → 127.0.0.1:puerto asignado → Docker → Juice Shop
Kali VM: 127.0.0.1 → la propia Kali, no Windows
```

Usá la URL del campus. El contenedor publica en loopback; no lo amplíes a `0.0.0.0` para usar Kali. Docker interno limita conexiones externas, pero permite comunicación con su gateway y ciertos servicios del host: no ofrece aislamiento absoluto. [Docker: puertos](https://docs.docker.com/engine/network/port-publishing/), [red interna](https://docs.docker.com/reference/cli/docker/network/create/#network-internal-mode---internal).

## Paso posterior: dos VMs en Internal Network

```text
Internal Network «campus-lab»
Kali 10.77.0.10/24 ←→ Objetivo 10.77.0.20/24
Sin gateway, DNS ni salida a Internet
```

1. Identificá ambas VMs y sus discos. Si una está inaccesible o no conocés su ubicación, detené su preparación hasta identificarla; no la repares a ciegas. Para Kali, consultá su [guía oficial de VirtualBox](https://www.kali.org/docs/virtualization/import-premade-virtualbox/).
2. Prepará únicamente software y objetivos de laboratorio autorizados. Si necesitás NAT para instalación o actualización inicial, usalo solo durante esa preparación, sin ejecutar prácticas contra el objetivo. Apagá las VMs y quitá NAT antes de continuar.
3. Con ambas apagadas, en Configuración → Red, dejá una sola interfaz habilitada por VM, en **Internal Network**, con el mismo nombre `campus-lab`. Deshabilitá todas las demás, incluidas las adicionales configuradas por CLI. No uses Bridged, NAT Network, reenvíos de puertos ni rutas hacia la LAN.
4. Internal Network no trae DHCP configurado por defecto. Este montaje usa IP estática dentro de cada invitado: Kali `10.77.0.10`, objetivo `10.77.0.20`, máscara `255.255.255.0`; gateway y DNS vacíos. Confirmá que el segmento no se reutiliza en otras redes del laboratorio. [Oracle: redes virtuales](https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/networkingdetails.html).
5. En el objetivo deshabilitá carpetas compartidas del host, portapapeles compartido, arrastrar y soltar y dispositivos del host innecesarios. Verificá por consola sus direcciones, servicios y ausencia de ruta por defecto. En Kali revisá `ip -br address` e `ip route`.
6. Confirmá visualmente que ambos adaptadores pertenecen a la misma red interna y que no existe una segunda interfaz con salida. Una falla de ping no prueba aislamiento; revisá configuración y rutas. No pruebes aislamiento escaneando Internet. Host-only incluye al host y exige otro diseño; no es el modo de esta práctica.
7. Tomá snapshots de ambas VMs con la red ya aislada. Guardá la evidencia antes de restaurar: la restauración puede perder cambios y recuperar configuraciones de red previas. Volvé a revisar adaptadores tras cada restauración. [Oracle: snapshots](https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/working-with-vms.html).

El alcance es solo `10.77.0.20`, desde `10.77.0.10`, durante la sesión y sobre servicios acordados. Guardá hora, operaciones permitidas, evidencia y criterio de cierre. Al terminar apagá ambas. Conservá también un backup independiente ante pérdida del almacenamiento.
