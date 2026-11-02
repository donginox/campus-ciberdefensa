'use strict';
// A separate opaque document has no preload, scripts, IPC, permissions or network.
async function renderPdf(html,{BrowserWindow,session}){
 if(typeof html!=='string'||Buffer.byteLength(html)>2*1024*1024)throw new Error('Documento de exportación inválido.');
 const partition='portfolio-readonly';const context=session.fromPartition(partition);context.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));context.setPermissionCheckHandler(()=>false);
 const win=new BrowserWindow({show:false,width:900,height:1200,webPreferences:{partition,contextIsolation:true,sandbox:true,nodeIntegration:false,webSecurity:true,webviewTag:false,backgroundThrottling:false}});
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',event=>event.preventDefault());win.webContents.on('will-attach-webview',event=>event.preventDefault());
 try{await win.loadURL('data:text/html;charset=utf-8;base64,'+Buffer.from(html).toString('base64'));return await win.webContents.printToPDF({printBackground:true,preferCSSPageSize:true,displayHeaderFooter:true,headerTemplate:'<span></span>',footerTemplate:'<div style="width:100%;text-align:center;font-size:8px;color:#425469">Campus Ciberdefensa · <span class="pageNumber"></span> / <span class="totalPages"></span></div>'});}finally{if(!win.isDestroyed())win.destroy();}
}
module.exports={renderPdf};
