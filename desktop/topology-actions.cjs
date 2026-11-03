'use strict';
class TopologyActions{
 constructor({store,manager,chooseISO,confirmRestore,saveKit}){Object.assign(this,{store,manager,chooseISO,confirmRestore,saveKit});}
 doctor(){return this.manager.doctor();}
 async status({profileId}){await this.store.getProfile(profileId);return this.manager.status(profileId);}
 async call(method,{profileId,nodeId},...args){await this.store.getProfile(profileId);return this.manager[method](profileId,nodeId,...args);}
 async create(input){await this.store.getProfile(input.profileId);const isoPath=await this.chooseISO(input.nodeId);if(!isoPath)return{canceled:true};return{canceled:false,snapshot:await this.call('create',input,{isoPath})};}
 start(input){return this.call('start',input);}
 stop(input){return this.call('stop',input);}
 snapshot(input){return this.call('snapshot',input);}
 async restore(input){const current=await this.status(input);if(!current.nodes?.find(n=>n.nodeId===input.nodeId)?.canRestore)throw Error('No hay una base de restauración propia verificada.');if(!await this.confirmRestore(input.nodeId))return{canceled:true};return{canceled:false,snapshot:await this.call('restore',input)};}
 async exportKit({profileId}){await this.store.getProfile(profileId);return this.saveKit(await this.manager.exportKit(profileId));}
}
module.exports={TopologyActions};
