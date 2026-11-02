'use strict';
const fs=require('node:fs/promises');const path=require('node:path');const {execFile}=require('node:child_process');const {promisify}=require('node:util');const {randomUUID}=require('node:crypto');
const run=promisify(execFile),MAX_BYTES=128*1024,MAX_ROWS=30;
const KINDS=Object.freeze(['processes','services','network','events','permissions']);
const WINDOWS={
 processes:{columns:['Id','ProcessName','CPU','WorkingSet64'],script:'Get-Process | Select-Object -First 30 Id,ProcessName,CPU,WorkingSet64'},
 services:{columns:['Name','Status','StartType'],script:'Get-Service | Select-Object -First 30 Name,@{n="Status";e={$_.Status.ToString()}},@{n="StartType";e={$_.StartType.ToString()}}'},
 network:{columns:['LocalAddress','LocalPort','State'],script:'Get-NetTCPConnection | Select-Object -First 30 LocalAddress,LocalPort,@{n="State";e={$_.State.ToString()}}'},
 events:{columns:['Id','Level','ProviderName','TimeCreated'],script:'Get-WinEvent -LogName System -MaxEvents 30 | Select-Object Id,Level,ProviderName,@{n="TimeCreated";e={$_.TimeCreated.ToUniversalTime().ToString("o")}}'},
 permissions:{columns:['Name','Identity','Rights','Type','Inherited']}
};
const LINUX={
 processes:{columns:['Pid','Name','CpuPercent','MemoryPercent'],exe:'/usr/bin/ps',args:['-eo','pid=,comm=,pcpu=,pmem=','--sort=pid']},
 services:{columns:['Unit','Load','Active','Sub'],exe:'/usr/bin/systemctl',args:['list-units','--type=service','--all','--no-pager','--plain','--no-legend']},
 network:{columns:['Protocol','State','LocalAddress'],exe:'/usr/bin/ss',args:['-H','-lntu']},
 events:{columns:['__REALTIME_TIMESTAMP','PRIORITY','SYSLOG_IDENTIFIER','_SYSTEMD_UNIT'],exe:'/usr/bin/journalctl',args:['--no-pager','-n','30','-o','json','--output-fields=__REALTIME_TIMESTAMP,PRIORITY,SYSLOG_IDENTIFIER,_SYSTEMD_UNIT']},
 permissions:{columns:['Name','Mode','Uid','Gid']}
};
const clean=value=>typeof value==='number'&&Number.isFinite(value)?value:typeof value==='boolean'?value:typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,160):'';
function jsonRows(text){const parsed=JSON.parse(text);return Array.isArray(parsed)?parsed:parsed&&typeof parsed==='object'?[parsed]:[]}
function linuxRows(kind,text){
 if(kind==='events')return text.trim().split(/\r?\n/).filter(Boolean).slice(0,MAX_ROWS).map(line=>JSON.parse(line));
 return text.split(/\r?\n/).filter(line=>line.trim()).slice(0,MAX_ROWS).map(line=>{
  if(kind==='processes'){const fields=line.match(/^\s*(\d+)\s+(.+?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s*$/);if(!fields)throw Error('invalid process fields');return {Pid:Number(fields[1]),Name:fields[2],CpuPercent:Number(fields[3]),MemoryPercent:Number(fields[4])}}
  const cells=line.trim().split(/\s+/);
  if(kind==='services')return {Unit:cells[0],Load:cells[1],Active:cells[2],Sub:cells[3]};
  return {Protocol:cells[0],State:cells[1],LocalAddress:cells[4]};
 });
}
class SystemObserver{
 constructor({platform=process.platform,runner=run,dataDir}={}){this.platform=platform;this.runner=runner;this.dataDir=dataDir}
 info(){return {platform:this.platform,kinds:[...KINDS],source:'real-host',maxRows:MAX_ROWS,maxBytes:MAX_BYTES,available:['win32','linux'].includes(this.platform),privacy:'Datos reales del equipo, temporales y locales. No se guardan automáticamente. Sin argumentos de procesos ni mensajes de eventos.'}}
 async sandbox(){
  if(!this.dataDir||!path.isAbsolute(this.dataDir))throw Error('sandbox unavailable');
  // Refuse links in every existing parent, including Windows junctions.
  const absolute=path.resolve(this.dataDir);let cursor=path.parse(absolute).root;
  for(const part of absolute.slice(cursor.length).split(path.sep).filter(Boolean)){cursor=path.join(cursor,part);const stat=await fs.lstat(cursor);if(stat.isSymbolicLink()||!stat.isDirectory())throw Error('unsafe sandbox parent')}
  const dir=path.join(absolute,'system-practice-sandbox');await fs.mkdir(dir,{recursive:true});const stat=await fs.lstat(dir);if(stat.isSymbolicLink()||!stat.isDirectory())throw Error('unsafe sandbox');
  const file=path.join(dir,'evidence-example.txt');try{await fs.writeFile(file,'Datos ficticios de práctica Campus.\n',{flag:'wx'})}catch(error){if(error.code!=='EEXIST')throw error}
  const entry=await fs.lstat(file);if(entry.isSymbolicLink()||!entry.isFile()||entry.nlink!==1)throw Error('unsafe sandbox file');return file;
 }
 async observe(kind){
  if(typeof kind!=='string'||!KINDS.includes(kind))throw new Error('Tipo de observación no permitido.');
  const definition=this.platform==='win32'?WINDOWS[kind]:LINUX[kind];
  const result={kind,platform:this.platform,observedAt:new Date().toISOString(),source:'real-host',state:'unavailable',rows:[],columns:[...definition.columns],limitations:['Muestra local de hasta 30 filas; puede omitir actividad, cambiar entre lecturas y requerir permisos. No demuestra ausencia de incidentes.'],evidenceId:randomUUID()};
  try{
   if(!['win32','linux'].includes(this.platform))throw Error('platform unavailable');
   let rows;
   if(kind==='permissions'&&this.platform==='linux'){const file=await this.sandbox(),stat=await fs.stat(file);rows=[{Name:'evidence-example.txt',Mode:(stat.mode&0o777).toString(8),Uid:stat.uid,Gid:stat.gid}]}
   else if(this.platform==='win32'){
    let script=definition.script;
    if(kind==='permissions'){const file=await this.sandbox();const literal=file.replace(/'/g,"''");script=`(Get-Acl -LiteralPath '${literal}').Access | Select-Object -First 30 @{n="Name";e={"evidence-example.txt"}},@{n="Identity";e={$_.IdentityReference.ToString()}},@{n="Rights";e={$_.FileSystemRights.ToString()}},@{n="Type";e={$_.AccessControlType.ToString()}},@{n="Inherited";e={$_.IsInherited}}`}
    const executable='C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
    const output=await this.runner(executable,['-NoLogo','-NoProfile','-NonInteractive','-Command',`$ErrorActionPreference='Stop'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new(); @(${script}) | ConvertTo-Json -Compress -Depth 3`],{shell:false,windowsHide:true,timeout:12000,maxBuffer:MAX_BYTES,encoding:'utf8',env:{...process.env,PSModulePath:'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules'}});
    const stdout=String(output.stdout||'');if(Buffer.byteLength(stdout)>MAX_BYTES)throw Error('output limit');rows=stdout.trim()?jsonRows(stdout):[];
   }else{
    const output=await this.runner(definition.exe,[...definition.args],{shell:false,windowsHide:true,timeout:12000,maxBuffer:MAX_BYTES,encoding:'utf8',env:{...process.env,LC_ALL:'C',LANG:'C',SYSTEMD_COLORS:'0'}});
    const stdout=String(output.stdout||'');if(Buffer.byteLength(stdout)>MAX_BYTES)throw Error('output limit');rows=linuxRows(kind,stdout);
   }
   result.rows=rows.slice(0,MAX_ROWS).filter(row=>row&&typeof row==='object').map(row=>Object.fromEntries(definition.columns.map(column=>[column,clean(row[column])])));result.state='available';
   if(kind==='permissions')result.limitations.push('Solo archivo ficticio del sandbox Campus. No representa permisos de otros archivos ni prueba acceso con otra identidad.');
   if(this.platform==='linux'&&kind==='services')result.limitations.push('Requiere systemd. No describe servicios de otros gestores o contenedores.');
  }catch{result.rows=[];result.limitations.push('Observación no disponible: herramienta, permisos, formato o límite de salida. Usá la guía manual en tu SO o VM; no se elevan privilegios.');}
  return result;
 }
}
module.exports={SystemObserver};
