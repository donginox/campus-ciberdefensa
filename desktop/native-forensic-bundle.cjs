'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),{createHash}=require('node:crypto');const v=require('./validation.cjs');
async function noLinks(file){const absolute=path.resolve(file),root=path.parse(absolute).root;let cursor=root;for(const part of absolute.slice(root.length).split(path.sep)){cursor=path.join(cursor,part);if((await fs.lstat(cursor)).isSymbolicLink())throw Error('No se verificó la propiedad: hay un enlace en la ruta del paquete.');}}
async function bounded(file,limit){
 await noLinks(file);const before=await fs.lstat(file);if(!before.isFile()||before.nlink!==1||before.size>limit)throw Error('El paquete no es regular, tiene enlaces o supera el tamaño seguro.');
 const handle=await fs.open(file,'r');try{const stat=await handle.stat();if(!stat.isFile()||stat.nlink!==1||stat.dev!==before.dev||stat.ino!==before.ino||stat.size!==before.size)throw Error('El paquete cambió mientras se verificaba.');const bytes=await handle.readFile();if(bytes.length>limit||bytes.length!==stat.size)throw Error('El tamaño del paquete cambió.');return bytes;}finally{await handle.close();}
}
async function readNativeBundle(directory){
 if(typeof directory!=='string'||!path.isAbsolute(directory))throw Error('Directorio del paquete inválido.');
 const manifest=v.jsonData(JSON.parse((await bounded(path.join(directory,'bundle-manifest.json'),16384)).toString('utf8')),16384);
 const allowed=['version','file','caseId','environment','bytes','sha256'];
 if(!v.plain(manifest)||Object.keys(manifest).length!==allowed.length||Object.keys(manifest).some(k=>!allowed.includes(k))||manifest.version!==1||manifest.file!=='forensic-native.zip'||manifest.caseId!=='alameda'||manifest.environment!=='ephemeral-windows-ci'||!Number.isSafeInteger(manifest.bytes)||manifest.bytes<1||manifest.bytes>64*1024*1024||typeof manifest.sha256!=='string'||!/^[a-f0-9]{64}$/.test(manifest.sha256))throw Error('Manifiesto del paquete incompatible.');
 const bytes=await bounded(path.join(directory,'forensic-native.zip'),manifest.bytes);
 if(bytes.length!==manifest.bytes||createHash('sha256').update(bytes).digest('hex')!==manifest.sha256)throw Error('La huella o el tamaño no coincide: no se exportó el paquete.');return bytes;
}
module.exports={readNativeBundle};
