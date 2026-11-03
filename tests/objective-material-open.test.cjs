'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),security=require('../desktop/security.cjs');
test('native material opener loads the validated section URL and retains read-only child restrictions',async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../desktop/main.cjs'),'utf8'),start=source.indexOf('async function openMaterial('),end=source.indexOf('\nasync function ',start+1),opened=[];
 assert.ok(start>=0&&end>start,'Exercise the actual native opener in an Electron boundary adapter');
 class BrowserWindow{constructor(options){this.options=options;this.webContents={session:{setPermissionRequestHandler:handler=>this.request=handler,setPermissionCheckHandler:handler=>this.check=handler,on:(name,handler)=>{this[name]=handler}}};opened.push(this)}async loadURL(url){this.url=url}}
 const context=vm.createContext({security,BrowserWindow,mainWindow:{},preferences:{sandbox:true,contextIsolation:true,nodeIntegration:false},protect:(child,allow)=>{child.allow=allow}});
 vm.runInContext(source.slice(start,end)+'\nglobalThis.openMaterial=openMaterial;',context);
 await context.openMaterial({file:'objective-bridges.html',anchor:'pivot'});const child=opened[0];
 assert.equal(child.url,'campus://app/assets/materials/objective-bridges.html#pivot');assert.equal(child.allow,security.trustedMaterialUrl);assert.equal(child.allow(child.url),true);assert.equal(child.options.webPreferences.partition,'material-readonly');assert.equal(child.options.webPreferences.sandbox,true);assert.equal(child.options.webPreferences.nodeIntegration,false);
 let allowed;child.request(null,'camera',value=>allowed=value);assert.equal(allowed,false);assert.equal(child.check(),false);let prevented=false;child['will-download']({preventDefault:()=>prevented=true});assert.equal(prevented,true);
 await context.openMaterial('windows/guia.txt');assert.equal(opened[1].url,'campus://app/assets/materials/windows/guia.txt');
 await assert.rejects(()=>context.openMaterial({file:'objective-bridges.html',anchor:'../evil'}));assert.equal(opened.length,2,'Reject before constructing a window');
 const dom=new(require('jsdom').JSDOM)(fs.readFileSync(path.join(__dirname,'../assets/materials/objective-bridges.html'),'utf8'));
 assert.match(dom.window.document.getElementById(new URL(child.url).hash.slice(1)).textContent,/Rutas y reenvío entre segmentos/);dom.window.close();
});
