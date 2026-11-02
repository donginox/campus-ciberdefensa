'use strict';
class RealLabActions {
 constructor({manager,store,confirmReset,openExternal}){this.manager=manager;this.store=store;this.confirmReset=confirmReset;this.openExternal=openExternal;}
 doctor(){return this.manager.doctor();}
 async status(id){await this.store.getProfile(id);return this.manager.status(id);}
 async start(id){await this.store.getProfile(id);return this.manager.start(id);}
 async stop(id){await this.store.getProfile(id);return this.manager.stop(id);}
 async reset(id){await this.store.getProfile(id);const current=await this.manager.status(id);if(!['running','stopped'].includes(current.state)&&!(current.state==='error'&&current.canReset===true))throw new Error('No hay un objetivo propio válido para restablecer.');if(!await this.confirmReset())return {canceled:true};return {canceled:false,snapshot:await this.manager.reset(id)};}
 async open(id){
  await this.store.getProfile(id);const target=await this.manager.status(id);
  if(target.state!=='running'||typeof target.url!=='string')throw new Error('Primero iniciá y verificá el objetivo.');
  let url;try{url=new URL(target.url);}catch{throw new Error('El objetivo no tiene una dirección local válida.');}
  const port=Number(url.port);
  if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||url.username||url.password||url.pathname!=='/'||url.search||url.hash||!Number.isInteger(port)||port<1024||port>65535)throw new Error('La dirección del objetivo no es un puerto loopback permitido.');
  await this.openExternal(target.url);return {opened:true};
 }
}
module.exports={RealLabActions};
