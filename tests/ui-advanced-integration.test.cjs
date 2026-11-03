const test=require('node:test'),assert=require('node:assert/strict');const{boot,click,tick}=require('./ui-harness.cjs');
test('review and progress exchange are reachable local campus views with profile-scoped native APIs',async t=>{
 const invoked=[];const c=await boot({professional:true,missions:true,advanced:true,apiOverrides:{mergePreview:async input=>{assert.equal(input.profileId,'one');invoked.push('merge');return{canceled:true}},tutorPreview:async input=>{assert.equal(input.profileId,'one');invoked.push('tutor');return{canceled:true}}}});t.after(()=>c.w.close());
 click(c,'[data-view="tutor"]');assert.match(c.d.querySelector('h1').textContent,/Devolución/);assert.match(c.d.querySelector('main').textContent,/informe|entrega/i);click(c,'[data-tutor-action="import"]');await tick();
 click(c,'[data-view="merge"]');assert.match(c.d.querySelector('h1').textContent,/Combinar/);click(c,'[data-merge-action="preview"]');await tick();assert.equal(c.records.get('one').revision,0);assert.equal(c.calls.length,0);assert.deepEqual(invoked,['tutor','merge']);
});
