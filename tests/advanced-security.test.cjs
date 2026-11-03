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
test('forensic IPC exposes structured bounded filters and closed datasets without acquisition or renderer file paths',()=>{
 for(const method of ['forensicStatus','forensicImport','forensicReset','forensicVerify','forensicExportNative'])assert.deepEqual(validateCall(method,{profileId}),{profileId});
 assert.equal(validateCall('forensicIngest',{profileId,datasetId:'alameda'}).datasetId,'alameda');
 assert.deepEqual(validateCall('forensicQuery',{profileId,kind:'auth.failure',actor:'lara',sourceIp:'10.78.10.10',limit:20}).limit,20);
 for(const[method,input]of [['forensicImport',{profileId,path:'C:/private'}],['forensicQuery',{profileId,sql:'SELECT * FROM host'}],['forensicQuery',{profileId,limit:201}],['forensicIngest',{profileId,datasetId:'host-security'}],['forensicIngest',{profileId,events:[]}]])assert.throws(()=>validateCall(method,input));
});
test('topology IPC closes node IDs and never accepts renderer ISO paths or network configuration',()=>{
 assert.doesNotThrow(()=>validateCall('topologyDoctor'));
 for(const method of ['topologyStatus','topologyExportKit'])assert.deepEqual(validateCall(method,{profileId}),{profileId});
 for(const method of ['topologyCreate','topologyStart','topologyStop','topologySnapshot','topologyRestore'])for(const nodeId of ['workstation','router','server'])assert.equal(validateCall(method,{profileId,nodeId}).nodeId,nodeId);
 for(const payload of [{profileId,nodeId:'foreign'},{profileId,nodeId:'router',isoPath:'C:/private.iso'},{profileId,nodeId:'router',network:'bridged'}])assert.throws(()=>validateCall('topologyCreate',payload));
});
