'use strict';
class ProfessionalActions{
 constructor({store,observer,vms,chooseISO,confirmRestore,exportPortfolio}){Object.assign(this,{store,observer,vms,chooseISO,confirmRestore,exportPortfolioFile:exportPortfolio});}
 systemPracticeInfo(){return this.observer.info();}
 async observeSystem(input){await this.store.getProfile(input.profileId);return this.observer.observe(input.kind);}
 vmDoctor(){return this.vms.doctor();}
 async vmCall(method,input,...args){await this.store.getProfile(input.profileId);return this.vms[method](input.profileId,input.templateId,...args);}
 vmStatus(input){return this.vmCall('status',input);}
 vmStart(input){return this.vmCall('start',input);}
 vmStop(input){return this.vmCall('stop',input);}
 vmSnapshot(input){return this.vmCall('snapshot',input);}
 async vmCreate(input){await this.store.getProfile(input.profileId);const isoPath=await this.chooseISO(input.templateId);if(!isoPath)return{canceled:true};return{canceled:false,snapshot:await this.vmCall('create',input,{isoPath})};}
 async vmRestore(input){const current=await this.vmStatus(input);if(current.canRestore!==true)throw new Error('No hay un punto de restauración propio verificado.');if(!await this.confirmRestore(input.templateId))return{canceled:true};return{canceled:false,snapshot:await this.vmCall('restore',input)};}
 async exportPortfolio(input){const profile=await this.store.getProfile(input.profileId);return this.exportPortfolioFile(profile,input.format);}
}
module.exports={ProfessionalActions};
