const test=require('node:test'),assert=require('node:assert/strict');const fs=require('node:fs'),path=require('node:path');
test('native forensic acquisition is confined to ephemeral CI and targets a newly spawned training process',()=>{
 const script=fs.readFileSync(path.join(__dirname,'../scripts/build-forensic-native.ps1'),'utf8');
 assert.match(script,/GITHUB_ACTIONS/);assert.match(script,/throw ['"]La captura nativa/);
 assert.match(script,/MiniDumpWriteDump/);assert.match(script,/ProcessStartInfo/);assert.match(script,/EnvironmentVariables\.Clear\(\)/);
 assert.match(script,/CampusCiberdefensaTraining/);assert.match(script,/captured-owned-process/);assert.match(script,/captured-windows-events/);
 assert.doesNotMatch(script,/Get-Process|Get-WinEvent|Get-EventLog|lsass|procdump/i);
});
