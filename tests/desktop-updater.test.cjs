const {test}=require('node:test');const assert=require('node:assert/strict');let api={};try{api=require('../desktop/update-state.cjs');}catch{}
test('updater state exposes safe data and clamps download percentages',()=>{
 assert.equal(typeof api.updateSnapshot,'function');
 assert.deepEqual(api.updateSnapshot('download-progress',{percent:122,token:'secret'}),{status:'downloading',percent:100,message:'Descargando actualización…'});
 assert.deepEqual(api.updateSnapshot('update-downloaded',{version:'0.1.9',releaseNotes:'<script>bad</script>'}),{status:'downloaded',version:'0.1.9',message:'Actualización lista. Se instalará después de guardar y cerrar.'});
 assert.equal(api.updateSnapshot('error',new Error('https://secret:token@github.com')).message,'No se pudo comprobar o descargar la actualización. Podés seguir estudiando sin conexión.');
});
