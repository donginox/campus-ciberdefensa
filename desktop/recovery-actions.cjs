'use strict';
const messages={RECOVERY_INSPECT:'Volvé a inspeccionar las copias antes de restaurar.',RECOVERY_INVALID:'La copia cambió o no es válida. Volvé a inspeccionar las copias.',RECOVERY_CAPACITY:'Ya hay cinco originales preservados. Archivá esos archivos fuera de la carpeta de datos antes de otra recuperación.',CORRUPT_STORE:'Los datos actuales no pudieron validarse. El archivo original se conserva.'};
function publicError(error){const code=typeof error?.message==='string'?error.message.split(':',1)[0]:'';return new Error(messages[code]||'No se pudo completar la recuperación. Revisá la copia y los permisos de la carpeta de datos; el original se conserva.');}
class RecoveryActions{
 constructor({store,confirmRestore=async()=>false,chooseExternal=async()=>null,confirmExternal=async()=>false,openFolder=async()=>false}){Object.assign(this,{store,confirmRestore,chooseExternal,confirmExternal,openFolder});this.previews=new Map();}
 async status(){try{const result=await this.store.recoveryStatus();this.previews=new Map(result.candidates.map(c=>[c.id,c]));return result}catch(e){throw publicError(e)}}
 async recover(id){try{const preview=this.previews.get(id);if(!preview)throw Error('RECOVERY_INSPECT: Sin preview');if(!await this.confirmRestore(preview))return {canceled:true};const profile=await this.store.recover(id);this.previews.clear();return {canceled:false,profile}}catch(e){throw publicError(e)}}
 async external(){try{const text=await this.chooseExternal();if(text===null)return {canceled:true};const preview=await this.store.inspectExternalBackup(text);if(!await this.confirmExternal(preview))return {canceled:true};const profile=await this.store.recoverExternalBackup(text);this.previews.clear();return {canceled:false,profile}}catch(e){throw publicError(e)}}
 async open(){try{await this.openFolder();return {opened:true}}catch(e){throw publicError(e)}}
}
module.exports={RecoveryActions,publicError};
