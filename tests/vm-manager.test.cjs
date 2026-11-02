'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs/promises');const path=require('node:path');const os=require('node:os');const crypto=require('node:crypto');
let VirtualMachineManager,parseMachineReadable;try{({VirtualMachineManager,parseMachineReadable}=require('../desktop/vm-manager.cjs'));}catch{}
const PROFILE='1f06b3be-90a2-499a-ae13-8067880e50de';
const encode=o=>Object.entries(o).map(([k,v])=>`${JSON.stringify(k)}=${typeof v==='number'?v:JSON.stringify(v)}`).join('\n');
// Complete English snapshot-showvminfo shape captured from VirtualBox 7.2.22;
// identities and paths below belong only to the temporary test VM.
function snapshotDetails(engine){const v=engine.savedVM;return `Name:                        ${v.name}
Encryption:                  disabled
Groups:                      /
Platform Architecture:       x86
Guest OS:                    ${v.firmware==='EFI'?'Windows 11':'Debian'} (64-bit)
UUID:                        ${v.UUID}
Config file:                 ${v.CfgFile}
Snapshot folder:             ${v.SnapFldr}
Log folder:                  ${path.join(path.dirname(v.CfgFile),'Logs')}
Hardware UUID:               ${v.UUID}
Memory size:                 ${v.memory}MB
Page Fusion:                 disabled
VRAM size:                   64MB
CPU exec cap:                100%
CPUProfile:                  host
Chipset:                     piix3
Firmware:                    ${v.firmware}
Number of CPUs:              ${v.cpus}
HPET:                        disabled
PAE:                         disabled
Long Mode:                   enabled
Triple Fault Reset:          disabled
APIC:                        enabled
X2APIC:                      enabled
Nested VT-x/AMD-V:           disabled
CPUID overrides:             None
Hardware Virtualization:     enabled
Nested Paging:               enabled
Large Pages:                 enabled
VT-x VPID:                   enabled
VT-x Unrestricted Exec.:     enabled
AMD-V Virt. Vmsave/Vmload:   enabled
CPUID Portability Level:     0
Boot menu mode:              message and menu
Boot Device 1:               DVD
Boot Device 2:               HardDisk
Boot Device 3:               Not Assigned
Boot Device 4:               Not Assigned
ACPI:                        enabled
IOAPIC:                      enabled
BIOS APIC mode:              APIC
Time offset:                 0ms
${v.NvramFile?`BIOS NVRAM File:             ${v.NvramFile}\n`:''}${v.SecureBoot?`UEFI Secure Boot:            ${v.SecureBoot==='on'?'enabled':'disabled'}\n`:''}RTC:                         ${v.firmware==='EFI'?'local time':'UTC'}
IOMMU:                       None
Paravirt. Provider:          Default
Effective Paravirt. Prov.:   ${v.firmware==='EFI'?'HyperV':'KVM'}
State:                       powered off (since ${engine.snapshotTime||'2026-11-02T20:50:40.116000000'})
Graphics Controller:         ${v.firmware==='EFI'?'VBoxSVGA':'VMSVGA'}
Monitor count:               1
3D Acceleration:             disabled
Teleporter Enabled:          disabled
Teleporter Port:             0
Teleporter Address:
Teleporter Password:
Tracing Enabled:             disabled
Allow Tracing to Access VM:  disabled
Tracing Configuration:
Autostart Enabled:           disabled
Autostart Delay:             0
Default Frontend:
VM process priority:         default
Storage Controllers:
#0: 'SATA', Type: IntelAhci, Instance: 0, Ports: 2 (max 30), Bootable
  Port 0, Unit 0: UUID: ${engine.disk.id}
    Location: "${engine.disk.file}"
  Port 1, Unit 0: UUID: 9761bc3f-1d34-4b63-a819-a53352e81b34
    Location: "${v['SATA-1-0']}"
NIC 1:                       MAC: 080027198C19, Attachment: Internal Network '${v.intnet1}', Cable connected: on, Trace: off (file: none), Type: 82540EM, Reported speed: 0 Mbps, Boot priority: 0, Promisc Policy: deny, Bandwidth group: none
${Array.from({length:7},(_,n)=>`NIC ${n+2}:                       disabled`).join('\n')}
Pointing Device:             PS/2 Mouse
Keyboard Device:             PS/2 Keyboard
${Array.from({length:4},(_,n)=>`UART ${n+1}:                      disabled`).join('\n')}
LPT 1:                       disabled
LPT 2:                       disabled
Audio:                       disabled
Audio playback:              disabled
Audio capture:               disabled
Clipboard Mode:              disabled
Clipboard file transfers:    disabled
Drag and drop Mode:          disabled
VRDE:                        disabled
OHCI USB:                    disabled
EHCI USB:                    disabled
xHCI USB:                    disabled
USB Device Filters:          <none>
Bandwidth groups:            <none>
Shared folders:              <none>
Recording status:            stopped
Recording enabled:           no
Recording screens:           1
 Screen 0:
    Enabled:                 yes
    ID:                      0
    Record video:            yes
    Record audio:            no
    Destination:             File
    File:                    ${path.join(path.dirname(v.CfgFile),v.name+'-screen0.webm')}
    Options:                 ac_profile=med
    Video dimensions:        1024x768
    Video rate:              512kbps
    Video FPS:               25fps
* Snapshots:
   Name: Campus-base (UUID: ${engine.snap})${engine.snapshotMarker===false?'':' *'}
   Description: ${engine.snapshotDescription}
* Guest:
Configured memory balloon:   0MB

`;}
async function setup(t){
 assert.equal(typeof VirtualMachineManager,'function');const dir=await fs.mkdtemp(path.join(os.tmpdir(),'campus-vm-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));const iso=path.join(dir,'install.iso');await fs.writeFile(iso,'fixture');
 const engine={calls:[],vm:null,extra:{},fail:null,snap:null};
 engine.runner=async(exe,a,options)=>{engine.calls.push(a);assert.equal(options.shell,false);assert.equal(options.windowsHide,true);if(engine.fail===a[0])throw Error('secret stderr');const v=engine.vm;const arg=n=>a[a.indexOf(n)+1];
  if(a[0]==='--version')return{stdout:'7.2.22r175245'};
  if(a[0]==='list'&&a[1]==='hostinfo')return{stdout:'Processor supports HW virtualization: yes\nMemory size: 32768 MByte'};
  if(a[0]==='createvm'){const name=arg('--name'),folder=path.join(arg('--basefolder'),name);await fs.mkdir(folder);await fs.writeFile(path.join(folder,name+'.vbox'),'fixture');engine.vm={UUID:arg('--uuid'),name,CfgFile:path.join(folder,name+'.vbox'),SnapFldr:path.join(folder,'Snapshots'),VMState:'poweroff',memory:0,cpus:1,clipboard:'disabled',clipboardfiletransfers:'disabled',draganddrop:'disabled',usb:'off',ehci:'off',xhci:'off',vrde:'off',nic1:'intnet',nicpromisc1:'deny',uart1:'off',uart2:'off',uart3:'off',uart4:'off',lpt1:'off',lpt2:'off',teleporter:'off',recording:'off',storagecontrollername0:'SATA'};for(let n=2;n<=8;n++)engine.vm['nic'+n]='none';return{stdout:''};}
  if(a[0]==='setextradata'){engine.extra[a[2]]=a[3];return{stdout:''};}
  if(a[0]==='getextradata')return{stdout:'Value: '+engine.extra[a[2]]};
  if(a[0]==='modifyvm'){v.firmware=a.includes('--firmware')?'EFI':'BIOS';v.memory=+arg('--memory');v.cpus=+arg('--cpus');v.intnet1=arg('--intnet1');v.audio='none';v.audio_in='off';v.audio_out='off';return{stdout:''};}
  if(a[0]==='createmedium'){engine.disk={id:crypto.randomUUID(),file:arg('--filename'),capacity:+arg('--size')};await fs.writeFile(engine.disk.file,'disk');return{stdout:''};}
  if(a[0]==='storagectl')return{stdout:''};
  if(a[0]==='storageattach'){v['SATA-'+arg('--port')+'-0']=arg('--medium');return{stdout:''};}
  if(a[0]==='showvminfo'&&a.includes('--details'))return{stdout:`NIC 1: MAC: 080027001122, Attachment: Internal Network '${v.intnet1}', Cable connected: on, Trace: off (file: none), Promisc Policy: ${v.nicpromisc1||'deny'}\nUSB Device Filters: <none>\nShared folders: <none>`};
  if(a[0]==='showvminfo')return{stdout:encode(v)};
  if(a[0]==='showmediuminfo'){const child=engine.child&&(a[2]===engine.child.file||a[2]===engine.child.id);const medium=child?engine.child:engine.disk;return{stdout:`UUID: ${medium.id}\nParent UUID: ${child?medium.parent:'base'}\nState: created\nType: ${child?medium.type:engine.type||'normal (base)'}\nLocation: ${medium.file}\nStorage format: VDI\nFormat variant: ${child?medium.variant:engine.variant||'dynamic default'}\nCapacity: ${engine.capacity||engine.disk.capacity} MBytes`};}
  if(a[0]==='startvm'){v.VMState='running';return{stdout:''};}
  if(a[0]==='controlvm'){assert.equal(a[2],'acpipowerbutton');return{stdout:''};}
  if(a[0]==='snapshot'){if(a[2]==='take'){engine.snap=crypto.randomUUID();engine.savedVM={...v};engine.snapshotDescription=arg('--description');const id=crypto.randomUUID();engine.child={id,parent:engine.disk.id,file:path.join(v.SnapFldr,`{${id}}.vdi`),type:'normal (differencing)',variant:'differencing default'};await fs.mkdir(v.SnapFldr,{recursive:true});if(v.SecureBoot){engine.savedVM.NvramFile=path.join(v.SnapFldr,'2026-11-02T20-50-40-116000000Z.nvram');await fs.copyFile(v.NvramFile,engine.savedVM.NvramFile);}else delete engine.savedVM.NvramFile;await fs.writeFile(engine.child.file,'difference');v['SATA-0-0']=engine.child.file;return{stdout:''};}if(a[2]==='list')return{stdout:engine.snap?encode({SnapshotName:'Campus-base',SnapshotUUID:engine.snap,SnapshotDescription:engine.snapshotDescription,CurrentSnapshotName:'Campus-base',CurrentSnapshotUUID:engine.snap,CurrentSnapshotNode:'SnapshotName'}):''};if(a[2]==='showvminfo'){assert.equal(a[3],engine.snap);return{stdout:engine.editSnapshot?engine.editSnapshot(snapshotDetails(engine)):snapshotDetails(engine)};}if(a[2]==='restore'){assert.equal(a[3],engine.snap);return{stdout:''};}}
  throw Error('Unhandled '+a.join(' '));
 };const manager=new VirtualMachineManager({dataDir:dir,runner:engine.runner,platform:'win32',executable:path.join(dir,'VBoxManage.exe')});return{dir,iso,engine,manager};
}
const mutations=e=>e.calls.filter(a=>!['--version','list','showvminfo','getextradata','showmediuminfo'].includes(a[0])&&!(a[0]==='snapshot'&&['list','showvminfo'].includes(a[2])));
// Initialized EFI fixture follows Oracle's NvramStore/SnapshotImpl behavior:
// current state uses the VM name; a snapshot copies it to a timestamp filename.
// This fixture does not claim that an OS has been booted in these tests.
async function initializedEFI(t,secureBoot='on'){
 const context=await setup(t),{manager,engine,iso}=context;
 assert.equal((await manager.create(PROFILE,'windows',{isoPath:iso})).state,'configured');
 engine.vm.NvramFile=path.join(path.dirname(engine.vm.CfgFile),engine.vm.name+'.nvram');
 engine.vm.SecureBoot=secureBoot;await fs.writeFile(engine.vm.NvramFile,'fixture firmware');return context;
}
test('machine readable parser preserves quoted paths and rejects ambiguity without evaluating text',()=>{
 assert.equal(typeof parseMachineReadable,'function');const o=parseMachineReadable('name="A \\"quote\\""\n"SATA-0-0"="C:\\\\VMs\\\\disk.vdi"\ncpus=2');assert.equal(o.name,'A "quote"');assert.equal(o['SATA-0-0'],'C:\\VMs\\disk.vdi');assert.equal(o.cpus,'2');
 for(const bad of ['UUID="a"\nUUID="b"','x="unterminated','x=process.exit()','__proto__="bad"','x="ok" garbage'])assert.throws(()=>parseMachineReadable(bad));
});
test('closed new VM lifecycle uses isolated network and never claims an installed OS',async t=>{
 const {manager,engine,iso}=await setup(t);assert.equal((await manager.doctor()).ready,true);assert.equal((await manager.status(PROFILE,'linux')).state,'missing');const created=await manager.create(PROFILE,'linux',{isoPath:iso});assert.equal(created.state,'configured');assert.equal(created.osInstalled,false);assert.equal(created.canStart,true);assert.equal(engine.vm.memory,2048);assert.equal(engine.vm.nic1,'intnet');assert.match(engine.vm.intnet1,/^campus-/);assert.equal((await manager.start(PROFILE,'linux')).state,'running');assert.ok(engine.calls.some(a=>a[0]==='startvm'&&a.includes('gui')));assert.equal((await manager.stop(PROFILE,'linux')).state,'stopping');engine.vm.VMState='poweroff';assert.equal((await manager.snapshot(PROFILE,'linux')).canRestore,true);assert.equal((await manager.restore(PROFILE,'linux')).state,'configured');
});
test('ownership, network, shares and disk drift block every mutation',async t=>{
 const changes=[e=>e.extra['ar.campus.vm.owner']='foreign',e=>e.vm.UUID=crypto.randomUUID(),e=>e.vm.nic2='nat',e=>e.vm.nic1='bridged',e=>delete e.vm.nic1,e=>e.vm.clipboard='bidirectional',e=>e.vm.usb='on',e=>e.vm.vrde='on',e=>e.vm.SharedFolderNameMachineMapping1='foreign',e=>e.vm['SATA-0-0']='C:\\foreign.vdi',e=>e.vm.CfgFile='C:\\foreign.vbox'];
 for(const change of changes){const {manager,engine,iso}=await setup(t);await manager.create(PROFILE,'linux',{isoPath:iso});change(engine);const before=mutations(engine).length;for(const op of ['status','start','stop','snapshot','restore'])assert.equal((await manager[op](PROFILE,'linux')).state,'unsafe',op);assert.equal(mutations(engine).length,before);}
});
test('invalid inputs never reach CLI and concurrent creates produce exactly one VM',async t=>{
 const {manager,engine,iso}=await setup(t);await assert.rejects(()=>manager.status('../escape','linux'));await assert.rejects(()=>manager.start(PROFILE,'other'));assert.equal(engine.calls.length,0);await Promise.all([manager.create(PROFILE,'linux',{isoPath:iso}),manager.create(PROFILE,'linux',{isoPath:iso})]);assert.equal(engine.calls.filter(a=>a[0]==='createvm').length,1);
});
test('partial creation keeps an owned recovery record and never recreates or deletes resources',async t=>{
 const {manager,engine,iso}=await setup(t);engine.fail='storageattach';const result=await manager.create(PROFILE,'linux',{isoPath:iso});assert.equal(result.state,'error');assert.doesNotMatch(JSON.stringify(result),/secret/);engine.fail=null;const count=mutations(engine).length;assert.equal((await manager.create(PROFILE,'linux',{isoPath:iso})).state,'unsafe');assert.equal(mutations(engine).length,count);assert.equal(engine.calls.some(a=>a.includes('--delete')),false);
});
test('corrupt registry fails closed',async t=>{
 const {manager,dir,engine,iso}=await setup(t);await manager.create(PROFILE,'linux',{isoPath:iso});await fs.writeFile(path.join(dir,'vm-labs','registry.json'),'{}');const before=mutations(engine).length;assert.equal((await manager.start(PROFILE,'linux')).state,'unsafe');assert.equal(mutations(engine).length,before);
});
test('junctions cannot redirect private VM storage outside Campus',async t=>{
 const {manager,engine,dir}=await setup(t);const outside=await fs.mkdtemp(path.join(os.tmpdir(),'campus-vm-outside-'));t.after(()=>fs.rm(outside,{recursive:true,force:true}));await fs.symlink(outside,path.join(dir,'vm-labs'),process.platform==='win32'?'junction':'dir');assert.equal((await manager.status(PROFILE,'linux')).state,'unsafe');assert.equal(engine.calls.length,0);
});
test('snapshot requires powered off own VM and verifies saved snapshot identity on restore',async t=>{
 const {manager,engine,iso}=await setup(t);await manager.create(PROFILE,'linux',{isoPath:iso});await manager.start(PROFILE,'linux');assert.equal((await manager.snapshot(PROFILE,'linux')).code,'poweroff_required');engine.vm.VMState='poweroff';await manager.snapshot(PROFILE,'linux');engine.snap=crypto.randomUUID();const before=mutations(engine).length;assert.equal((await manager.restore(PROFILE,'linux')).state,'unsafe');assert.equal(mutations(engine).length,before);
});
test('missing CLI and failed commands expose bounded guidance without raw stderr',async t=>{
 const {manager,engine}=await setup(t);engine.fail='--version';const d=await manager.doctor();assert.equal(d.ready,false);assert.doesNotMatch(JSON.stringify(d),/secret/);
});
test('CLI pins a private VirtualBox home despite inherited environment',async t=>{
 const {manager,engine,dir}=await setup(t);const run=engine.runner;let observed;manager.runner=async(exe,a,options)=>{observed=options.env.VBOX_USER_HOME;return run(exe,a,options)};await manager.doctor();assert.equal(observed,path.join(dir,'vm-labs','virtualbox-home'));
});
test('storage attachment metadata is parsed without mistaking image UUIDs for foreign disk paths',async t=>{
 const {manager,engine,iso}=await setup(t);await manager.create(PROFILE,'linux',{isoPath:iso});engine.vm['SATA-ImageUUID-0-0']=engine.disk.id;engine.vm['SATA-IsEjected-1-0']='off';engine.vm['SATA-tempeject-1-0']='off';assert.equal((await manager.status(PROFILE,'linux')).state,'configured');engine.vm['Other-0-0']='C:\\foreign.vdi';assert.equal((await manager.start(PROFILE,'linux')).state,'unsafe');
});
test('a complete creation whose last response was lost recovers only after full ownership validation',async t=>{
 const {manager,engine,iso,dir}=await setup(t);const run=engine.runner;let lost=true;manager.runner=async(exe,args,options)=>{const reply=await run(exe,args,options);if(lost&&args[0]==='storageattach'&&args.includes('dvddrive')){lost=false;throw Error('lost response')}return reply};assert.equal((await manager.create(PROFILE,'linux',{isoPath:iso})).state,'error');const before=mutations(engine).length;assert.equal((await manager.create(PROFILE,'linux',{isoPath:iso})).state,'configured');assert.equal(mutations(engine).length,before);assert.equal(JSON.parse(await fs.readFile(path.join(dir,'vm-labs','registry.json'),'utf8')).records[PROFILE+':linux'].phase,'configured');
});
test('an interrupted snapshot blocks mutation until its ownership is reviewed',async t=>{
 const {manager,engine,iso}=await setup(t);await manager.create(PROFILE,'linux',{isoPath:iso});engine.fail='snapshot';// Fail only the take operation, after persisting the intent.
 const run=engine.runner;engine.fail=null;manager.runner=(exe,args,opts)=>args[0]==='snapshot'&&args[2]==='take'?Promise.reject(Error('lost snapshot response')):run(exe,args,opts);
 assert.equal((await manager.snapshot(PROFILE,'linux')).state,'error');const before=mutations(engine).length;assert.equal((await manager.start(PROFILE,'linux')).state,'unsafe');assert.equal(mutations(engine).length,before);
});
test('VirtualBox 7.2 recording section marker and omitted promiscuous field use verified details',async t=>{
 const {manager,engine,iso}=await setup(t);const run=engine.runner;manager.runner=async(exe,args,opts)=>{const reply=await run(exe,args,opts);if(args[0]==='showvminfo'&&args.includes('--machinereadable'))reply.stdout=reply.stdout.replace(/^"nicpromisc1"=.*\n/m,'')+'\nrecording_enabled="off"\nclipboard_file_transfers="off"\n rec_screen0\nrec_screen_enabled="on"';return reply};assert.equal((await manager.create(PROFILE,'linux',{isoPath:iso})).state,'configured');engine.vm.nicpromisc1='allow-all';assert.equal((await manager.start(PROFILE,'linux')).state,'unsafe');
});
test('failed final creation verification never falsely claims no resource changed',async t=>{
 const {manager,engine,iso}=await setup(t);const run=engine.runner;manager.runner=async(exe,args,opts)=>{const reply=await run(exe,args,opts);if(args[0]==='showvminfo')reply.stdout='garbage';return reply};const status=await manager.create(PROFILE,'linux',{isoPath:iso});assert.equal(status.state,'unsafe');assert.doesNotMatch(status.message,/No se modificó/);assert.equal(engine.vm!==null,true);
});
test('resized disks, fixed allocation, and additional enabled network adapters block controls',async t=>{
 for(const change of [e=>e.capacity=40960,e=>e.variant='fixed default',e=>e.vm.nic9='nat']){const {manager,engine,iso}=await setup(t);await manager.create(PROFILE,'linux',{isoPath:iso});change(engine);const before=mutations(engine).length;assert.equal((await manager.start(PROFILE,'linux')).state,'unsafe');assert.equal(mutations(engine).length,before);}
});
test('audio driver, input, output or missing audio evidence blocks every VM control',async t=>{
 for(const change of [v=>Object.assign(v,{audio:'was',audio_in:'on',audio_out:'on'}),v=>v.audio_in='on',v=>v.audio_out='on',v=>delete v.audio,v=>delete v.audio_in,v=>delete v.audio_out]){
  const {manager,engine,iso}=await setup(t);assert.equal((await manager.create(PROFILE,'linux',{isoPath:iso})).state,'configured');change(engine.vm);const before=mutations(engine).length;for(const method of ['status','start','stop','snapshot','restore'])assert.equal((await manager[method](PROFILE,'linux')).state,'unsafe');assert.equal(mutations(engine).length,before);
 }
});
test('configured records require a scalar base disk UUID and cannot accept a replacement disk',async t=>{
 for(const diskId of [undefined,null,false,0,'',[],[crypto.randomUUID()]]){const {manager,engine,iso,dir}=await setup(t);await manager.create(PROFILE,'linux',{isoPath:iso});const file=path.join(dir,'vm-labs','registry.json'),data=JSON.parse(await fs.readFile(file,'utf8'));data.records[PROFILE+':linux'].diskId=diskId;await fs.writeFile(file,JSON.stringify(data));engine.disk.id=crypto.randomUUID();const before=engine.calls.length;for(const method of ['status','start','stop','snapshot','restore'])assert.equal((await manager[method](PROFILE,'linux')).state,'unsafe');assert.equal(engine.calls.length,before);}
});
test('present but corrupt profile records never become missing or create a replacement VM',async t=>{
 for(const bad of [false,null,0,'',[],[{}]]){const {manager,engine,iso,dir}=await setup(t);await manager.create(PROFILE,'linux',{isoPath:iso});const file=path.join(dir,'vm-labs','registry.json'),data=JSON.parse(await fs.readFile(file,'utf8'));data.records[PROFILE+':linux']=bad;await fs.writeFile(file,JSON.stringify(data));const before=engine.calls.length;const status=await manager.status(PROFILE,'linux');assert.equal(status.state,'unsafe');assert.equal(status.canCreate,false);assert.equal((await manager.create(PROFILE,'linux',{isoPath:iso})).state,'unsafe');assert.equal(engine.calls.length,before);}
});
test('registry roots, metadata types and unexpected own properties fail closed',async t=>{
 const edits=[d=>d.records=true,d=>d.records='bad',d=>d.records=[],d=>d.instance=[d.instance],d=>Object.defineProperty(d.records,'__proto__',{value:{},enumerable:true}),d=>d.records[PROFILE+':linux'].snapshotPending='false',d=>d.records[PROFILE+':linux'].snapshotId=[],d=>d.records[PROFILE+':linux'].snapshotHash='unpaired',d=>d.records[PROFILE+':linux'].uuid=[d.records[PROFILE+':linux'].uuid],d=>d.records[PROFILE+':linux'].isoPath=null];
 for(const edit of edits){const {manager,engine,iso,dir}=await setup(t);await manager.create(PROFILE,'linux',{isoPath:iso});const file=path.join(dir,'vm-labs','registry.json'),data=JSON.parse(await fs.readFile(file,'utf8'));edit(data);await fs.writeFile(file,JSON.stringify(data));const before=engine.calls.length;assert.equal((await manager.start(PROFILE,'linux')).state,'unsafe');assert.equal(engine.calls.length,before);}
});
test('snapshot folder junction is rejected before any VM mutation or snapshot take',async t=>{
 const {manager,engine,iso}=await setup(t);await manager.create(PROFILE,'linux',{isoPath:iso});const outside=await fs.mkdtemp(path.join(os.tmpdir(),'campus-snapshot-outside-'));t.after(()=>fs.rm(outside,{recursive:true,force:true}));await fs.symlink(outside,engine.vm.SnapFldr,process.platform==='win32'?'junction':'dir');const before=mutations(engine).length;for(const method of ['status','start','stop','snapshot','restore'])assert.equal((await manager[method](PROFILE,'linux')).state,'unsafe');assert.equal(mutations(engine).length,before);assert.deepEqual(await fs.readdir(outside),[]);
});
test('VirtualBox exit 1 with exact empty snapshot message and empty stderr permits first base',async t=>{
 const {manager,engine,iso}=await setup(t);await manager.create(PROFILE,'linux',{isoPath:iso});const run=engine.runner;manager.runner=async(exe,args,opts)=>{if(args[0]==='snapshot'&&args[2]==='list'&&!engine.snap)throw Object.assign(Error('Command failed'),{code:1,stdout:'This machine does not have any snapshots\r\n',stderr:'',killed:false,signal:null});return run(exe,args,opts)};const status=await manager.snapshot(PROFILE,'linux');assert.equal(status.state,'configured');assert.equal(status.canRestore,true);assert.equal(engine.calls.filter(a=>a[0]==='snapshot'&&a[2]==='take').length,1);
});
test('snapshot list failure with stderr, timeout or nonexact message never authorizes taking a base',async t=>{
 const variants=[{stderr:'secret failure'},{killed:true},{signal:'SIGTERM'},{code:2},{stdout:'This machine does not have any snapshots\r\nAdditional failure'},{stdout:''},{stderr:undefined}];
 for(const variant of variants){const {manager,engine,iso,dir}=await setup(t);await manager.create(PROFILE,'linux',{isoPath:iso});const run=engine.runner;manager.runner=async(exe,args,opts)=>{if(args[0]==='snapshot'&&args[2]==='list')throw Object.assign(Error('secret failure'),{code:1,stdout:'This machine does not have any snapshots\r\n',stderr:'',killed:false,signal:null},variant);return run(exe,args,opts)};const before=mutations(engine).length;const status=await manager.snapshot(PROFILE,'linux');assert.equal(status.state,'error');assert.doesNotMatch(JSON.stringify(status),/secret/);assert.equal(mutations(engine).length,before);assert.notEqual(JSON.parse(await fs.readFile(path.join(dir,'vm-labs','registry.json'),'utf8')).records[PROFILE+':linux'].snapshotPending,true);}
});
test('real differencing shape in Snapshots preserves status and restores the registered own base',async t=>{
 const {manager,engine,iso}=await setup(t);await manager.create(PROFILE,'linux',{isoPath:iso});const saved=await manager.snapshot(PROFILE,'linux');assert.equal(saved.state,'configured');assert.equal(saved.canRestore,true);const before=mutations(engine).length;const status=await manager.status(PROFILE,'linux');assert.equal(status.state,'configured');assert.equal(status.canRestore,true);assert.equal(mutations(engine).length,before);assert.equal((await manager.restore(PROFILE,'linux')).state,'configured');assert.equal(engine.calls.some(a=>a[0]==='showmediuminfo'&&a[2]===engine.disk.id),true);
});
test('differencing child never relaxes base type, allocation, identity or parent validation',async t=>{
 const edits=[e=>e.variant='differencing default',e=>e.type='normal (differencing)',e=>e.type='immutable',e=>e.disk.id=crypto.randomUUID(),e=>e.child.type='normal (base)',e=>e.child.variant='dynamic default',e=>e.child.parent='not-a-uuid',e=>e.child.parent=e.child.id];
 for(const edit of edits){const {manager,engine,iso}=await setup(t);await manager.create(PROFILE,'linux',{isoPath:iso});await manager.snapshot(PROFILE,'linux');edit(engine);const before=mutations(engine).length;for(const method of ['status','start','stop','snapshot','restore']){const status=await manager[method](PROFILE,'linux');assert.equal(status.state,'unsafe');assert.equal(status.canStart,false);assert.equal(status.canRestore,false);}assert.equal(mutations(engine).length,before);}
});
test('a differencing file outside Snapshots is rejected even within its own VM directory',async t=>{
 const {manager,engine,iso}=await setup(t);await manager.create(PROFILE,'linux',{isoPath:iso});await manager.snapshot(PROFILE,'linux');const sibling=path.join(path.dirname(engine.disk.file),'foreign-difference.vdi');await fs.rename(engine.child.file,sibling);engine.child.file=sibling;engine.vm['SATA-0-0']=sibling;const before=mutations(engine).length;assert.equal((await manager.start(PROFILE,'linux')).state,'unsafe');assert.equal(mutations(engine).length,before);
});
test('snapshot restore accepts native state timestamp and current-tree-marker drift without changing its fingerprint',async t=>{
 const {manager,engine,iso,dir}=await setup(t);await manager.create(PROFILE,'linux',{isoPath:iso});assert.equal((await manager.snapshot(PROFILE,'linux')).state,'configured');const file=path.join(dir,'vm-labs','registry.json'),before=await fs.readFile(file,'utf8');engine.snapshotTime='2026-11-02T20:50:40.000000000';engine.snapshotMarker=false;engine.editSnapshot=text=>text.replace(/^Memory size:(.*)\nPage Fusion:(.*)$/m,'Page Fusion:$2\nMemory size:$1').replaceAll('\n','\r\n');assert.equal((await manager.restore(PROFILE,'linux')).state,'configured');assert.equal(await fs.readFile(file,'utf8'),before);assert.equal(mutations(engine).filter(a=>a[0]==='snapshot'&&a[2]==='restore').length,1);
});
test('snapshot configuration is validated before a newly taken base can become restorable',async t=>{
 const edits=[
  text=>text.replace('Audio:                       disabled','Audio:                       enabled'),
  text=>text.replace('Audio playback:              disabled','Audio playback:              enabled'),
  text=>text.replace('Audio capture:               disabled','Audio capture:               enabled'),
  text=>text.replace("Attachment: Internal Network '","Attachment: Bridged Interface '"),
  text=>text.replace('NIC 2:                       disabled','NIC 2:                       NAT'),
  text=>text.replace('Promisc Policy: deny','Promisc Policy: allow-all'),
  text=>text.replace('Trace: off (file: none)','Trace: on (file: host.pcap)'),
  text=>text.replace('Shared folders:              <none>','Shared folders:              host'),
  text=>text.replace('USB Device Filters:          <none>','USB Device Filters:          active'),
  text=>text.replace('Clipboard Mode:              disabled','Clipboard Mode:              bidirectional'),
  text=>text.replace('Clipboard file transfers:    disabled','Clipboard file transfers:    enabled'),
  text=>text.replace('Drag and drop Mode:          disabled','Drag and drop Mode:          bidirectional'),
  text=>text.replace('OHCI USB:                    disabled','OHCI USB:                    enabled'),
  text=>text.replace('VRDE:                        disabled','VRDE:                        enabled'),
  text=>text.replace('Teleporter Enabled:          disabled','Teleporter Enabled:          enabled'),
  text=>text.replace('Recording enabled:           no','Recording enabled:           yes'),
  text=>text.replace('UART 1:                      disabled','UART 1:                      host pipe'),
  text=>text.replace('LPT 1:                       disabled','LPT 1:                       host device'),
  text=>text.replace('powered off (since','running (since'),
  text=>text.replace("#0: 'SATA'","#0: 'Other'"),
  text=>text.replace('  Port 1, Unit 0: UUID:','  Port 2, Unit 0: UUID:'),
  text=>text.replace('Memory size:                 2048MB','Memory size:                 4096MB'),
  text=>text.replace('Number of CPUs:              2','Number of CPUs:              8'),
  text=>text.replace('Audio:                       disabled\n',''),
  text=>text.replace('Audio:                       disabled','Audio:                       disabled\nAudio:                       disabled'),
  text=>text.replace('Shared folders:              <none>','Shared folders:              <none>\nUnrecognized host attachment: enabled')
 ];
 for(const edit of edits){const {manager,engine,iso,dir}=await setup(t);await manager.create(PROFILE,'linux',{isoPath:iso});engine.editSnapshot=edit;const status=await manager.snapshot(PROFILE,'linux');assert.equal(status.state,'unsafe');assert.equal(status.canRestore,false);const record=JSON.parse(await fs.readFile(path.join(dir,'vm-labs','registry.json'),'utf8')).records[PROFILE+':linux'];assert.equal(record.snapshotPending,true);assert.equal(record.snapshotId,undefined);const before=mutations(engine).length;assert.equal((await manager.restore(PROFILE,'linux')).state,'unsafe');assert.equal(mutations(engine).length,before);}
});
test('snapshot identity, private paths and saved disk UUID are validated before registration',async t=>{
 const edits=[(text,e)=>text.replace(`UUID:                        ${e.vm.UUID}`,'UUID:                        '+crypto.randomUUID()),(text,e)=>text.replace(`Config file:                 ${e.vm.CfgFile}`,'Config file:                 '+path.join(os.tmpdir(),'foreign.vbox')),(text,e)=>text.replace(`Snapshot folder:             ${e.vm.SnapFldr}`,'Snapshot folder:             '+path.join(os.tmpdir(),'other')),(text,e)=>text.replace(`UUID: ${e.disk.id}`,'UUID: '+crypto.randomUUID()),(text,e)=>text.replace(`Location: "${e.disk.file}"`,`Location: "${e.child.file}"`),(text,e)=>text.replace(`Location: "${e.savedVM['SATA-1-0']}"`,`Location: "${path.join(os.tmpdir(),'foreign.iso')}"`),(text,e)=>text.replace(`Description: ${e.snapshotDescription}`,'Description: foreign')];
 for(const edit of edits){const {manager,engine,iso}=await setup(t);await manager.create(PROFILE,'linux',{isoPath:iso});engine.editSnapshot=text=>edit(text,engine);assert.equal((await manager.snapshot(PROFILE,'linux')).state,'unsafe');assert.equal(mutations(engine).some(a=>a[0]==='snapshot'&&a[2]==='restore'),false);}
});
test('safe configuration drift and unsafe snapshot changes cannot authorize restore or rewrite its saved fingerprint',async t=>{
 for(const edit of [text=>text.replace('CPU exec cap:                100%','CPU exec cap:                95%'),text=>text.replace('Audio:                       disabled','Audio:                       enabled'),text=>text.replace('Recording enabled:           no','Recording enabled:           yes')]){const {manager,engine,iso,dir}=await setup(t);await manager.create(PROFILE,'linux',{isoPath:iso});assert.equal((await manager.snapshot(PROFILE,'linux')).state,'configured');const file=path.join(dir,'vm-labs','registry.json'),before=await fs.readFile(file,'utf8'),count=mutations(engine).length;engine.editSnapshot=edit;assert.equal((await manager.restore(PROFILE,'linux')).state,'unsafe');assert.equal(mutations(engine).length,count);assert.equal(await fs.readFile(file,'utf8'),before);}
});
test('restore rejects legacy raw-output fingerprints without adopting the current snapshot',async t=>{
 const {manager,engine,iso,dir}=await setup(t);await manager.create(PROFILE,'linux',{isoPath:iso});await manager.snapshot(PROFILE,'linux');const file=path.join(dir,'vm-labs','registry.json'),registry=JSON.parse(await fs.readFile(file,'utf8'));registry.records[PROFILE+':linux'].snapshotHash=crypto.createHash('sha256').update(snapshotDetails(engine)).digest('hex');await fs.writeFile(file,JSON.stringify(registry));const before=await fs.readFile(file,'utf8'),count=mutations(engine).length;assert.equal((await manager.restore(PROFILE,'linux')).state,'unsafe');assert.equal(mutations(engine).length,count);assert.equal(await fs.readFile(file,'utf8'),before);
});
test('restored current settings are revalidated after the restore command',async t=>{
 const {manager,engine,iso}=await setup(t);await manager.create(PROFILE,'linux',{isoPath:iso});await manager.snapshot(PROFILE,'linux');const run=engine.runner;manager.runner=async(exe,args,opts)=>{const reply=await run(exe,args,opts);if(args[0]==='snapshot'&&args[2]==='restore')engine.vm.audio_in='on';return reply};const status=await manager.restore(PROFILE,'linux');assert.equal(status.state,'unsafe');assert.equal(status.canStart,false);assert.equal(mutations(engine).filter(a=>a[0]==='snapshot'&&a[2]==='restore').length,1);
});
test('initialized EFI Windows base accepts native NVRAM snapshot paths and both Secure Boot states',async t=>{
 for(const secureBoot of ['on','off']){
  const {manager,engine,dir}=await initializedEFI(t,secureBoot);const saved=await manager.snapshot(PROFILE,'windows');
  assert.equal(saved.state,'configured');assert.equal(saved.canRestore,true);assert.equal(saved.osInstalled,false);
  const file=path.join(dir,'vm-labs','registry.json'),before=await fs.readFile(file,'utf8');
  engine.snapshotTime='2026-11-02T20:50:40.000000000';engine.snapshotMarker=false;
  const reloaded=new VirtualMachineManager({dataDir:dir,runner:engine.runner,platform:'win32',executable:path.join(dir,'VBoxManage.exe')});
  assert.equal((await reloaded.status(PROFILE,'windows')).state,'configured');assert.equal((await reloaded.restore(PROFILE,'windows')).state,'configured');
  assert.equal(await fs.readFile(file,'utf8'),before);assert.equal(mutations(engine).filter(a=>a[0]==='snapshot'&&a[2]==='restore').length,1);
 }
});
test('preboot EFI Windows snapshot still accepts absent firmware store fields',async t=>{
 const {manager,engine,iso}=await setup(t);assert.equal((await manager.create(PROFILE,'windows',{isoPath:iso})).state,'configured');
 engine.vm.NvramFile=path.join(path.dirname(engine.vm.CfgFile),engine.vm.name+'.nvram');
 assert.equal((await manager.snapshot(PROFILE,'windows')).state,'configured');assert.equal((await manager.restore(PROFILE,'windows')).state,'configured');
});
test('current NVRAM storage outside its exact private VM filename blocks controls before snapshot take',async t=>{
 for(const destination of ['outside','sibling','snapshot','relative','directory']){
  const {manager,engine,dir}=await initializedEFI(t);const folder=path.dirname(engine.vm.CfgFile),original=engine.vm.NvramFile;
  const paths={outside:path.join(dir,'foreign.nvram'),sibling:path.join(folder,'other.nvram'),snapshot:path.join(engine.vm.SnapFldr,'2026-11-02T20-50-40-116000000Z.nvram'),relative:engine.vm.name+'.nvram',directory:original};
  engine.vm.NvramFile=paths[destination];if(destination==='directory'){await fs.unlink(original);await fs.mkdir(original);}
  const before=mutations(engine).length;for(const method of ['status','start','stop','snapshot','restore'])assert.equal((await manager[method](PROFILE,'windows')).state,'unsafe',destination+':'+method);
  assert.equal(mutations(engine).length,before);
 }
});
test('snapshot NVRAM requires a regular private timestamp file before registration',async t=>{
 for(const destination of ['outside','current','sibling','relative','traversal','missing','directory','junction']){
  const {manager,engine,dir}=await initializedEFI(t),run=engine.runner;
  manager.runner=async(exe,args,options)=>{const reply=await run(exe,args,options);if(args[0]==='snapshot'&&args[2]==='take'){
   const original=engine.savedVM.NvramFile,folder=path.dirname(engine.vm.CfgFile);
   const paths={outside:path.join(dir,'foreign.nvram'),current:engine.vm.NvramFile,sibling:path.join(folder,path.basename(original)),relative:path.basename(original),traversal:path.join(engine.vm.SnapFldr,'..','..','foreign.nvram'),missing:path.join(engine.vm.SnapFldr,'2026-11-02T20-50-41-116000000Z.nvram'),directory:original,junction:original};
   engine.savedVM.NvramFile=paths[destination];
   if(destination==='directory'||destination==='junction'){await fs.unlink(original);if(destination==='directory')await fs.mkdir(original);else await fs.symlink(dir,original,process.platform==='win32'?'junction':'dir');}
  }return reply;};
  const status=await manager.snapshot(PROFILE,'windows');assert.equal(status.state,'unsafe',destination);assert.equal(status.canRestore,false);
  const file=path.join(dir,'vm-labs','registry.json'),before=await fs.readFile(file,'utf8'),record=JSON.parse(before).records[PROFILE+':windows'];assert.equal(record.snapshotPending,true);assert.equal(record.snapshotId,undefined);
  const count=mutations(engine).length;assert.equal((await manager.restore(PROFILE,'windows')).state,'unsafe');assert.equal(mutations(engine).length,count);assert.equal(await fs.readFile(file,'utf8'),before);
 }
});
test('initialized EFI fields reject ambiguous values and mismatched firmware before base registration',async t=>{
 const edits=[
  text=>text.replace('UEFI Secure Boot:            enabled','UEFI Secure Boot:            unknown'),
  text=>text.replace('UEFI Secure Boot:            enabled','UEFI Secure Boot:            enabled\nUEFI Secure Boot:            enabled'),
  text=>text.replace(/^BIOS NVRAM File:.*\n/m,''),
  text=>text.replace(/^(BIOS NVRAM File:.*)$/m,'$1\n$1'),
  text=>text.replace('Firmware:                    EFI','Firmware:                    BIOS')
 ];
 for(const edit of edits){const {manager,engine}=await initializedEFI(t);engine.editSnapshot=edit;assert.equal((await manager.snapshot(PROFILE,'windows')).state,'unsafe');}
});
test('EFI NVRAM path and Secure Boot changes cannot restore or rewrite the registered fingerprint',async t=>{
 for(const change of ['path','secureBoot','removed']){
  const {manager,engine,dir}=await initializedEFI(t);assert.equal((await manager.snapshot(PROFILE,'windows')).state,'configured');
  const file=path.join(dir,'vm-labs','registry.json'),before=await fs.readFile(file,'utf8'),count=mutations(engine).length;
  if(change==='path'){const replacement=path.join(engine.vm.SnapFldr,'2026-11-02T20-50-41-116000000Z.nvram');await fs.copyFile(engine.savedVM.NvramFile,replacement);engine.savedVM.NvramFile=replacement;}
  else if(change==='secureBoot')engine.savedVM.SecureBoot='off';
  else{delete engine.savedVM.NvramFile;delete engine.savedVM.SecureBoot;}
  assert.equal((await manager.restore(PROFILE,'windows')).state,'unsafe',change);assert.equal(mutations(engine).length,count);assert.equal(await fs.readFile(file,'utf8'),before);
 }
});
