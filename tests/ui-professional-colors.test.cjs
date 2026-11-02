'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');const {JSDOM}=require('jsdom');
function luminance(color){const rgb=color.startsWith('#')?(color.length===4?color.slice(1).split('').map(c=>parseInt(c+c,16)):color.slice(1).match(/../g).map(c=>parseInt(c,16))):color.match(/[\d.]+/g).slice(0,3).map(Number);return rgb.map(c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4}).reduce((n,c,i)=>n+c*[.2126,.7152,.0722][i],0);}
for(const theme of ['light','dark'])for(const selector of ['[data-vm-action="create"]','.module-icon'])test(`${selector} remains readable in ${theme} theme`,()=>{
 const dom=new JSDOM('<!doctype html><html><head></head><body><div class="vm-actions"><button data-vm-action="create">Crear VM</button></div><span class="module-icon" aria-hidden="true">SO</span></body></html>');const w=dom.window,d=w.document;d.documentElement.dataset.theme=theme;
 const style=d.createElement('style');style.textContent=fs.readFileSync(require.resolve('../src/renderer/style.css'),'utf8')+'\n'+fs.readFileSync(require.resolve('../src/renderer/vm-hub.css'),'utf8');d.head.append(style);
 const tokens=w.getComputedStyle(d.documentElement);const resolve=value=>value.replace(/var\((--[^)]+)\)/g,(_,key)=>tokens.getPropertyValue(key).trim());
 // jsdom does not expand custom properties in background shorthand; resolve the actual theme tokens before computing the cascade.
 style.textContent=resolve(style.textContent);
 {const css=w.getComputedStyle(d.querySelector(selector));const fg=luminance(resolve(css.color)),bg=luminance(resolve(css.backgroundColor));const ratio=(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05);assert.ok(ratio>=4.5,`${selector} contrast ${ratio.toFixed(2)} in ${theme}`);}w.close();
});
