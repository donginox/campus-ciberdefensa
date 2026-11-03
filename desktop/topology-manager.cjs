'use strict';
const path=require('node:path');const os=require('node:os');const fs=require('node:fs/promises');
const {VirtualMachineManager}=require('./vm-manager.cjs');
const NODE_IDS=Object.freeze(['workstation','router','server']);
const TEMPLATES=Object.freeze({workstation:'topology-windows',router:'topology-router',server:'topology-server'});
const MEMORY=Object.freeze({workstation:4096,router:2048,server:2048});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
class TopologyManager{
 constructor({dataDir,memoryInfo=()=>({totalMemoryMiB:Math.floor(os.totalmem()/1048576),availableMemoryMiB:Math.floor(os.freemem()/1048576)}),...options}={}){
  if(typeof dataDir!=='string'||!path.isAbsolute(dataDir))throw Error('dataDir must be absolute');
  this.vm=new VirtualMachineManager({...options,dataDir:path.join(dataDir,'topology-v1'),templateFamily:'topology-v1'});this.memoryInfo=memoryInfo;this.queue=Promise.resolve();
 }
 validate(profileId,nodeId){if(typeof profileId!=='string'||!UUID.test(profileId)||nodeId!==undefined&&!NODE_IDS.includes(nodeId))throw Error('Invalid topology request');}
 serial(fn){const next=this.queue.then(fn);this.queue=next.catch(()=>{});return next;}
 async doctor(){const base=await this.vm.doctor(),memory=this.memoryInfo();return{...base,...memory,ready:base.ready&&memory.totalMemoryMiB>=16384,guestBudgetMiB:8192,hostReserveMiB:8192,message:memory.totalMemoryMiB<16384?'La topología requiere 16 GiB totales: hasta 8 GiB invitados y 8 GiB reservados para el host.':base.message};}
 async readStatus(profileId){const nodes=[];for(const nodeId of NODE_IDS)nodes.push({...(await this.vm.status(profileId,TEMPLATES[nodeId])),nodeId,guestConfigured:false});return{profileId,nodes,guestReady:false,message:'El estado de VirtualBox no comprueba instalación, cuentas, servicios ni firewall del invitado. Registrá las pruebas de las campañas por separado.'};}
 async status(profileId){this.validate(profileId);return this.serial(()=>this.readStatus(profileId));}
 async startBudget(profileId,nodeId){const target=await this.vm.status(profileId,TEMPLATES[nodeId]);if(target.state!=='configured')return target;const registry=await this.vm.registry();let allocated=0;for(const record of Object.values(registry.records)){const state=await this.vm.status(record.profileId,record.templateId);if(['unsafe','error','unavailable'].includes(state.state))return{state:'unsafe',code:'budget_unverified',message:'No se pudo verificar el consumo de todos los nodos propios. Comprobá su estado.'};if(state.state==='running')allocated+=MEMORY[Object.keys(TEMPLATES).find(id=>TEMPLATES[id]===record.templateId)];}
  const memory=this.memoryInfo();if(allocated+MEMORY[nodeId]>8192||memory.availableMemoryMiB-MEMORY[nodeId]<8192||memory.totalMemoryMiB<16384)return{state:'error',code:'memory_budget',message:'Inicio bloqueado: se requieren 8 GiB libres para el host y un máximo de 8 GiB para todos los nodos de Campus, incluso los de otros perfiles.'};
  return this.vm.start(profileId,TEMPLATES[nodeId]);
 }
 async operate(action,profileId,nodeId,options){this.validate(profileId,nodeId);return this.serial(async()=>{let operation;try{operation=action==='start'?await this.startBudget(profileId,nodeId):await this.vm[action](profileId,TEMPLATES[nodeId],options);}catch{operation={state:'error',code:'operation_failed',message:'No se completó la operación. Comprobá el estado de este nodo antes de reintentar; no se eliminaron recursos.'};}return{...(await this.readStatus(profileId)),operation:{...operation,nodeId}};});}
 create(profileId,nodeId,options){return this.operate('create',profileId,nodeId,options);}
 start(profileId,nodeId){return this.operate('start',profileId,nodeId);}
 stop(profileId,nodeId){return this.operate('stop',profileId,nodeId);}
 snapshot(profileId,nodeId){return this.operate('snapshot',profileId,nodeId);}
 restore(profileId,nodeId){return this.operate('restore',profileId,nodeId);}
 async exportKit(profileId){this.validate(profileId);return this.serial(async()=>{const manifest={format:'campus-topology-guest-kit',version:1,profileId,nodes:[]};for(const nodeId of NODE_IDS){const s=await this.vm.status(profileId,TEMPLATES[nodeId]);if(!['configured','running'].includes(s.state))throw Error('Creá y verificá los tres nodos propios antes de exportar el paquete.');const {record,info}=await this.vm.inspect(profileId,TEMPLATES[nodeId]);manifest.nodes.push({nodeId,uuid:record.uuid,nics:[1,...(nodeId==='router'?[2]:[])].map(n=>({mac:info['macaddress'+n],network:info['intnet'+n],address:nodeId==='workstation'?'10.78.10.10/24':nodeId==='server'?'10.78.20.20/24':n===1?'10.78.10.1/24':'10.78.20.1/24'}))});}
   const files=[{name:'manifest.json',content:JSON.stringify(manifest,null,2)}];for(const name of ['topology-guide.html','topology-linux.sh','topology-windows.ps1'])files.push({name,content:await fs.readFile(path.join(__dirname,'..','assets','materials',name),'utf8')});return{manifest,files};});}
}
module.exports={TopologyManager};
