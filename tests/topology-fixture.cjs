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
async function setup(t,managerOptions={}){
 assert.equal(typeof VirtualMachineManager,'function');const dir=await fs.mkdtemp(path.join(os.tmpdir(),'campus-vm-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));const iso=path.join(dir,'install.iso');await fs.writeFile(iso,'fixture');
 const engine={calls:[],vm:null,extra:{},fail:null,snap:null};
 engine.runner=async(exe,a,options)=>{engine.calls.push(a);assert.equal(options.shell,false);assert.equal(options.windowsHide,true);if(engine.fail===a[0])throw Error('secret stderr');const v=engine.vm;const arg=n=>a[a.indexOf(n)+1];
  if(a[0]==='--version')return{stdout:'7.2.22r175245'};
  if(a[0]==='list'&&a[1]==='hostinfo')return{stdout:'Processor supports HW virtualization: yes\nMemory size: 32768 MByte'};
  if(a[0]==='createvm'){const name=arg('--name'),folder=path.join(arg('--basefolder'),name);await fs.mkdir(folder);await fs.writeFile(path.join(folder,name+'.vbox'),'fixture');engine.vm={UUID:arg('--uuid'),name,CfgFile:path.join(folder,name+'.vbox'),SnapFldr:path.join(folder,'Snapshots'),VMState:'poweroff',memory:0,cpus:1,clipboard:'disabled',clipboardfiletransfers:'disabled',draganddrop:'disabled',usb:'off',ehci:'off',xhci:'off',vrde:'off',nic1:'intnet',nicpromisc1:'deny',uart1:'off',uart2:'off',uart3:'off',uart4:'off',lpt1:'off',lpt2:'off',teleporter:'off',recording:'off',storagecontrollername0:'SATA'};for(let n=2;n<=8;n++)engine.vm['nic'+n]='none';return{stdout:''};}
  if(a[0]==='setextradata'){engine.extra[a[2]]=a[3];return{stdout:''};}
  if(a[0]==='getextradata')return{stdout:'Value: '+engine.extra[a[2]]};
  if(a[0]==='modifyvm'){v.firmware=a.includes('--firmware')?'EFI':'BIOS';v.memory=+arg('--memory');v.cpus=+arg('--cpus');v.intnet1=arg('--intnet1');for(let n=1;n<=8;n++){for(const key of ['nic','intnet','macaddress'])if(a.includes('--'+key+n))v[key+n]=arg('--'+key+n);}v.audio='none';v.audio_in='off';v.audio_out='off';return{stdout:''};}
  if(a[0]==='createmedium'){engine.disk={id:crypto.randomUUID(),file:arg('--filename'),capacity:+arg('--size')};await fs.writeFile(engine.disk.file,'disk');return{stdout:''};}
  if(a[0]==='storagectl')return{stdout:''};
  if(a[0]==='storageattach'){v['SATA-'+arg('--port')+'-0']=arg('--medium');return{stdout:''};}
  if(a[0]==='showvminfo'&&a.includes('--details'))return{stdout:[1,2].filter(n=>v['nic'+n]==='intnet').map(n=>`NIC ${n}: MAC: ${v['macaddress'+n]||'080027001122'}, Attachment: Internal Network '${v['intnet'+n]}', Cable connected: on, Trace: ${v['nictrace'+n]==='on'?'on':'off'} (file: none), Promisc Policy: ${v['nicpromisc'+n]||'deny'}`).join('\n')+'\nUSB Device Filters: <none>\nShared folders: <none>'};
  if(a[0]==='showvminfo')return{stdout:encode(v)};
  if(a[0]==='showmediuminfo'){const child=engine.child&&(a[2]===engine.child.file||a[2]===engine.child.id);const medium=child?engine.child:engine.disk;return{stdout:`UUID: ${medium.id}\nParent UUID: ${child?medium.parent:'base'}\nState: created\nType: ${child?medium.type:engine.type||'normal (base)'}\nLocation: ${medium.file}\nStorage format: VDI\nFormat variant: ${child?medium.variant:engine.variant||'dynamic default'}\nCapacity: ${engine.capacity||engine.disk.capacity} MBytes`};}
  if(a[0]==='startvm'){v.VMState='running';return{stdout:''};}
  if(a[0]==='controlvm'){assert.equal(a[2],'acpipowerbutton');return{stdout:''};}
  if(a[0]==='snapshot'){if(a[2]==='take'){engine.snap=crypto.randomUUID();engine.savedVM={...v};engine.snapshotDescription=arg('--description');const id=crypto.randomUUID();engine.child={id,parent:engine.disk.id,file:path.join(v.SnapFldr,`{${id}}.vdi`),type:'normal (differencing)',variant:'differencing default'};await fs.mkdir(v.SnapFldr,{recursive:true});if(v.SecureBoot){engine.savedVM.NvramFile=path.join(v.SnapFldr,'2026-11-02T20-50-40-116000000Z.nvram');await fs.copyFile(v.NvramFile,engine.savedVM.NvramFile);}else delete engine.savedVM.NvramFile;await fs.writeFile(engine.child.file,'difference');v['SATA-0-0']=engine.child.file;return{stdout:''};}if(a[2]==='list')return{stdout:engine.snap?encode({SnapshotName:'Campus-base',SnapshotUUID:engine.snap,SnapshotDescription:engine.snapshotDescription,CurrentSnapshotName:'Campus-base',CurrentSnapshotUUID:engine.snap,CurrentSnapshotNode:'SnapshotName'}):''};if(a[2]==='showvminfo'){assert.equal(a[3],engine.snap);return{stdout:engine.editSnapshot?engine.editSnapshot(snapshotDetails(engine)):snapshotDetails(engine)};}if(a[2]==='restore'){assert.equal(a[3],engine.snap);return{stdout:''};}}
  throw Error('Unhandled '+a.join(' '));
 };const manager=new VirtualMachineManager({dataDir:dir,runner:engine.runner,platform:'win32',executable:path.join(dir,'VBoxManage.exe'),...managerOptions});return{dir,iso,engine,manager};
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

module.exports={setup,mutations};
