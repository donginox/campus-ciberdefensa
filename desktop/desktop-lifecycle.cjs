'use strict';
// Tracks complete IPC transactions, including chooser/CLI/registry/persist/export
// continuations. It never waits for guests to power off after a command returns.
class DesktopLifecycle {
 constructor(){this.pending=new Set();this.sealed=false;}
 run(operation){
  if(this.sealed)return Promise.reject(Error('Campus está finalizando el cierre. Esperá a que termine o volvé a intentarlo si falla.'));
  const task=Promise.resolve().then(operation);
  const settled=task.then(()=>({}),error=>({error}));
  this.pending.add(settled);
  settled.then(()=>this.pending.delete(settled));
  return task;
 }
 async drain(flush){
  // This fence begins only after the renderer has locked editing and completed
  // its last saveProfile. readyToClose itself is deliberately outside the set.
  this.sealed=true;
  try{
   const results=await Promise.all([...this.pending]);
   await flush();
   const failed=results.filter(result=>result.error);
   if(failed.length)throw Error('No se pudo finalizar una operación: '+failed.map(result=>String(result.error.message||result.error)).join('; '));
  }catch(error){this.sealed=false;throw error;}
 }
}
module.exports={DesktopLifecycle};
