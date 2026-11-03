# Ejecutar manualmente SOLO dentro de la VM Windows propia.
param([Parameter(Mandatory=$true)][string]$ManifestPath)
$ErrorActionPreference='Stop'
# All identity checks precede any mutation.
if ((Get-Item -LiteralPath $ManifestPath).Length -gt 65536) { throw 'Manifiesto demasiado grande.' }
$manifest=Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
if ($manifest.format -ne 'campus-topology-guest-kit' -or $manifest.version -ne 1) { throw 'Formato no permitido.' }
$node=@($manifest.nodes | Where-Object nodeId -eq 'workstation')
if ($node.Count -ne 1) { throw 'Estación ambigua.' }
$node=$node[0]
$computer=Get-CimInstance Win32_ComputerSystem
$product=Get-CimInstance Win32_ComputerSystemProduct
if ($computer.Model -ne 'VirtualBox' -or ([guid]$product.UUID) -ne ([guid]$node.uuid)) { throw 'Guardia: DMI/UUID no coinciden con la VM propia.' }
if (@($node.nics).Count -ne 1 -or $node.nics[0].address -ne '10.78.10.10/24' -or $node.nics[0].mac -cnotmatch '^080027[0-9A-F]{6}$') { throw 'Contrato de red inválido.' }
$adapters=@(Get-NetAdapter -Physical)
$adapter=@($adapters | Where-Object { ($_.MacAddress -replace '[-:]','').ToUpperInvariant() -eq $node.nics[0].mac })
if ($adapters.Count -ne 1 -or $adapter.Count -ne 1) { throw 'Guardia: MAC o cantidad de NICs no coinciden.' }
$admin=([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (!$admin) { throw 'Abrí PowerShell como administrador dentro de esta VM verificada.' }
if (Test-Path -LiteralPath C:\CampusLab) { throw 'C:\CampusLab ya existe. Revisá la preparación anterior o restaurá la base.' }
# An existing default route is incompatible with this lab; do not remove it silently.
if (Get-NetRoute -InterfaceIndex $adapter[0].ifIndex -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue) { throw 'Hay un gateway: revisalo manualmente dentro del guest antes de continuar.' }
New-NetIPAddress -InterfaceIndex $adapter[0].ifIndex -IPAddress '10.78.10.10' -PrefixLength 24 -AddressFamily IPv4 | Out-Null
New-Item -ItemType Directory -Path C:\CampusLab | Out-Null
Set-Content -LiteralPath C:\CampusLab\registro.txt -Value 'Orden ficticia LAB-204; sin datos personales.'
# SIDs avoid localization-dependent administrator group names.
& icacls.exe C:\CampusLab /inheritance:r /grant:r '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' '*S-1-5-32-545:(OI)(CI)RX'
if ($LASTEXITCODE -ne 0) { throw 'No se verificó la ACL; revisá icacls dentro del guest.' }
if (!(Get-LocalUser -Name 'campus-alumno' -ErrorAction SilentlyContinue)) {
 $password=Read-Host 'Contraseña propia para la cuenta ficticia campus-alumno (no se exporta)' -AsSecureString
 New-LocalUser -Name 'campus-alumno' -Password $password -Description 'Cuenta ficticia de práctica Campus' | Out-Null
}
Write-Output 'Revisá ipconfig /all, usuarios, ACL y conectividad. Instalar y configurar el guest no confirma la campaña. OpenSSH Client debe estar disponible offline para el túnel; Campus no lo instala.'
