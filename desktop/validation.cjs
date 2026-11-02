'use strict';
const forbidden = new Set(['__proto__','prototype','constructor']);
const credentials = /^(?:gh_token|github_token|accessToken|refreshToken|password|secret|apiKey|authorization)$/i;
function plain(value) { return value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype,null].includes(Object.getPrototypeOf(value)); }
function jsonData(value, maxBytes) {
 const seen=new Set(); let nodes=0;
 function visit(v,depth) {
  if(depth>80 || ++nodes>100000)throw new Error('Datos demasiado complejos.');
  if(v===null || typeof v==='boolean' || typeof v==='string' || (typeof v==='number' && Number.isFinite(v)))return;
  if(typeof v!=='object' || (!Array.isArray(v)&&!plain(v)) || seen.has(v))throw new Error('Datos JSON inválidos.');
  seen.add(v);
  for(const k of Object.keys(v)){if(forbidden.has(k)||credentials.test(k))throw new Error('Los datos contienen una clave no permitida.');visit(v[k],depth+1);}
  seen.delete(v);
 }
 visit(value,0); const text=JSON.stringify(value); if(Buffer.byteLength(text)>maxBytes)throw new Error('Los datos superan el tamaño máximo.'); return JSON.parse(text);
}
function name(value){if(typeof value!=='string'||!value.trim()||value.trim().length>80||/[\u0000-\u001f]/.test(value))throw new Error('El nombre debe tener entre 1 y 80 caracteres.'); return value.trim();}
function id(value){if(typeof value!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value))throw new Error('Identificador de perfil inválido.');return value;}
module.exports={plain,jsonData,name,id};
