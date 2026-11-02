const {test}=require('node:test');const assert=require('node:assert/strict');let Gate;try{({CloseGate:Gate}=require('../desktop/close-gate.cjs'));}catch{}
test('closing remains blocked until renderer acknowledges and main writes finish',async()=>{
 assert.equal(typeof Gate,'function');const gate=new Gate();assert.equal(gate.request(),false);assert.equal(gate.request(),false);let finish;const disk=new Promise(resolve=>finish=resolve);const ready=gate.ready(()=>disk);assert.equal(gate.allowed,false);finish();await ready;assert.equal(gate.request(),true);
});
test('a disk failure preserves close protection and permits a later retry',async()=>{
 assert.equal(typeof Gate,'function');const gate=new Gate();gate.request();await assert.rejects(()=>gate.ready(async()=>{throw Error('disk full');}),/disk full/);assert.equal(gate.allowed,false);await gate.ready(async()=>{});assert.equal(gate.allowed,true);
});
