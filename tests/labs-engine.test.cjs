const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../src/labs/lab-engine.js');

test('virtual terminal changes only a cloned filesystem and resolves parent paths', () => {
 const original = engine.startLab('linux-permissions');
 let result = engine.runCommand(original, 'mkdir evidence');
 assert.equal(original.fs['/home/student/evidence'], undefined);
 result = engine.runCommand(result.state, 'cd evidence');
 result = engine.runCommand(result.state, 'touch note.txt');
 result = engine.runCommand(result.state, 'echo "caso 42" > note.txt');
 assert.equal(engine.runCommand(result.state,'cat ../evidence/note.txt').output, 'caso 42');
 assert.equal(engine.runCommand(result.state,'pwd').output, '/home/student/evidence');
 assert.match(engine.runCommand(result.state,'cat /etc/passwd').output, /no existe/i);
 assert.match(engine.runCommand(result.state,'ls; whoami').output, /no permitido|no admitido/i);
});
test('permission lab verifies final state and rejects unrelated command history', () => {
 let state = engine.startLab('linux-permissions');
 assert.equal(engine.evaluate('linux-permissions',{state}).passed,false);
 state = engine.runCommand(state,'chmod 600 incident.txt').state;
 assert.equal(engine.evaluate('linux-permissions',{state}).passed,true);
 assert.equal(engine.evaluate('linux-permissions',{state:{history:['chmod 600 incident.txt']}}).passed,false);
});
test('IPv4 boundaries include point-to-point and host routes without overflow', () => {
 assert.deepEqual(engine.calculateSubnet('192.0.2.131/26'), {network:'192.0.2.128',broadcast:'192.0.2.191',firstHost:'192.0.2.129',lastHost:'192.0.2.190',usableHosts:62,prefix:26,mask:'255.255.255.192'});
 assert.equal(engine.calculateSubnet('192.0.2.11/31').usableHosts,2);
 assert.equal(engine.calculateSubnet('192.0.2.11/31').firstHost,'192.0.2.10');
 assert.equal(engine.calculateSubnet('255.255.255.255/32').lastHost,'255.255.255.255');
 assert.equal(engine.calculateSubnet('0.0.0.0/0').usableHosts,4294967294);
 for(const bad of ['1.2.3.999/24','1.2.3/24','1.2.3.4/33','1.2.3.4/-1',null]) assert.throws(()=>engine.calculateSubnet(bad));
});
test('log investigation correlates an exact source and preserves benign events', () => {
 const suspicious = engine.queryLog({sourceIp:'203.0.113.44'});
 assert.equal(suspicious.length,5);
 assert.equal(suspicious.filter(x=>x.outcome==='failure').length,3);
 assert.equal(engine.queryLog({sourceIp:'203.0.113.4'}).length,0);
 assert.equal(engine.queryLog({outcome:'failure',username:'ana'}).length,1);
 assert.equal(engine.evaluate('incident-logs',{sourceIp:'203.0.113.44',account:'backup',evidenceIds:'E02,E03,E04,E05,E06'}).passed,true);
 assert.equal(engine.evaluate('incident-logs',{sourceIp:'198.51.100.20',account:'ana',evidenceIds:'E01'}).passed,false);
});
test('evaluation requires case decisions and never awards unknown or empty answers', () => {
 assert.throws(()=>engine.evaluate('unknown',{}));
 for(const lab of engine.catalog) assert.equal(engine.evaluate(lab.id,{}).passed,false,lab.id);
 assert.equal(engine.evaluate('windows-acl',{principal:'Soporte',permission:'read',inheritance:'remove'}).passed,true);
 assert.equal(engine.evaluate('phishing-triage',{verdict:'phishing',signal:'domain',action:'report'}).passed,true);
 assert.equal(engine.evaluate('recovery-evidence',{order:'isolate,preserve,restore,validate',source:'verified-backup',validation:'hash-and-service'}).passed,true);
});
test('SHA-256 computes actual bytes and integrity evaluation depends on result', async () => {
 assert.equal(await engine.hashText('abc'),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
 const digest=await engine.hashText(engine.integritySample);
 assert.equal(engine.evaluate('integrity-hash',{digest,decision:'match'}).passed,true);
 assert.equal(engine.evaluate('integrity-hash',{digest:'sha256',decision:'match'}).passed,false);
});

test('virtual permissions deny reads and writes without owner bits and reject broken filesystem state', () => {
 let state=engine.startLab('linux-permissions');
 state=engine.runCommand(state,'chmod 000 incident.txt').state;
 assert.match(engine.runCommand(state,'cat incident.txt').output,/permiso/i);
 assert.match(engine.runCommand(state,'echo cambio > incident.txt').output,/permiso/i);
 assert.equal(state.fs['/home/student/incident.txt'].content,'CASO-42: informe sintético confidencial.\n');
 const result=engine.runCommand({...state,cwd:'/missing'},'pwd');
 assert.match(result.output,/estado virtual/i);
 assert.equal(engine.runCommand(state,'chmod 999 incident.txt').state.fs['/home/student/incident.txt'].mode,'000');
});

test('directory search and write permissions affect virtual traversal and creation', () => {
 let state=engine.startLab('linux-permissions');
 state=engine.runCommand(state,'mkdir private').state;
 state=engine.runCommand(state,'touch private/note').state;
 state=engine.runCommand(state,'chmod 600 private').state;
 assert.match(engine.runCommand(state,'cat private/note').output,/permiso/i);
 assert.match(engine.runCommand(state,'cd private').output,/permiso/i);
 state=engine.runCommand(state,'chmod 500 private').state;
 assert.match(engine.runCommand(state,'touch private/new').output,/permiso/i);
 assert.equal(engine.runCommand(state,'cat private/note').output,'');
});
