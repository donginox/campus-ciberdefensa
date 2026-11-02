'use strict';
// All resource selectors have already passed security.validateCall at the IPC boundary.
class MissionActions {
 constructor({manager,store,confirmReset,openExternal}){Object.assign(this,{manager,store,confirmReset,openExternal});}
 catalog(){return this.manager.catalog();}
 async call(method,input,...extra){await this.store.getProfile(input.profileId);return this.manager[method](input.profileId,input.labId,...extra);}
 status(input){return this.call('status',input);}
 start(input){return this.call('start',input);}
 stop(input){return this.call('stop',input);}
 events(input){return this.call('events',input);}
 replay(input){return this.call('replay',input);}
 query(input){return this.call('query',input,input.query);}
 assess(input){return this.call('assess',input,{actor:input.actor,failures:input.failures});}
 contain(input){return this.call('contain',input,input.actor);}
 async reset(input){
  const current=await this.status(input);
  if(current.state==='unsafe'||current.capabilities?.reset!==true)throw new Error('No hay un entorno propio validado para restablecer.');
  if(!await this.confirmReset(input.labId))return {canceled:true};
  return {canceled:false,snapshot:await this.call('reset',input)};
 }
 async open(input){
  const current=await this.status(input);let url;
  if(current.state!=='running'||current.capabilities?.open!==true)throw new Error('Esperá a que el servicio esté disponible.');
  try{url=new URL(current.url);}catch{throw new Error('El entorno no tiene una dirección local válida.');}
  const port=Number(url.port);
  if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||url.username||url.password||url.pathname!=='/'||url.search||url.hash||!Number.isInteger(port)||port<1024||port>65535)throw new Error('La dirección del entorno no es un puerto loopback permitido.');
  await this.openExternal(url.href);return {opened:true};
 }
}
module.exports={MissionActions};
