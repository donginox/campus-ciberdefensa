'use strict';
function updateSnapshot(event,data={}){
 const states={checking:{status:'checking',message:'Buscando actualizaciones…'},'checking-for-update':{status:'checking',message:'Buscando actualizaciones…'},'update-not-available':{status:'current',message:'Ya tenés la versión más reciente.'},'update-available':{status:'available',message:'Hay una actualización disponible.'},'download-progress':{status:'downloading',message:'Descargando actualización…'},'update-downloaded':{status:'downloaded',message:'Actualización lista. Se instalará después de guardar y cerrar.'},error:{status:'error',message:'No se pudo comprobar o descargar la actualización. Podés seguir estudiando sin conexión.'},disabled:{status:'disabled',message:'Las actualizaciones se habilitan en la aplicación instalada.'}};
 const result={...(states[event]||states.error)};
 if(['update-available','update-not-available','update-downloaded'].includes(event)&&typeof data.version==='string'&&/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(data.version))result.version=data.version;
 if(event==='download-progress')result.percent=Number.isFinite(data.percent)?Math.max(0,Math.min(100,data.percent)):0;
 return result;
}
module.exports={updateSnapshot};
