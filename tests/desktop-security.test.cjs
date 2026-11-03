const {test}=require('node:test'); const assert=require('node:assert/strict');
const path=require('node:path'); const os=require('node:os');
let api={};try{api=require('../desktop/security.cjs');}catch{}
test('IPC accepts only exact trusted top frame belonging to main window',()=>{
 assert.equal(typeof api.assertTrustedSender,'function'); const frame={url:'campus://app/src/renderer/index.html'}, wc={mainFrame:frame};
 assert.doesNotThrow(()=>api.assertTrustedSender({sender:wc,senderFrame:frame},wc));
 frame.url='campus://app/src/renderer/index.html#main';assert.doesNotThrow(()=>api.assertTrustedSender({sender:wc,senderFrame:frame},wc));frame.url='campus://app/src/renderer/index.html';
 for(const event of [{sender:wc,senderFrame:{url:frame.url}},{sender:{},senderFrame:frame},{sender:wc,senderFrame:null}])assert.throws(()=>api.assertTrustedSender(event,wc));
 for(const url of ['https://app/src/renderer/index.html','campus://app/src/renderer/index.html?evil','campus://app/assets/materials/indice.html']){frame.url=url;assert.throws(()=>api.assertTrustedSender({sender:wc,senderFrame:frame},wc));}
});
test('resource mapping blocks traversal, remote hosts and unlisted materials',()=>{
 assert.equal(typeof api.resourcePath,'function');
 const root=path.resolve(os.tmpdir(),'campus-resource-fixture');
 assert.equal(api.resourcePath('campus://app/src/renderer/index.html',root),path.join(root,'src','renderer','index.html'));
 for(const url of ['campus://other/src/renderer/index.html','campus://app/src/renderer/%2e%2e/%2e%2e/package.json','campus://app/desktop/main.cjs','campus://app/assets/materials/missing.exe'])assert.throws(()=>api.resourcePath(url,root));
});
test('IPC payload schemas reject paths, malformed ids and unknown fields',()=>{
 assert.equal(typeof api.validateCall,'function');
 for(const [method,arg] of [['selectProfile','../p'],['createProfile',22],['saveProfile',{id:'abc',expectedRevision:0}],['runSqlLab',{query:'x'.repeat(21000),taskId:'sql'}],['openMaterial','../package.json'],['getAppInfo',{token:'x'}]]) assert.throws(()=>api.validateCall(method,arg));
 assert.equal(api.validateCall('createProfile',' Ana '),'Ana'); assert.equal(api.validateCall('openMaterial','indice.html'),'indice.html');
});
test('external links permit only bounded HTTPS URLs without embedded credentials',()=>{
 assert.equal(typeof api.externalUrl,'function');
 assert.equal(api.externalUrl('https://www.netacad.com/courses/networking#learn'),'https://www.netacad.com/courses/networking#learn');
 for(const value of ['javascript:alert(1)','file:///C:/Windows/system32/cmd.exe','https://user:password@example.com','http://example.com','https://example.com/\npath','https://example.com/'+'a'.repeat(2100),{},null])assert.equal(api.externalUrl(value),null);
});
test('material navigation follows whitelisted notebooks and anchors without reaching the renderer',()=>{
 assert.equal(typeof api.trustedMaterialUrl,'function');
 for(const url of ['campus://app/assets/materials/blue-team.html','campus://app/assets/materials/windows.html','campus://app/assets/materials/indice.html#inicio','campus://app/assets/materials/windows/guia.txt']) assert.equal(api.trustedMaterialUrl(url),true);
 for(const url of ['campus://app/assets/materials/../src/renderer/index.html','campus://app/src/renderer/index.html','campus://other/assets/materials/windows.html','campus://user:password@app/assets/materials/windows.html','campus://app/assets/materials/windows.html?x=1','campus://app/assets/materials/unlisted.html','https://example.com/windows.html'])assert.equal(api.trustedMaterialUrl(url),false);
});

test('objective section references accept only catalog anchors on the fixed guide and preserve filename calls',()=>{
 const catalog=require('../src/content/objectives.json'),anchors=new Set(catalog.certifications.flatMap(c=>c.domains.flatMap(d=>d.objectives.map(o=>o.materialAnchor))));
 for(const anchor of anchors){const ref={file:'objective-bridges.html',anchor};assert.deepEqual(api.validateCall('openMaterial',ref),ref);assert.deepEqual(api.materialReference(ref),ref);}
 for(const file of require('../src/content/materials-manifest.json')){assert.equal(api.validateCall('openMaterial',file),file);assert.equal(api.validateCall('exportMaterial',file),file);assert.equal(api.materialReference(file).file,file);}
 for(const value of [null,[],{},'objective-bridges.html#pivot',{file:'objective-bridges.html',anchor:'missing-section'},{file:'windows.html',anchor:'pivot'},{file:'../objective-bridges.html',anchor:'pivot'},{file:'objective-bridges.html#pivot',anchor:'pivot'},{file:'objective-bridges.html',anchor:'pivot',url:'https://evil.test'},JSON.parse('{"file":"objective-bridges.html","anchor":"pivot","__proto__":{}}'),Object.assign(Object.create({inherited:true}),{file:'objective-bridges.html',anchor:'pivot'}),...['','Pivot','../pivot','#pivot','%70ivot','pivot\n','pivot\u0000','pivot/attack'].map(anchor=>({file:'objective-bridges.html',anchor}))])assert.throws(()=>api.validateCall('openMaterial',value));
 assert.throws(()=>api.validateCall('exportMaterial',{file:'objective-bridges.html',anchor:'pivot'}));
});
