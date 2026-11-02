'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),security=require('../desktop/security.cjs');
const id='12345678-1234-4234-8234-123456789abc';
test('IPC de prácticas, VMs y portafolio rechaza comandos y rutas enviados por renderer',()=>{
 for(const method of ['vmDoctor','systemPracticeInfo'])assert.equal(security.validateCall(method),undefined);
 for(const method of ['vmStatus','vmCreate','vmStart','vmStop','vmSnapshot','vmRestore']){assert.deepEqual(security.validateCall(method,{profileId:id,templateId:'linux'}),{profileId:id,templateId:'linux'});assert.throws(()=>security.validateCall(method,{profileId:id,templateId:'linux',isoPath:'C:/evil.iso'}));assert.throws(()=>security.validateCall(method,{profileId:id,templateId:'foreign-vm'}));}
 assert.equal(security.validateCall('observeSystem',{profileId:id,kind:'events'}).kind,'events');assert.throws(()=>security.validateCall('observeSystem',{profileId:id,kind:'exec',command:'whoami'}));
 assert.equal(security.validateCall('exportPortfolio',{profileId:id,format:'pdf'}).format,'pdf');assert.throws(()=>security.validateCall('exportPortfolio',{profileId:id,format:'exe'}));
});
test('cancelar ISO o restauración no muta VMs; perfiles inválidos no llegan al proveedor',async()=>{
 const {ProfessionalActions}=require('../desktop/professional-actions.cjs');const calls=[];let selected=null,confirmed=false;const vms={doctor:async()=>({ready:true}),status:async()=>({canRestore:true}),create:async(...args)=>{calls.push(['create',...args]);return{state:'configured'};},restore:async(...args)=>{calls.push(['restore',...args]);return{state:'configured'};},start:async(...args)=>{calls.push(['start',...args]);}};
 const actions=new ProfessionalActions({store:{getProfile:async value=>{if(value!==id)throw new Error('Perfil inexistente');return{id};}},vms,observer:{},chooseISO:async()=>selected,confirmRestore:async()=>confirmed});const input={profileId:id,templateId:'linux'};
 assert.deepEqual(await actions.vmCreate(input),{canceled:true});assert.equal(calls.length,0);await assert.rejects(actions.vmStart({...input,profileId:'no'}),/Perfil/);assert.equal(calls.length,0);
 selected='C:/own/selected.iso';assert.equal((await actions.vmCreate(input)).snapshot.state,'configured');assert.deepEqual(calls[0],['create',id,'linux',{isoPath:selected}]);
 assert.deepEqual(await actions.vmRestore(input),{canceled:true});assert.equal(calls.length,1);confirmed=true;await actions.vmRestore(input);assert.equal(calls[1][0],'restore');
});
