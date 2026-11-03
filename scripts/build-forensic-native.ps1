param([string]$OutputDirectory = '.local/forensic-native')
$ErrorActionPreference = 'Stop'
# This collector is a build tool, never shipped as a host acquisition feature.
if ($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_OS -ne 'Windows') {
    throw 'La captura nativa se permite solamente en un runner efímero de Windows de CI.'
}
$forensicOutput = [IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputDirectory))
$forensicWorkspace = [IO.Path]::GetFullPath((Get-Location).Path) + [IO.Path]::DirectorySeparatorChar
if (-not $forensicOutput.StartsWith($forensicWorkspace, [StringComparison]::OrdinalIgnoreCase)) { throw 'Salida fuera del checkout.' }
New-Item -ItemType Directory -Path $forensicOutput -Force | Out-Null
$forensicScratch = Join-Path $forensicOutput ('capture-' + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $forensicScratch | Out-Null
$utf8 = New-Object Text.UTF8Encoding($false)
$trainingExecutable = Join-Path $forensicScratch 'CampusTrainingMemory.exe'
$trainingSource = @'
using System;
using System.Text;
using System.Threading;
public class CampusTrainingMemory {
 public static void Main() {
  byte[] evidence = new byte[65536];
  byte[] marker = Encoding.UTF8.GetBytes("CAMPUS_TEST_MEMORY_CASE_2026\nCASE=alameda\nACTOR=alumno-ficticio\nHOST=training.invalid\nRESOURCE=/private/gradebook\nSESSION=TRAINING_ONLY_A91\nNO_MALWARE_NO_REAL_CREDENTIALS\n");
  for(int i=0;i<128;i++) Buffer.BlockCopy(marker,0,evidence,i*256,marker.Length);
  Console.WriteLine("CAMPUS_READY"); Console.Out.Flush();
  Thread.Sleep(300000); GC.KeepAlive(evidence);
 }
}
'@
Add-Type -TypeDefinition $trainingSource -OutputAssembly $trainingExecutable -OutputType ConsoleApplication
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class CampusDumpWriter {
 [DllImport("Dbghelp.dll", SetLastError=true)]
 public static extern bool MiniDumpWriteDump(IntPtr process, uint processId, IntPtr file, uint type, IntPtr exception, IntPtr streams, IntPtr callback);
}
'@
$start = New-Object Diagnostics.ProcessStartInfo
$start.FileName = $trainingExecutable
$start.UseShellExecute = $false
$start.CreateNoWindow = $true
$start.RedirectStandardOutput = $true
$start.WorkingDirectory = $forensicScratch
$start.EnvironmentVariables.Clear()
$start.EnvironmentVariables['SystemRoot'] = $env:SystemRoot
$start.EnvironmentVariables['WINDIR'] = $env:WINDIR
$start.EnvironmentVariables['TEMP'] = $forensicScratch
$start.EnvironmentVariables['TMP'] = $forensicScratch
$trainingProcess = New-Object Diagnostics.Process
$trainingProcess.StartInfo = $start
$dumpFile = Join-Path $forensicOutput 'campus-owned-process.dmp'
try {
    if (-not $trainingProcess.Start()) { throw 'No se inició el proceso propio.' }
    $ready = $trainingProcess.StandardOutput.ReadLineAsync()
    if (-not $ready.Wait(15000) -or $ready.Result -ne 'CAMPUS_READY') { throw 'El proceso de prueba no confirmó su marcador.' }
    $dumpStream = [IO.File]::Open($dumpFile, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
    try {
        # Private read/write regions retain the owned byte array without copying
        # every mapped CLR image (a full-process dump exceeded the fixture budget).
        if (-not [CampusDumpWriter]::MiniDumpWriteDump($trainingProcess.Handle, [uint32]$trainingProcess.Id, $dumpStream.SafeFileHandle.DangerousGetHandle(), 512, [IntPtr]::Zero, [IntPtr]::Zero, [IntPtr]::Zero)) {
            throw ('Falló MiniDumpWriteDump: ' + [Runtime.InteropServices.Marshal]::GetLastWin32Error())
        }
    } finally { $dumpStream.Dispose() }
} finally {
    if ($trainingProcess.Id -and -not $trainingProcess.HasExited) { $trainingProcess.Kill(); $trainingProcess.WaitForExit(10000) | Out-Null }
    $trainingProcess.Dispose()
}
$dumpBytes = [IO.File]::ReadAllBytes($dumpFile)
$dumpSignature = [Text.Encoding]::ASCII.GetString($dumpBytes,0,4)
if ($dumpBytes.Length -gt 32MB -or $dumpSignature -ne 'MDMP') { throw ('Volcado invalido o fuera de presupuesto: bytes=' + $dumpBytes.Length + '; signature=' + $dumpSignature) }
if (-not [Text.Encoding]::ASCII.GetString($dumpBytes).Contains('CAMPUS_TEST_MEMORY_CASE_2026')) { throw 'No se recuperó la evidencia ficticia del volcado.' }

# Emit only controlled, fictitious records. Export this provider, never all logs.
$provider = 'CampusCiberdefensaTraining'
$eventRows = @(
    @{id=411;kind='auth-failure';actor='alumno-ficticio';src='10.78.10.10';resource='ssh'},
    @{id=411;kind='auth-failure';actor='alumno-ficticio';src='10.78.10.10';resource='ssh'},
    @{id=411;kind='auth-failure';actor='alumno-ficticio';src='10.78.10.10';resource='ssh'},
    @{id=412;kind='auth-success';actor='alumno-ficticio';src='10.78.10.10';resource='ssh'},
    @{id=413;kind='service-access';actor='alumno-ficticio';src='10.78.20.1';resource='/private/gradebook'}
)
foreach ($row in $eventRows) {
    $message = @{case_id='alameda';training=$true;event_kind=$row.kind;actor=$row.actor;source_ip=$row.src;resource=$row.resource} | ConvertTo-Json -Compress
    & "$env:SystemRoot\System32\eventcreate.exe" /L APPLICATION /SO $provider /ID $row.id /T INFORMATION /D $message | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo emitir el evento de entrenamiento.' }
}
$evtxFile = Join-Path $forensicOutput 'campus-training.evtx'
& "$env:SystemRoot\System32\wevtutil.exe" epl Application $evtxFile "/q:*[System[Provider[@Name='CampusCiberdefensaTraining']]]" /ow:true
if ($LASTEXITCODE -ne 0) { throw 'No se pudo exportar el proveedor de entrenamiento.' }
$xmlRows = & "$env:SystemRoot\System32\wevtutil.exe" qe $evtxFile /lf:true /f:xml /e:Events
if ($LASTEXITCODE -ne 0) { throw 'Windows no pudo leer el EVTX generado.' }
$xmlText = $xmlRows -join "`n"
[xml]$events = $xmlText
$eventNodes = @($events.Events.Event)
if ($eventNodes.Count -ne 5 -or @($eventNodes | Where-Object { $_.System.Provider.Name -ne $provider }).Count -ne 0) { throw 'El EVTX contiene un alcance inesperado.' }
[IO.File]::WriteAllText((Join-Path $forensicOutput 'campus-training.xml'), $xmlText, $utf8)
$evtxBytes = [IO.File]::ReadAllBytes($evtxFile)
if ([Text.Encoding]::ASCII.GetString($evtxBytes,0,8) -ne "ElfFile`0" -or $evtxBytes.Length -gt 4MB) { throw 'Cabecera EVTX inválida.' }
$readme = @'
CASO ALAMEDA — EVIDENCIA NATIVA PROPIA, SIN MALWARE

campus-owned-process.dmp: captura real de un proceso C# creado exclusivamente
en un runner efímero Windows de CI. Es un minidump de proceso con regiones
privadas de lectura/escritura, no una imagen de RAM del sistema. Usar WinDbg o un lector minidump;
Volatility no debe suponerse compatible con este formato. Buscar el marcador
CAMPUS_TEST_MEMORY_CASE_2026 y justificar qué puede y qué no puede inferirse.

campus-training.evtx: cinco eventos nativos de Application del proveedor propio
CampusCiberdefensaTraining; acciones y direcciones ficticias. No son eventos
Security 4624/4625 ni prueba de una intrusión. Windows emitió y exportó los
registros de un escenario de entrenamiento. Abrir con Visor de eventos o
wevtutil qe campus-training.evtx /lf:true /f:xml. campus-training.xml contiene
la exportación XML exacta para lectura y normalización en Linux.

Verificar SHA256 en manifest.json antes de trabajar sobre una copia. Registrar
fecha, herramienta, hashes y límites. Las fechas de captura pertenecen al build
y no constituyen una cronología histórica de un incidente real.

Fuentes técnicas:
https://learn.microsoft.com/en-us/windows/win32/api/minidumpapiset/nf-minidumpapiset-minidumpwritedump
https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/wevtutil
'@
[IO.File]::WriteAllText((Join-Path $forensicOutput 'LEER-PRIMERO.txt'),$readme,$utf8)
$descriptions = @{
    'campus-owned-process.dmp' = 'captured-owned-process'
    'campus-training.evtx' = 'captured-windows-events'
    'campus-training.xml' = 'normalized-windows-export'
    'LEER-PRIMERO.txt' = 'training-guide'
}
$files = @()
foreach ($name in @('campus-owned-process.dmp','campus-training.evtx','campus-training.xml','LEER-PRIMERO.txt')) {
    $item = Get-Item -LiteralPath (Join-Path $forensicOutput $name)
    $files += @{name=$name;bytes=$item.Length;sha256=(Get-FileHash -LiteralPath $item.FullName -Algorithm SHA256).Hash.ToLowerInvariant();provenance=$descriptions[$name]}
}
$manifest = @{version=1;caseId='alameda';generator='build-forensic-native-v1';scope='owned-process-and-provider-only';environment='ephemeral-windows-ci';capturedAt=[DateTime]::UtcNow.ToString('o');files=$files}
[IO.File]::WriteAllText((Join-Path $forensicOutput 'manifest.json'),($manifest | ConvertTo-Json -Depth 8),$utf8)
$bundleFiles = @($files | ForEach-Object { Join-Path $forensicOutput $_.name }) + @(Join-Path $forensicOutput 'manifest.json')
Compress-Archive -LiteralPath $bundleFiles -DestinationPath (Join-Path $forensicOutput 'forensic-native.zip') -CompressionLevel Optimal
$bundle = Get-Item -LiteralPath (Join-Path $forensicOutput 'forensic-native.zip')
$bundleManifest = @{version=1;file='forensic-native.zip';bytes=$bundle.Length;sha256=(Get-FileHash -LiteralPath $bundle.FullName -Algorithm SHA256).Hash.ToLowerInvariant();caseId='alameda';environment='ephemeral-windows-ci'}
[IO.File]::WriteAllText((Join-Path $forensicOutput 'bundle-manifest.json'),($bundleManifest | ConvertTo-Json),$utf8)
# Only a verified, newly created scratch child directory can be removed.
$resolvedScratch = (Get-Item -LiteralPath $forensicScratch).FullName
if (-not $resolvedScratch.StartsWith($forensicOutput + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase) -or (Get-Item -LiteralPath $forensicScratch).Attributes.HasFlag([IO.FileAttributes]::ReparsePoint)) { throw 'Scratch inseguro; se conserva.' }
Remove-Item -LiteralPath $resolvedScratch -Recurse -Force
Write-Output ('Native forensic fixture verified: 5 EVTX events; owned-process MDMP; ZIP ' + $bundle.Length + ' bytes.')
