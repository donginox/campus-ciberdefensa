#!/usr/bin/env bash
# Campus guest-only preparation, reviewed manual use. Never run on the host.
set -euo pipefail
manifest=${1:?Uso: sudo bash topology-linux.sh manifest.json router|server}
role=${2:?Falta router o server}
[[ "$role" == router || "$role" == server ]] || { echo 'Rol no permitido'; exit 1; }
command -v python3 >/dev/null || { echo 'Falta Python 3. PreparÃ¡ dependencias offline antes de continuar.'; exit 1; }
# Python validates input and observed DMI/MAC before any account/network/file mutation.
mapfile -t identity < <(python3 - "$manifest" "$role" <<'PY'
import json,sys,re,pathlib,uuid
try:
 p=pathlib.Path(sys.argv[1]); assert p.stat().st_size < 65536
 m=json.loads(p.read_text()); role=sys.argv[2]
 assert m['format']=='campus-topology-guest-kit' and m['version']==1
 n=[n for n in m['nodes'] if n['nodeId']==role]; assert len(n)==1; n=n[0]
 expected=str(uuid.UUID(n['uuid'])).lower()
 assert pathlib.Path('/sys/class/dmi/id/product_name').read_text().strip()=='VirtualBox'
 assert pathlib.Path('/sys/class/dmi/id/product_uuid').read_text().strip().lower()==expected
 addresses=['10.78.10.1/24','10.78.20.1/24'] if role=='router' else ['10.78.20.20/24']
 assert len(n['nics'])==len(addresses)
 interfaces=list(pathlib.Path('/sys/class/net').iterdir())
 assert len([i for i in interfaces if i.name!='lo'])==len(addresses)
 result=[]
 for nic,address in zip(n['nics'],addresses):
  mac=nic['mac']; assert re.fullmatch(r'080027[0-9A-F]{6}',mac) and nic['address']==address
  matching=[i for i in interfaces if i.joinpath('address').read_text().strip().replace(':','').upper()==mac]
  assert len(matching)==1 and re.fullmatch(r'[A-Za-z0-9_.-]{1,32}',matching[0].name)
  result.extend([matching[0].name,address])
 print('\n'.join(result))
except Exception:
 print('Guardia: DMI, UUID, MAC o manifiesto no coinciden; no se aplicÃ³ configuraciÃ³n.',file=sys.stderr)
 sys.exit(1)
PY
)
count=2; [[ "$role" == router ]] && count=4
[[ ${#identity[@]} -eq $count ]] || exit 1
[[ $EUID -eq 0 ]] || { echo 'Requiere root dentro de la VM verificada.'; exit 1; }
for dependency in ip nft systemctl useradd groupadd getent install; do command -v "$dependency" >/dev/null || { echo "Falta $dependency; instalalo manualmente desde medios oficiales offline."; exit 1; }; done
if [[ "$role" == router ]]; then [[ -x /usr/sbin/nologin ]] || { echo 'Falta /usr/sbin/nologin; revisá las dependencias del guest.'; exit 1; }; command -v sshd >/dev/null || { echo 'Falta OpenSSH Server. InstalaciÃ³n offline manual requerida.'; exit 1; }; fi
[[ ! -e /etc/campus-topology-v1 ]] || { echo 'Ya se preparÃ³ este nodo. RevisÃ¡ los cambios o restaurÃ¡ su base antes de repetir.'; exit 1; }
[[ ! -L /srv/campus-lab && ! -L /etc/ssh/sshd_config.d && ! -L /etc/systemd/system/campus-web.service ]] || exit 1
# Reject an existing gateway; never silently remove guest routes.
[[ -z "$(ip -4 route show default)" ]] || { echo 'Hay gateway; revisalo manualmente antes de continuar.'; exit 1; }
# Only interfaces proven by expected MAC; no default route, NAT or host settings.
ip address replace "${identity[1]}" dev "${identity[0]}"; ip link set "${identity[0]}" up
if [[ "$role" == router ]]; then
 ip address replace "${identity[3]}" dev "${identity[2]}"; ip link set "${identity[2]}" up
 printf '0\n' > /proc/sys/net/ipv4/ip_forward
 install -d -m 755 /etc/sysctl.d
 printf 'net.ipv4.ip_forward=0\n' > /etc/sysctl.d/90-campus-topology.conf
 getent passwd campus-jump >/dev/null || useradd --create-home --shell /bin/bash campus-jump
 install -d -m 755 /etc/ssh/sshd_config.d
 [[ ! -e /etc/ssh/sshd_config.d/90-campus-lab.conf ]] || { echo 'Existe configuraciÃ³n de Campus; revisiÃ³n manual requerida.'; exit 1; }
 cat > /etc/ssh/sshd_config.d/90-campus-lab.conf <<'SSH'
Match User campus-jump
    AllowTcpForwarding local
    PermitOpen 10.78.20.20:8080
    AllowAgentForwarding no
    X11Forwarding no
    PermitTunnel no
    PermitTTY no
    AllowStreamLocalForwarding no
    ForceCommand /usr/sbin/nologin
Match all
SSH
 # Never append to the global sshd_config. Confirm Include manually first.
 grep -Eq '^[[:space:]]*Include[[:space:]]+/etc/ssh/sshd_config.d/\*.conf' /etc/ssh/sshd_config || { echo 'sshd_config no incluye fragmentos: revisalo dentro del guest antes de reiniciar SSH.'; exit 1; }
 sshd -t
 nft -f - <<'NFT'
add table inet campus_lab
add chain inet campus_lab input { type filter hook input priority 0; policy accept; }
add rule inet campus_lab input iifname "lo" accept
add rule inet campus_lab input ct state established,related accept
add rule inet campus_lab input ip saddr 10.78.10.10 tcp dport 22 accept
add rule inet campus_lab input tcp dport 22 reject
NFT
 # Service names differ by distribution; do not guess and alter another service.
 echo 'AsignÃ¡ una contraseÃ±a propia: passwd campus-jump. VerificÃ¡ sshd -T y reiniciÃ¡ manualmente ssh.service o sshd.service segÃºn tu distribuciÃ³n.'
else
 getent group campus-lectores >/dev/null || groupadd campus-lectores
 getent passwd campus-web >/dev/null || useradd --system --no-create-home --shell /usr/sbin/nologin --gid campus-lectores campus-web
 install -d -m 750 -o root -g campus-lectores /srv/campus-lab
 printf 'Registro ficticio Campus: orden LAB-204, estado pendiente. Sin datos personales.\n' > /srv/campus-lab/index.html
 chown root:campus-lectores /srv/campus-lab/index.html; chmod 640 /srv/campus-lab/index.html
 [[ ! -e /etc/systemd/system/campus-web.service ]] || { echo 'El servicio existe: revisalo manualmente.'; exit 1; }
 cat > /etc/systemd/system/campus-web.service <<'UNIT'
[Unit]
Description=HTTP de datos ficticios Campus
After=network.target
[Service]
User=campus-web
Group=campus-lectores
WorkingDirectory=/srv/campus-lab
ExecStart=/usr/bin/python3 -m http.server 8080 --bind 10.78.20.20
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
[Install]
WantedBy=multi-user.target
UNIT
 [[ -x /usr/bin/python3 ]] || { echo 'La unidad requiere /usr/bin/python3. AjustÃ¡ manualmente la unidad al binario confiable del guest.'; exit 1; }
 nft -f - <<'NFT'
add table inet campus_lab
add chain inet campus_lab input { type filter hook input priority 0; policy accept; }
add rule inet campus_lab input iifname "lo" accept
add rule inet campus_lab input ct state established,related accept
add rule inet campus_lab input ip saddr 10.78.20.1 tcp dport 8080 accept
add rule inet campus_lab input tcp dport 8080 reject
NFT
 systemctl daemon-reload; systemctl enable --now campus-web.service
fi
printf '%s\n' "$role" > /etc/campus-topology-v1
printf 'ConfiguraciÃ³n aplicada. No demuestra resultados: ejecutÃ¡ la verificaciÃ³n de la guÃ­a. nft no persiste al reiniciar; reaplicÃ¡ manualmente solo la tabla campus_lab.\n'
