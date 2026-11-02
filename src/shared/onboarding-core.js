(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OnboardingCore=api})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const certifications=['cc','ccst','security-plus','btl1','ejpt'];
 const environments=['windows','linux-other','own-vm','docker','offline'];
 function validDate(value){if(typeof value!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+'T12:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value}
 function normalize(raw){
  const value=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  const checks={};for(const key of ['vm','docker','system']){const c=value.checks?.[key];if(c&&['available','unavailable','error'].includes(c.state)&&typeof c.checkedAt==='string'&&Number.isFinite(Date.parse(c.checkedAt)))checks[key]={state:c.state,checkedAt:c.checkedAt.slice(0,40)}}
  return {version:1,step:Number.isInteger(value.step)?Math.max(0,Math.min(2,value.step)):0,certificationId:certifications.includes(value.certificationId)?value.certificationId:'cc',targetDate:validDate(value.targetDate)?value.targetDate:'2026-12-15',availability:value.availability==='fixed'?'fixed':'flexible',weeklyMinutes:Number.isInteger(value.weeklyMinutes)?Math.max(30,Math.min(1200,value.weeklyMinutes)):360,environments:[...new Set((Array.isArray(value.environments)?value.environments:['offline']).filter(e=>environments.includes(e)))],checks,completed:value.completed===true,skipped:value.skipped===true};
 }
 function plan(raw){const r=normalize(raw);return {certificationId:r.certificationId,targetDate:r.targetDate,weeklyMinutes:r.availability==='flexible'?360:r.weeklyMinutes}}
 function finish(raw){if(!validDate(raw?.targetDate))throw Error('Elegí una fecha válida para revisar tu preparación.');const r=normalize(raw);if(!r.environments.length)throw Error('Elegí al menos un entorno, incluso si vas a estudiar sin motores.');return {...r,step:2,completed:true,skipped:false}}
 return {normalize,plan,finish,validDate};
});
