'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const {randomUUID,createHash}=require('node:crypto');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const runFile=promisify(execFile);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OWNER='campus-ciberdefensa';
const PREFIX='ar.campus.vm.';
const TEMPLATES=Object.freeze({windows:{memory:4096,disk:81920,os:'Windows11_64'},linux:{memory:2048,disk:30720,os:'Debian_64'}});
const TOPOLOGY_TEMPLATES=Object.freeze({'topology-windows':Object.freeze({memory:4096,disk:81920,os:'Windows11_64'}),'topology-router':Object.freeze({memory:2048,disk:20480,os:'Debian_64'}),'topology-server':Object.freeze({memory:2048,disk:30720,os:'Debian_64'})});
const ALL_TEMPLATES=Object.freeze({...TEMPLATES,...TOPOLOGY_TEMPLATES});
const topology=id=>Object.hasOwn(TOPOLOGY_TEMPLATES,id);
const windows=id=>id==='windows'||id==='topology-windows';
function networks(id,base){return id==='topology-router'?[base+'-users',base+'-servers']:topology(id)?[base+(id==='topology-server'?'-servers':'-users')]:[base];}
function mac(record,n){return '080027'+digest(record.uuid+':'+n).slice(0,6).toUpperCase();}
const digest=value=>createHash('sha256').update(value).digest('hex');
const isObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value));
const isUUID=value=>typeof value==='string'&&UUID.test(value);
function fail(code='unsafe'){throw Object.assign(new Error(code),{safeCode:code});}
// VBox machine-readable output is a line format, not JavaScript or JSON. In
// particular unknown Windows backslash sequences must never become escapes.
function parseMachineReadable(output){
 if(typeof output!=='string'||Buffer.byteLength(output)>131072)fail();
 const result=Object.create(null);let recordingMarker=false;
 function quoted(s){if(!/^"(?:[^"\\]|\\.)*"$/.test(s))fail();return s.slice(1,-1).replace(/\\([\\"])/g,'$1');}
 for(const line of output.split(/\r?\n/)){if(!line.trim())continue;if(line===' rec_screen0'){if(recordingMarker)fail();recordingMarker=true;continue;}const m=line.match(/^("(?:[^"\\]|\\.)*"|[A-Za-z0-9_.()\/-]+)=(.*)$/);if(!m)fail();const key=m[1][0]==='"'?quoted(m[1]):m[1];if(['__proto__','constructor','prototype'].includes(key)||Object.hasOwn(result,key))fail();const raw=m[2];result[key]=raw[0]==='"'?quoted(raw):/^-?\d+$/.test(raw)?raw:fail();}
 return result;
}
// snapshot showvminfo has no machine-readable mode in 7.2. Its English output
// includes runtime metadata, so hashing the entire text is not a config hash.
// Parse the known sections, reject ambiguous/new shapes, and keep every config
// value in the fingerprint. Only the State timestamp and current-tree star are
// presentation metadata; the powered-off state and snapshot identity remain.
const SNAPSHOT_FIELDS=new Set(`Name|Encryption|Groups|Platform Architecture|Guest OS|UUID|Config file|Snapshot folder|Log folder|Hardware UUID|Memory size|Page Fusion|VRAM size|CPU exec cap|CPUProfile|Chipset|Firmware|Number of CPUs|HPET|PAE|Long Mode|Triple Fault Reset|APIC|X2APIC|Nested VT-x/AMD-V|CPUID overrides|Hardware Virtualization|Nested Paging|Large Pages|VT-x VPID|VT-x Unrestricted Exec.|AMD-V Virt. Vmsave/Vmload|CPUID Portability Level|Boot menu mode|Boot Device 1|Boot Device 2|Boot Device 3|Boot Device 4|ACPI|IOAPIC|BIOS APIC mode|Time offset|BIOS NVRAM File|UEFI Secure Boot|RTC|IOMMU|Paravirt. Provider|Effective Paravirt. Prov.|State|Graphics Controller|Monitor count|3D Acceleration|Teleporter Enabled|Teleporter Port|Teleporter Address|Teleporter Password|Tracing Enabled|Allow Tracing to Access VM|Tracing Configuration|Autostart Enabled|Autostart Delay|Default Frontend|VM process priority|Storage Controllers|NIC 1|NIC 2|NIC 3|NIC 4|NIC 5|NIC 6|NIC 7|NIC 8|Pointing Device|Keyboard Device|UART 1|UART 2|UART 3|UART 4|LPT 1|LPT 2|Audio|Audio playback|Audio capture|Clipboard Mode|Clipboard file transfers|Drag and drop Mode|VRDE|OHCI USB|EHCI USB|xHCI USB|USB Device Filters|Bandwidth groups|Shared folders|Recording status|Recording enabled|Recording screens`.split('|'));
function parseSnapshotDetails(output){
 if(typeof output!=='string'||Buffer.byteLength(output)>131072)fail();
 const fields=Object.create(null),storage=[],screens=Object.create(null),tree=Object.create(null),guest=Object.create(null);let section='config',screen=null,device=null;
 const add=(object,key,value)=>{if(Object.hasOwn(object,key))fail();object[key]=value;};
 for(const line of output.split(/\r?\n/)){
  if(!line.trim())continue;
  if(line==='* Snapshots:'){if(section!=='config')fail();section='snapshots';continue;}
  if(line==='* Guest:'){if(section!=='snapshots')fail();section='guest';continue;}
  if(section==='snapshots'){
   const name=line.match(/^   Name: (.+) \(UUID: ([0-9a-f-]+)\)(?: \*)?$/i),description=line.match(/^   Description: (.+)$/);
   if(name){add(tree,'name',name[1]);add(tree,'id',name[2]);}else if(description)add(tree,'description',description[1]);else fail();continue;
  }
  if(section==='guest'){const match=line.match(/^Configured memory balloon:\s+(\d+MB)$/);if(!match)fail();add(guest,'memoryBalloon',match[1]);continue;}
  const field=line.match(/^([A-Za-z0-9][A-Za-z0-9 .()\/-]*):[ \t]*(.*)$/);
  if(field){if(!SNAPSHOT_FIELDS.has(field[1]))fail();add(fields,field[1],field[2]);screen=null;device=null;continue;}
  const controller=line.match(/^#(\d+): '([^']+)', Type: ([A-Za-z0-9]+), Instance: (\d+), Ports: (\d+) \(max (\d+)\), (Bootable|Not bootable)$/);
  if(controller){if(fields['Storage Controllers']!==''||storage.length)fail();storage.push({index:controller[1],name:controller[2],type:controller[3],instance:controller[4],ports:controller[5],maxPorts:controller[6],bootable:controller[7],devices:[]});continue;}
  const attachment=line.match(/^  Port (\d+), Unit (\d+): (?:UUID: ([0-9a-f-]+)|(Empty))((?:, (?:temp eject|ejected|hot-pluggable|non-rotational \(SSD\)|discards unused blocks))*)$/i);
  if(attachment){if(storage.length!==1)fail();device={port:attachment[1],unit:attachment[2],id:attachment[3]||null,flags:attachment[5]};if(device.id&&!isUUID(device.id)||storage[0].devices.some(d=>d.port===device.port&&d.unit===device.unit))fail();storage[0].devices.push(device);continue;}
  const location=line.match(/^    Location: "([^"\r\n]+)"$/);if(location){if(!device||!device.id)fail();add(device,'location',location[1]);device=null;continue;}
  const screenHeader=line.match(/^ Screen (\d+):$/);if(screenHeader){screen=Object.create(null);add(screens,screenHeader[1],screen);continue;}
  const screenField=line.match(/^    (Enabled|ID|Record video|Record audio|Destination|File|Options|Video dimensions|Video rate|Video FPS):[ \t]*(.*)$/);if(screenField){if(!screen)fail();add(screen,screenField[1],screenField[2]);continue;}
  fail();
 }
 if(section!=='guest'||!guest.memoryBalloon||!/^powered off \(since \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{9}\)$/.test(fields.State))fail();
 fields.State='powered off';
 return{fields,storage,screens,tree,guest};
}
function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));return value;}
function inside(root,file){const rel=path.relative(root,file);return rel!==''&&!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel);}
async function noLinks(file,{missing=false}={}){
 const absolute=path.resolve(file),parsed=path.parse(absolute);let cursor=parsed.root;
 for(const part of absolute.slice(parsed.root.length).split(path.sep)){cursor=path.join(cursor,part);try{const stat=await fs.lstat(cursor);if(stat.isSymbolicLink())fail();}catch(error){if(error.code==='ENOENT'&&missing)return;throw error;}}
}
function result(templateId,state,code,message,extra={}){return{templateId,state,code,message,osInstalled:false,canCreate:false,canStart:false,canStop:false,canSnapshot:false,canRestore:false,...extra};}
class VirtualMachineManager{
 constructor({dataDir,runner=runFile,platform=process.platform,executable,onDiagnostic=()=>{},templateFamily}={}){
  if(!dataDir||!path.isAbsolute(dataDir))throw Error('dataDir must be absolute');
  if(templateFamily!==undefined&&templateFamily!=='topology-v1')throw Error('Invalid template family');this.templates=templateFamily==='topology-v1'?TOPOLOGY_TEMPLATES:TEMPLATES;this.dataDir=path.resolve(dataDir);this.root=path.join(this.dataDir,'vm-labs');this.registryFile=path.join(this.root,'registry.json');this.runner=runner;this.platform=platform;this.executable=executable||(platform==='win32'?'C:\\Program Files\\Oracle\\VirtualBox\\VBoxManage.exe':null);this.onDiagnostic=onDiagnostic;this.queue=Promise.resolve();
 }
 async executablePath(){
  if(this.executable){if(!path.isAbsolute(this.executable))fail('executable_unavailable');return this.executable;}
  if(this.platform!=='linux')fail('unsupported_platform');
  for(const directory of (process.env.PATH||'').split(path.delimiter)){if(!path.isAbsolute(directory))continue;const candidate=path.join(directory,'VBoxManage');try{await fs.access(candidate,fs.constants.X_OK);this.executable=await fs.realpath(candidate);return this.executable;}catch{}}
  fail('executable_unavailable');
 }
 async cli(args,timeout=30000){
  const executable=await this.executablePath(),privateHome=path.join(this.root,'virtualbox-home');await noLinks(privateHome,{missing:true});await fs.mkdir(privateHome,{recursive:true});await noLinks(privateHome);const reply=await this.runner(executable,args,{shell:false,windowsHide:true,timeout,maxBuffer:131072,encoding:'utf8',env:{...process.env,LC_ALL:'C',LANG:'C',VBOX_USER_HOME:privateHome}});const output=typeof reply==='string'?reply:reply.stdout||'';if(Buffer.byteLength(output)>131072)fail('output_limit');return output;
 }
 async doctor(){
  try{const version=(await this.cli(['--version'])).trim();if(!/^7\.2\.\d+r\d+$/.test(version))return{ready:false,code:'unsupported_version',message:'Campus requiere VirtualBox 7.2. Consultá la guía oficial antes de cambiar tu instalación.'};
   const host=await this.cli(['list','hostinfo']);const hardware=/Processor supports HW virtualization:\s*yes/i.test(host);const totalMemoryMiB=Math.floor(os.totalmem()/1048576),availableMemoryMiB=Math.floor(os.freemem()/1048576);
   return{ready:hardware&&totalMemoryMiB>=6144,code:hardware?'available':'virtualization_unconfirmed',version,totalMemoryMiB,availableMemoryMiB,message:hardware?'VirtualBox 7.2 disponible. El inicio del invitado todavía debe comprobarse.':'VirtualBox no pudo confirmar virtualización. La presencia de Hyper-V puede ocultar indicadores del firmware; Campus no cambia esa configuración.',limitations:['La definición de una VM no confirma que su sistema operativo esté instalado.','El rendimiento con el hipervisor de Windows activo depende del equipo.'],setupUrl:'https://www.virtualbox.org/manual/'};
  }catch(error){return{ready:false,code:error.code==='ENOENT'||error.safeCode==='executable_unavailable'?'virtualbox_missing':'engine_unavailable',message:'No se pudo comprobar VirtualBox. Revisá su instalación y volvé a intentar.',setupUrl:'https://www.virtualbox.org/manual/'};}
 }
 validate(profileId,templateId){if(!isUUID(profileId)||typeof templateId!=='string'||!Object.hasOwn(this.templates,templateId))throw Error('Invalid VM request');}
 validateRegistry(data){
  if(!isObject(data)||!['version','instance','records'].every(key=>Object.hasOwn(data,key))||Object.keys(data).some(key=>!['version','instance','records'].includes(key))||data.version!==1||!isUUID(data.instance)||!isObject(data.records))fail();
  const required=['uuid','name','folder','cfg','disk','profileId','templateId','isoPath','network','phase'];
  const optional=['diskId','snapshotId','snapshotHash','snapshotPending'];
  for(const [key,record]of Object.entries(data.records)){
   if(!isObject(record)||!required.every(field=>Object.hasOwn(record,field)&&typeof record[field]==='string')||Object.keys(record).some(field=>!required.includes(field)&&!optional.includes(field)))fail();
   if(!isUUID(record.uuid)||!isUUID(record.profileId)||record.profileId!==record.profileId.toLowerCase()||!Object.hasOwn(this.templates,record.templateId)||key!==this.key(record.profileId,record.templateId)||!['creating','configured'].includes(record.phase)||record.name!==`Campus-${record.templateId}-${record.uuid}`)fail();
   const folder=path.join(this.root,record.name);if(record.folder!==folder||record.cfg!==path.join(folder,record.name+'.vbox')||record.disk!==path.join(folder,'system.vdi')||record.network!==`campus-${data.instance}-${record.profileId}`||!path.isAbsolute(record.isoPath)||path.extname(record.isoPath).toLowerCase()!=='.iso')fail();
   // A completed VM must keep the disk identity established during creation.
   // The only phase allowed to learn its base UUID is a verified creating VM.
   if(record.phase==='configured'&&!Object.hasOwn(record,'diskId')||Object.hasOwn(record,'diskId')&&!isUUID(record.diskId))fail();
   if(Object.hasOwn(record,'snapshotPending')&&typeof record.snapshotPending!=='boolean')fail();
   const hasSnapshot=Object.hasOwn(record,'snapshotId'),hasHash=Object.hasOwn(record,'snapshotHash');
   if(hasSnapshot!==hasHash||hasSnapshot&&(!isUUID(record.snapshotId)||typeof record.snapshotHash!=='string'||!/^[a-f0-9]{64}$/.test(record.snapshotHash)))fail();
   if(record.phase==='creating'&&(hasSnapshot||Object.hasOwn(record,'snapshotPending')))fail();
  }
  return data;
 }
 async registry(){
  await noLinks(this.root,{missing:true});await fs.mkdir(this.root,{recursive:true});await noLinks(this.root);await noLinks(this.registryFile,{missing:true});
  try{const stat=await fs.stat(this.registryFile);if(stat.size>131072)fail();return this.validateRegistry(JSON.parse(await fs.readFile(this.registryFile,'utf8')));}
  catch(error){if(error.code!=='ENOENT')fail();const data={version:1,instance:randomUUID(),records:{}};await this.save(data);return data;}
 }
 async save(registry){await noLinks(this.root);await noLinks(this.registryFile,{missing:true});const temp=path.join(this.root,randomUUID()+'.tmp');await fs.writeFile(temp,JSON.stringify(registry),{flag:'wx',mode:0o600});await fs.rename(temp,this.registryFile);}
 key(profileId,templateId){return profileId.toLowerCase()+':'+templateId;}
 async locked(profileId,templateId,fn){this.validate(profileId,templateId);const next=this.queue.then(async()=>{try{return await fn();}catch(error){const unsafe=error.safeCode==='unsafe';try{this.onDiagnostic({code:unsafe?'unsafe':'operation_failed',templateId});}catch{}return result(templateId,unsafe?'unsafe':'error',unsafe?'ownership_unverified':'operation_failed',unsafe?'No se pudo verificar la propiedad o configuración completa. Se conservaron los archivos y se bloquearon más controles. Comprobá el estado; una creación parcial requiere revisión.':'La operación no se completó. Comprobá el estado antes de reintentar; no se eliminó ningún recurso.');}});this.queue=next.catch(()=>{});return next;}
 async record(profileId,templateId){const registry=await this.registry(),key=this.key(profileId,templateId);const record=Object.hasOwn(registry.records,key)?registry.records[key]:undefined;if(record)await noLinks(record.folder,{missing:true});return{registry,record};}
 async validateNvram(file,record,{snapshot=false}={}){
  if(typeof file!=='string'||!path.isAbsolute(file)||file!==path.resolve(file))fail();
  // Oracle copies snapshot firmware to a UTC timestamp file, not the live
  // <VM name>.nvram. Only these two exact storage shapes belong to this VM.
  if(snapshot){if(path.dirname(file)!==path.join(record.folder,'Snapshots')||!/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{9}Z\.nvram$/.test(path.basename(file)))fail();}
  else if(file!==path.join(record.folder,record.name+'.nvram'))fail();
  try{await noLinks(file,{missing:!snapshot});if(!(await fs.stat(file)).isFile())fail();}
  catch(error){if(error.code!=='ENOENT')throw error;if(snapshot)fail();}
 }
 async diskChain(file,record){
  let current=file;const visited=new Set();for(let depth=0;depth<8;depth++){
   const out=await this.cli(['showmediuminfo','disk',current]);
   const field=name=>{const rows=out.split(/\r?\n/).filter(line=>line.startsWith(name+':'));if(rows.length!==1)fail();return rows[0].slice(name.length+1).trim();};
   const id=field('UUID'),location=field('Location'),parent=field('Parent UUID');
   if(!isUUID(id)||visited.has(id)||!path.isAbsolute(location)||!inside(record.folder,path.resolve(location)))fail();
   if(isUUID(current)?id!==current:path.resolve(location)!==path.resolve(current))fail();
   visited.add(id);await noLinks(location);
   if(field('Storage format')!=='VDI'||field('Capacity')!==`${ALL_TEMPLATES[record.templateId].disk} MBytes`)fail();
   if(parent==='base'){
    if(field('Type')!=='normal (base)'||!/^dynamic(?: default)?$/.test(field('Format variant'))||path.resolve(location)!==record.disk||(record.phase==='configured'&&!isUUID(record.diskId))||(Object.hasOwn(record,'diskId')&&id!==record.diskId))fail();
    return id;
   }
   // Only VirtualBox differencing media inside this VM's checked Snapshots
   // directory can extend the chain; its endpoint must still be our base VDI.
   if(!isUUID(parent)||field('Type')!=='normal (differencing)'||!/^differencing(?: default)?$/.test(field('Format variant'))||!inside(path.join(record.folder,'Snapshots'),path.resolve(location)))fail();
   current=parent;
  }fail();
 }
 async inspect(profileId,templateId,{allowCreating=false}={}){
  const context=await this.record(profileId,templateId),{registry,record}=context;if(!record)return context;if(record.snapshotPending)fail();
  const info=parseMachineReadable(await this.cli(['showvminfo',record.uuid,'--machinereadable']));
  if(info.UUID!==record.uuid||info.CfgFile!==record.cfg||info.name!==record.name)fail();await noLinks(record.cfg);
  if(Object.hasOwn(info,'NvramFile'))await this.validateNvram(info.NvramFile,record);
  for(const [key,value]of Object.entries({owner:OWNER,instance:registry.instance,profile:record.profileId,template:templateId})){const out=(await this.cli(['getextradata',record.uuid,PREFIX+key])).trim();if(out!=='Value: '+value)fail();}
  if(templateId==='topology-windows'&&info.firmware!=='EFI')fail();const nets=networks(templateId,record.network);const required={memory:String(ALL_TEMPLATES[templateId].memory),cpus:'2',clipboard:'disabled',draganddrop:'disabled',usb:'off',ehci:'off',xhci:'off',vrde:'off',audio:'none',audio_in:'off',audio_out:'off'};for(let n=1;n<=8;n++){required['nic'+n]=n<=nets.length?'intnet':'none';if(n<=nets.length){required['intnet'+n]=nets[n-1];if(topology(templateId))required['macaddress'+n]=mac(record,n);}}
  for(const [key,value]of Object.entries(required))if(info[key]!==value)fail();
  for(const keys of [['clipboard_file_transfers','clipboardfiletransfers'],['teleporterenabled','teleporter'],['recording_enabled','recording']]){const values=keys.filter(key=>Object.hasOwn(info,key)).map(key=>info[key]);if(!values.length||values.some(value=>!['off','disabled'].includes(value)))fail();}
  // 7.2.22 omits NIC promiscuous/trace policy from machine-readable output.
  // Read the fixed, English detail fields as a second independent boundary.
  const details=await this.cli(['showvminfo',record.uuid,'--details']);for(let n=1;n<=nets.length;n++){const nicLines=details.split(/\r?\n/).filter(line=>line.startsWith('NIC '+n+':'));if(nicLines.length!==1||!/, Trace: off \(file: none\),/.test(nicLines[0])||!/, Promisc Policy: deny(?:,|$)/.test(nicLines[0]))fail();}if(!/^USB Device Filters:\s+<none>\s*$/m.test(details)||!/^Shared folders:\s+<none>\s*$/m.test(details))fail();
  // Absence is accepted only for optional disabled features not emitted by all
  // 7.2 builds. Their enabled forms and any unknown host attachment are denied.
  for(const [key,value]of Object.entries(info)){
   if(/^nic\d+$/.test(key)&&Number(key.slice(3))>nets.length&&value!=='none')fail();
   if(/^(SharedFolder|Forwarding|USBFilter|HostPCI)/i.test(key))fail();
   if(/^(uart[1-4]|lpt[12]|teleporter|recording|nictrace\d+|tracing-enabled|tracing-allow-vm-access|autostart-enabled)$/.test(key)&&!['off','disabled','none'].includes(value))fail();
   if(key==='clipboardfiletransfers'&&!['off','disabled'].includes(value))fail();
   if(/^storagecontrollername\d+$/.test(key)&&value!=='SATA')fail();
   if(/^.+-\d+-\d+$/.test(key)&&!/^SATA-(?:ImageUUID|IsEjected|tempeject|hot-pluggable|nonrotational|discard)-\d+-\d+$/.test(key)&&!['SATA-0-0','SATA-1-0'].includes(key)&&!['none','emptydrive'].includes(value))fail();
  }
  if(info['SATA-1-0']!==record.isoPath&&!['emptydrive','none'].includes(info['SATA-1-0']))fail();
  if(typeof info['SATA-0-0']!=='string'||!path.isAbsolute(info['SATA-0-0'])||!inside(record.folder,path.resolve(info['SATA-0-0'])))fail();
  if(typeof info.SnapFldr!=='string'||!path.isAbsolute(info.SnapFldr)||path.resolve(info.SnapFldr)!==path.join(record.folder,'Snapshots'))fail();await noLinks(info.SnapFldr,{missing:true});
  const diskId=await this.diskChain(info['SATA-0-0'],record);if(record.phase==='creating'&&!allowCreating){record.diskId=diskId;record.phase='configured';await this.save(registry);}return{...context,info,diskId};
 }
 state(templateId,context){const {record,info}=context;if(!record)return result(templateId,'missing','not_created','Todavía no hay una VM de Campus para este perfil.',{canCreate:true});const off=info.VMState==='poweroff',running=info.VMState==='running';return result(templateId,off?'configured':running?'running':'unavailable',off?'configured':running?'running':'poweroff_required',off?'VM configurada. Instalación y preparación del sistema operativo a cargo del alumno.':running?'VM en ejecución en una ventana de VirtualBox.':'Apagá la VM desde el sistema invitado para continuar.',{canStart:off,canStop:running,canSnapshot:off&&!record.snapshotId,canRestore:off&&!!record.snapshotId,snapshotId:record.snapshotId});}
 status(profileId,templateId){return this.locked(profileId,templateId,async()=>this.state(templateId,await this.inspect(profileId,templateId)));}
 create(profileId,templateId,{isoPath}={}){return this.locked(profileId,templateId,async()=>{
  const {registry,record:existing}=await this.record(profileId,templateId);if(existing)return this.state(templateId,await this.inspect(profileId,templateId));
  if(typeof isoPath!=='string'||!path.isAbsolute(isoPath)||path.extname(isoPath).toLowerCase()!=='.iso')fail('invalid_iso');const iso=await fs.stat(isoPath);if(!iso.isFile()||iso.size<1)fail('invalid_iso');isoPath=await fs.realpath(isoPath);
  const doctor=await this.doctor();if(!doctor.ready)return result(templateId,'unavailable',doctor.code,doctor.message);
  const uuid=randomUUID(),name=`Campus-${templateId}-${uuid}`,folder=path.join(this.root,name);await noLinks(folder,{missing:true});try{await fs.lstat(folder);fail();}catch(error){if(error.code!=='ENOENT')throw error;}
  const record={uuid,name,folder,cfg:path.join(folder,name+'.vbox'),disk:path.join(folder,'system.vdi'),profileId:profileId.toLowerCase(),templateId,isoPath,network:`campus-${registry.instance}-${profileId.toLowerCase()}`,phase:'creating'};
  registry.records[this.key(profileId,templateId)]=record;await this.save(registry);
  const template=ALL_TEMPLATES[templateId];await this.cli(['createvm','--name',name,'--uuid',uuid,'--basefolder',this.root,'--platform-architecture','x86','--ostype',template.os,'--register']);
  for(const [key,value]of Object.entries({owner:OWNER,instance:registry.instance,profile:record.profileId,template:templateId}))await this.cli(['setextradata',uuid,PREFIX+key,value]);
  const config=['modifyvm',uuid,'--memory',String(template.memory),'--cpus','2','--acpi','on','--ioapic','on','--boot1','dvd','--boot2','disk','--boot3','none','--boot4','none','--clipboard-mode','disabled','--clipboard-file-transfers','disabled','--drag-and-drop','disabled','--usb-ohci','off','--usb-ehci','off','--usb-xhci','off','--vrde','off','--audio-enabled','off','--audio-in','off','--audio-out','off','--teleporter','off','--recording','off','--graphicscontroller',windows(templateId)?'vboxsvga':'vmsvga','--vram','64'];const nets=networks(templateId,record.network);for(let n=1;n<=8;n++){config.push('--nic'+n,n<=nets.length?'intnet':'none');if(n<=nets.length){config.push('--intnet'+n,nets[n-1],'--nic-promisc'+n,'deny');if(topology(templateId))config.push('--macaddress'+n,mac(record,n),'--nic-trace'+n,'off');}}if(windows(templateId))config.push('--firmware','efi','--tpm-type','2.0');await this.cli(config);
  await this.cli(['createmedium','disk','--filename',record.disk,'--size',String(template.disk),'--format','VDI','--variant','Standard'],120000);
  await this.cli(['storagectl',uuid,'--name','SATA','--add','sata','--controller','IntelAhci','--portcount','2','--bootable','on']);
  await this.cli(['storageattach',uuid,'--storagectl','SATA','--port','0','--device','0','--type','hdd','--medium',record.disk]);
  await this.cli(['storageattach',uuid,'--storagectl','SATA','--port','1','--device','0','--type','dvddrive','--medium',isoPath]);
  const context=await this.inspect(profileId,templateId,{allowCreating:true});record.diskId=context.diskId;record.phase='configured';await this.save(registry);return this.state(templateId,{...context,record});
 });}
 start(profileId,templateId){return this.locked(profileId,templateId,async()=>{const c=await this.inspect(profileId,templateId);if(!c.record)return this.state(templateId,c);if(c.info.VMState!=='poweroff')return this.state(templateId,c);await this.cli(['startvm',c.record.uuid,'--type','gui'],60000);return this.state(templateId,await this.inspect(profileId,templateId));});}
 stop(profileId,templateId){return this.locked(profileId,templateId,async()=>{const c=await this.inspect(profileId,templateId);if(!c.record||c.info.VMState!=='running')return this.state(templateId,c);await this.cli(['controlvm',c.record.uuid,'acpipowerbutton']);return result(templateId,'stopping','acpi_sent','Se solicitó apagar al sistema invitado. Puede demorar o requerir que lo apagues desde su escritorio.');});}
 async snapshotIdentity(record,registry){
  const snapshots=parseMachineReadable(await this.cli(['snapshot',record.uuid,'list','--machinereadable'])),description=`${OWNER}:${registry.instance}:${record.uuid}`;
  const allowed=['SnapshotName','SnapshotUUID','SnapshotDescription','CurrentSnapshotName','CurrentSnapshotUUID','CurrentSnapshotNode'];
  if(Object.keys(snapshots).some(key=>!allowed.includes(key))||snapshots.SnapshotName!=='Campus-base'||!isUUID(snapshots.SnapshotUUID)||snapshots.SnapshotDescription!==description||record.snapshotId&&snapshots.SnapshotUUID!==record.snapshotId)fail();
  const current=allowed.slice(3);if(current.some(key=>Object.hasOwn(snapshots,key))&&(snapshots.CurrentSnapshotName!=='Campus-base'||snapshots.CurrentSnapshotUUID!==snapshots.SnapshotUUID||snapshots.CurrentSnapshotNode!=='SnapshotName'))fail();
  const config=parseSnapshotDetails(await this.cli(['snapshot',record.uuid,'showvminfo',snapshots.SnapshotUUID])),{fields,storage,screens,tree}=config;
  if(tree.id!==snapshots.SnapshotUUID||tree.name!=='Campus-base'||tree.description!==description)fail();
  const required={Name:record.name,UUID:record.uuid,'Hardware UUID':record.uuid,'Config file':record.cfg,'Snapshot folder':path.join(record.folder,'Snapshots'),'Log folder':path.join(record.folder,'Logs'),'Memory size':`${ALL_TEMPLATES[record.templateId].memory}MB`,'Number of CPUs':'2','Platform Architecture':'x86',Encryption:'disabled','Storage Controllers':'','USB Device Filters':'<none>','Shared folders':'<none>','Bandwidth groups':'<none>','Recording enabled':'no','Recording status':'stopped','Recording screens':'1'};
  for(const key of ['Teleporter Enabled','Tracing Enabled','Allow Tracing to Access VM','Autostart Enabled','Audio','Audio playback','Audio capture','Clipboard Mode','Clipboard file transfers','Drag and drop Mode','VRDE','OHCI USB','EHCI USB','xHCI USB',...Array.from({length:4},(_,n)=>`UART ${n+1}`),...Array.from({length:2},(_,n)=>`LPT ${n+1}`),...Array.from({length:8-networks(record.templateId,record.network).length},(_,n)=>`NIC ${n+1+networks(record.templateId,record.network).length}`)])required[key]='disabled';
  for(const [key,value]of Object.entries(required))if(fields[key]!==value)fail();if(record.templateId==='topology-windows'&&fields.Firmware!=='EFI')fail();
  const hasNvram=Object.hasOwn(fields,'BIOS NVRAM File'),hasSecureBoot=Object.hasOwn(fields,'UEFI Secure Boot');
  if(hasNvram){if(!['EFI','EFI32','EFI64','EFIDUAL'].includes(fields.Firmware))fail();await this.validateNvram(fields['BIOS NVRAM File'],record,{snapshot:true});}
  if(hasSecureBoot&&(!hasNvram||!['enabled','disabled'].includes(fields['UEFI Secure Boot'])))fail();
  for(const [index,network]of networks(record.templateId,record.network).entries()){const nic=fields['NIC '+(index+1)]?.match(/^MAC: [0-9A-F]{12}, Attachment: Internal Network '([^']+)', Cable connected: (?:on|off), Trace: off \(file: none\), Type: [A-Za-z0-9]+, Reported speed: \d+ Mbps, Boot priority: \d+, Promisc Policy: deny, Bandwidth group: none$/i);if(!nic||nic[1]!==network||topology(record.templateId)&&!fields['NIC '+(index+1)].startsWith('MAC: '+mac(record,index+1)+','))fail();}
  if(storage.length!==1)fail();const controller=storage[0];if(controller.index!=='0'||controller.name!=='SATA'||controller.type!=='IntelAhci'||controller.instance!=='0'||controller.ports!=='2'||controller.maxPorts!=='30'||controller.bootable!=='Bootable'||controller.devices.some(d=>d.unit!=='0'||!['0','1'].includes(d.port)))fail();
  const disk=controller.devices.find(d=>d.port==='0'),dvd=controller.devices.find(d=>d.port==='1');
  if(!disk||disk.id!==record.diskId||disk.location!==record.disk||dvd&&dvd.id&&dvd.location!==record.isoPath||dvd&&!dvd.id&&Object.hasOwn(dvd,'location'))fail();
  await noLinks(record.cfg);await noLinks(fields['Snapshot folder'],{missing:true});await this.diskChain(disk.location,record);
  if(Object.keys(screens).length!==1||!screens['0']||screens['0'].ID!=='0'||screens['0'].Destination!=='File'||typeof screens['0'].File!=='string'||!path.isAbsolute(screens['0'].File)||!inside(record.folder,path.resolve(screens['0'].File)))fail();
  return{id:snapshots.SnapshotUUID,hash:digest(JSON.stringify(canonical({format:'campus-snapshot-config-v1',...config})))};
 }
 async assertNoSnapshots(uuid){
  let existing;
  try{existing=await this.cli(['snapshot',uuid,'list','--machinereadable']);}
  catch(error){
   // VirtualBox 7.2.22 reports an empty snapshot list as exit 1, not success.
   // This exception is valid only for this read command and this exact reply.
   if(error.code!==1||error.killed||error.signal||error.stderr!==''||typeof error.stdout!=='string'||!/^This machine does not have any snapshots(?:\r?\n)?$/.test(error.stdout))throw error;
   existing='';
  }
  if(existing.trim())fail();
 }
 snapshot(profileId,templateId){return this.locked(profileId,templateId,async()=>{const c=await this.inspect(profileId,templateId);if(!c.record)return this.state(templateId,c);if(c.info.VMState!=='poweroff')return result(templateId,'error','poweroff_required','Apagá la VM desde el invitado antes de guardar la base.');if(c.record.snapshotId)return this.state(templateId,c);await this.assertNoSnapshots(c.record.uuid);c.record.snapshotPending=true;await this.save(c.registry);await this.cli(['snapshot',c.record.uuid,'take','Campus-base','--description',`${OWNER}:${c.registry.instance}:${c.record.uuid}`],120000);const snap=await this.snapshotIdentity(c.record,c.registry);c.record.snapshotId=snap.id;c.record.snapshotHash=snap.hash;c.record.snapshotPending=false;await this.save(c.registry);return this.state(templateId,await this.inspect(profileId,templateId));});}
 restore(profileId,templateId){return this.locked(profileId,templateId,async()=>{const c=await this.inspect(profileId,templateId);if(!c.record)return this.state(templateId,c);if(c.info.VMState!=='poweroff')return result(templateId,'error','poweroff_required','Apagá la VM desde el invitado antes de restaurar.');if(!c.record.snapshotId)return result(templateId,'error','snapshot_missing','Guardá una base propia antes de restaurar.');const snap=await this.snapshotIdentity(c.record,c.registry);if(snap.id!==c.record.snapshotId||snap.hash!==c.record.snapshotHash)fail();await this.cli(['snapshot',c.record.uuid,'restore',c.record.snapshotId],120000);return this.state(templateId,await this.inspect(profileId,templateId));});}
}
module.exports={VirtualMachineManager,parseMachineReadable};
