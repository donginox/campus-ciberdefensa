const test=require('node:test'),assert=require('node:assert/strict');
const {validateCall}=require('../desktop/security.cjs');
const profileId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',previewId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
test('offline exchange IPC uses exact fields, opaque previews and bounded decisions',()=>{
 for(const method of ['mergePreview','tutorPreview'])assert.deepEqual(validateCall(method,{profileId}),{profileId});
 for(const method of ['mergeCancel','tutorCommit'])assert.deepEqual(validateCall(method,{profileId,previewId}),{profileId,previewId});
 assert.deepEqual(validateCall('mergeCommit',{profileId,previewId,decisions:{conflict1:'both'}}).decisions,{conflict1:'both'});
 assert.equal(validateCall('tutorExport',{profileId,attemptId:'independent-assessment:attempt-1'}).attemptId,'independent-assessment:attempt-1');
 for(const[method,payload]of [['mergePreview',{profileId,path:'C:/private'}],['mergeCommit',{profileId,previewId,decisions:{x:'execute'}}],['mergeCommit',{profileId,previewId,decisions:JSON.parse('{"__proto__":"both"}')}],['tutorCommit',{profileId,previewId:'../file'}],['tutorExport',{profileId,attemptId:'x'.repeat(201)}]])assert.throws(()=>validateCall(method,payload));
});
