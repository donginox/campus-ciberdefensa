'use strict';
// Native dialogs remain in main. Coordinators never receive renderer paths.
class AdvancedActions{
 constructor({store,merge,tutor,chooseText,saveText}){Object.assign(this,{store,merge,tutor,chooseText,saveText});}
 async mergePreview({profileId}){
  await this.store.getProfile(profileId);const text=await this.chooseText('merge-backup',7*1024*1024);
  if(text===null)return{canceled:true};
  return{canceled:false,preview:this.merge.preview(await this.store.getProfile(profileId),text)};
 }
 async mergeCommit({profileId,previewId,decisions}){
  const current=await this.store.getProfile(profileId),result=this.merge.commit(current,previewId,decisions);
  const profile=await this.store.commitMergedProfile({id:profileId,expectedRevision:result.expectedRevision,study:result.study,labs:result.labs});
  this.merge.cancel(previewId);return{canceled:false,profile};
 }
 async mergeCancel({profileId,previewId}){await this.store.getProfile(profileId);this.merge.cancel(previewId);return{canceled:true};}
 async tutorExport({profileId,attemptId}){
  const packet=this.tutor.exportPackage(await this.store.getProfile(profileId),attemptId);
  return this.saveText('tutor-package',JSON.stringify(packet,null,2));
 }
 async tutorPreview({profileId}){
  await this.store.getProfile(profileId);const text=await this.chooseText('tutor-feedback',200000);
  if(text===null)return{canceled:true};return{canceled:false,...this.tutor.preview(await this.store.getProfile(profileId),text)};
 }
 async tutorCommit({profileId,previewId}){
  const current=await this.store.getProfile(profileId),result=this.tutor.commit(current,previewId);
  const profile=result.duplicate?current:await this.store.commitTutorReview({id:profileId,expectedRevision:result.expectedRevision,record:result.record});
  this.tutor.discard(previewId);return{canceled:false,duplicate:result.duplicate,record:result.record,profile};
 }
}
module.exports={AdvancedActions};
