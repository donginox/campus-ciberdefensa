const {test}=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const fs=require('node:fs');
const path=require('node:path');
const source=path.join(__dirname,'../src/renderer/real-environments.js');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return{promise,resolve,reject}};
const snapshot=(state='stopped',extra={})=>({id:'juice-shop',state,message:state==='running'?'Objetivo disponible.':'Objetivo detenido.',imageVersion:'20.3.0',...extra});
async function boot(options={}){
 const dom=new JSDOM('<!doctype html><html lang="es"><head><title>Campus</title></head><body><main></main></body></html>',{runScripts:'outside-only',url:'https://campus.test',pretendToBeVisual:true});
 const w=dom.window;let profileId='profile-one',current=options.snapshot||snapshot();const calls=[],announcements=[];
 const api={
  realLabDoctor:async()=>({ready:true,code:'READY',message:'Docker local disponible.',setupUrl:'https://docs.docker.com/desktop/setup/install/windows-install/'}),
  realLabStatus:async id=>{calls.push(['status',id]);return current},
  startRealLab:async id=>{calls.push(['start',id]);return current=snapshot('running',{url:'http://127.0.0.1:43123/'})},
  stopRealLab:async id=>{calls.push(['stop',id]);return current=snapshot()},
  resetRealLab:async id=>{calls.push(['reset',id]);return{canceled:true}},
  openRealLab:async id=>{calls.push(['open',id]);return{opened:true}},
  exportMaterial:async relative=>{calls.push(['export',relative]);return{canceled:false}},
  ...options.api
 };
 assert.ok(fs.existsSync(source),'the real environments UI module must exist');
 w.eval(fs.readFileSync(source,'utf8'));
 const view=w.RealEnvironments.create({desktop:options.noDesktop?undefined:api,getProfileId:()=>profileId,announce:message=>announcements.push(message)});
 const main=w.document.querySelector('main');main.innerHTML=view.render();view.mount(main);
 const c={dom,w,d:w.document,api,calls,view,announcements,setProfile:id=>{profileId=id},close:()=>{view.dispose();w.close()}};
 await tick();return c;
}
function button(c,action){const el=c.d.querySelector(`[data-real-env-action="${action}"]`);assert.ok(el,`missing ${action} control`);return el}
function click(c,action){const el=button(c,action);el.focus();el.click()}

test('missing Docker gives installation guidance and never enables target controls',async()=>{
 const c=await boot({snapshot:snapshot('unavailable',{message:'Docker no está instalado.'}),api:{realLabDoctor:async()=>({ready:false,code:'docker_missing',message:'Docker no está instalado.'})}});
 assert.match(c.d.querySelector('[data-real-env-status]').textContent,/Docker no está instalado/);
 assert.equal(c.d.querySelector('[data-real-env-setup]').hidden,false);
 assert.equal(c.d.querySelector('[data-real-env-setup] a').href,'https://docs.docker.com/desktop/setup/install/windows-install/');
 for(const action of ['start','open','stop','reset'])assert.equal(button(c,action).disabled,true);
 assert.equal(button(c,'check').disabled,false);assert.equal(c.d.querySelector('[data-real-env-url]').textContent,'');c.close();
});

test('no native bridge reports unavailable instead of claiming a running lab',async()=>{
 const c=await boot({noDesktop:true});assert.match(c.d.querySelector('[data-real-env-status]').textContent,/aplicación de escritorio/i);assert.equal(button(c,'start').disabled,true);c.close();
});

test('setup offers Kali on another computer with Campus and Docker together on that computer',async t=>{
 const c=await boot({snapshot:snapshot('unavailable',{message:'Docker no está instalado.'}),api:{realLabDoctor:async()=>({ready:false,code:'docker_missing',message:'Docker no está instalado.'})}});t.after(c.close);
 const setup=c.d.querySelector('[data-real-env-setup]');assert.equal(setup.hidden,false);
 const links=[...setup.querySelectorAll('a')];assert.ok(links.some(a=>a.href==='https://docs.docker.com/desktop/setup/install/windows-install/'));
 assert.ok(links.some(a=>a.href==='https://www.kali.org/docs/containers/installing-docker-on-kali/'),'Kali users need their own official installation route');
 assert.match(setup.textContent,/Kali.*otra computadora/s);assert.match(setup.textContent,/Campus y Docker en Kali/);assert.match(setup.textContent,/usuario normal/);
 const limits=c.d.querySelector('[aria-labelledby="real-env-limits-title"]');assert.match(limits.textContent,/equipo que ejecuta Campus/);assert.match(limits.textContent,/no apunta a Windows/);
});

test('ready Docker with an uncreated target enables its first creation and opens the running target',async t=>{
 const c=await boot({snapshot:snapshot('missing',{message:'El objetivo aún no se creó.',engine:'28.0.0'})});t.after(c.close);
 assert.equal(button(c,'start').disabled,false,'a missing target must be creatable when Docker is ready');
 assert.equal(c.d.querySelector('[data-real-env-setup]').hidden,true,'an uncreated target does not require Docker installation');
 assert.match(c.d.querySelector('[data-real-env-badge]').textContent,/Sin crear/);
 assert.equal(button(c,'open').disabled,true);assert.equal(button(c,'stop').disabled,true);assert.equal(button(c,'reset').disabled,true);
 click(c,'start');await tick();assert.deepEqual(c.calls.find(call=>call[0]==='start'),['start','profile-one']);
 assert.equal(button(c,'open').disabled,false);assert.equal(c.d.querySelector('[data-real-env-url]').textContent,'http://127.0.0.1:43123/');
});

test('ready target starts, opens only by profile, and stops with updated controls',async()=>{
 const c=await boot();assert.equal(button(c,'start').disabled,false);assert.equal(button(c,'open').disabled,true);
 click(c,'start');await tick();assert.match(c.d.querySelector('[data-real-env-status]').textContent,/disponible/);
 assert.equal(c.d.querySelector('[data-real-env-url]').textContent,'http://127.0.0.1:43123/');assert.equal(button(c,'start').disabled,true);assert.equal(button(c,'open').disabled,false);assert.equal(c.d.activeElement,button(c,'open'));
 click(c,'open');await tick();assert.deepEqual(c.calls.find(call=>call[0]==='open'),['open','profile-one']);
 click(c,'stop');await tick();assert.equal(button(c,'open').disabled,true);assert.equal(button(c,'start').disabled,false);assert.equal(c.d.querySelector('[data-real-env-url]').textContent,'');c.close();
});

test('busy operations block repeated clicks and announce progress without fabricated percentages',async()=>{
 const pending=deferred();const c=await boot({api:{startRealLab:id=>{c.calls.push(['start',id]);return pending.promise}}});
 click(c,'start');for(const action of ['check','start','open','stop','reset'])assert.equal(button(c,action).disabled,true);
 assert.equal(c.d.querySelector('[data-real-env-live]').getAttribute('aria-busy'),'true');assert.match(c.d.querySelector('[data-real-env-status]').textContent,/Iniciando/);assert.doesNotMatch(c.d.querySelector('[data-real-env-status]').textContent,/%/);button(c,'start').click();
 assert.equal(c.calls.filter(call=>call[0]==='start').length,1);pending.resolve(snapshot('unavailable',{message:'Docker no está instalado.'}));await tick();
 assert.equal(button(c,'open').disabled,true);assert.match(c.d.querySelector('[data-real-env-status]').textContent,/Docker no está instalado/);assert.equal(c.d.querySelector('[data-real-env-setup]').hidden,false);c.close();
});

test('reset uses native confirmation, cancellation preserves target and focus',async()=>{
 const c=await boot({snapshot:snapshot('running',{url:'http://127.0.0.1:43123/'})});c.w.confirm=()=>{assert.fail('renderer must not ask for duplicate confirmation')};
 click(c,'reset');await tick();assert.deepEqual(c.calls.find(call=>call[0]==='reset'),['reset','profile-one']);assert.equal(button(c,'open').disabled,false);assert.equal(c.d.activeElement,button(c,'reset'));assert.match(c.d.querySelector('[data-real-env-status]').textContent,/cancelad/i);c.close();
});

test('confirmed reset uses the returned snapshot and changed localhost address',async()=>{
 const c=await boot({snapshot:snapshot('running',{url:'http://127.0.0.1:43123/'}),api:{resetRealLab:async()=>({canceled:false,snapshot:snapshot('running',{url:'http://127.0.0.1:45000/'})})}});
 click(c,'reset');await tick();assert.equal(c.d.querySelector('[data-real-env-url]').textContent,'http://127.0.0.1:45000/');c.close();
});

test('a validated dead owned target permits native reset and cancel preserves recovery',async t=>{
 const c=await boot({snapshot:snapshot('error',{message:'El contenedor está en estado dead.',canReset:true})});t.after(c.close);
 assert.equal(button(c,'reset').disabled,false,'validated dead targets must offer recovery');
 for(const action of ['start','open','stop'])assert.equal(button(c,action).disabled,true);
 click(c,'reset');await tick();assert.deepEqual(c.calls.find(call=>call[0]==='reset'),['reset','profile-one']);
 assert.equal(button(c,'reset').disabled,false);assert.match(c.d.querySelector('[data-real-env-status]').textContent,/cancelad/i);assert.equal(c.d.activeElement,button(c,'reset'));
});

test('reset capability never authorizes unsafe or unverified error targets',async t=>{
 for(const target of [snapshot('error'),snapshot('unsafe',{canReset:true})]){
  const c=await boot({snapshot:target});t.after(c.close);assert.equal(button(c,'reset').disabled,true);button(c,'reset').click();await tick();assert.ok(!c.calls.some(call=>call[0]==='reset'));
 }
 const unavailable=await boot({snapshot:snapshot('error',{canReset:true}),api:{realLabDoctor:async()=>({ready:false,code:'engine_unavailable',message:'Motor no disponible.'})}});t.after(unavailable.close);assert.equal(button(unavailable,'reset').disabled,true);
});

test('errors remain visible, receive focus and are rendered as text',async()=>{
 const c=await boot({api:{startRealLab:async()=>{throw new Error('<img src=x onerror=alert(1)> Falló Docker')}}});click(c,'start');await tick();
 const error=c.d.querySelector('[data-real-env-error]');assert.equal(error.hidden,false);assert.match(error.textContent,/<img/);assert.equal(error.querySelector('img'),null);assert.equal(c.d.activeElement,error);
 click(c,'check');await tick();assert.equal(error.hidden,false,'a background or status check must not silently dismiss an operation error');assert.equal(button(c,'start').disabled,false);c.close();
});

test('unsafe state disables all mutations and never exposes a remote URL',async()=>{
 const c=await boot({snapshot:snapshot('unsafe',{message:'Recurso modificado.',url:'https://attacker.example/'})});
 for(const action of ['start','stop','reset','open'])assert.equal(button(c,action).disabled,true);assert.equal(c.d.querySelector('[data-real-env-url]').textContent,'');c.close();
});

test('pending doctor after a profile change cannot start a lab for the new profile',async()=>{
 const pending=deferred();const c=await boot({api:{realLabDoctor:()=>pending.promise}});c.setProfile('profile-two');pending.resolve({ready:true,code:'READY',message:'Disponible'});await tick();
 assert.equal(button(c,'start').disabled,true);assert.ok(!c.calls.some(call=>call[0]==='start'));assert.doesNotMatch(c.d.querySelector('[data-real-env-status]').textContent,/Objetivo disponible/);c.close();
});

test('a late operation after dispose cannot alter page, announce or start another profile',async()=>{
 const pending=deferred();const c=await boot({api:{startRealLab:()=>pending.promise}});click(c,'start');c.view.dispose();c.setProfile('profile-two');c.d.querySelector('main').innerHTML='<h1>Otro perfil</h1>';const count=c.announcements.length;
 pending.resolve(snapshot('running',{url:'http://127.0.0.1:45000/'}));await tick();assert.equal(c.d.querySelector('main').textContent,'Otro perfil');assert.equal(c.announcements.length,count);assert.ok(!c.calls.some(call=>call[0]==='start'&&call[1]==='profile-two'));c.close();
});

test('live refresh updates a target stopped outside the campus and preserves keyboard focus',async()=>{
 const c=await boot({snapshot:snapshot('running',{url:'http://127.0.0.1:43123/'})});const callbacks=[];
 // Mount again with a controlled timer to exercise the production refresh callback.
 c.view.dispose();c.w.setInterval=callback=>{callbacks.push(callback);return 1};c.w.clearInterval=()=>{};c.d.querySelector('main').innerHTML=c.view.render();c.view.mount(c.d.querySelector('main'));await tick();
 c.api.realLabStatus=async()=>snapshot();button(c,'check').focus();await callbacks[0]();await tick();assert.equal(button(c,'open').disabled,true);assert.equal(button(c,'start').disabled,false);assert.equal(c.d.activeElement,button(c,'check'));c.close();
});

test('official external practice stays separate from local VM capabilities and exports its guide',async()=>{
 const c=await boot();const urls=[...c.d.querySelectorAll('a')].map(a=>a.href);
 for(const topic of ['sql-injection','authentication','access-control'])assert.ok(urls.includes(`https://portswigger.net/web-security/${topic}`));
 assert.ok(urls.includes('https://tryhackme.com/room/tutorial'));assert.match(c.d.body.textContent,/cuenta.*TryHackMe|TryHackMe.*cuenta/i);assert.match(c.d.body.textContent,/localhost de Kali/);assert.match(c.d.body.textContent,/contenedor.*no es una VM/i);
 click(c,'export');await tick();assert.deepEqual(c.calls.find(call=>call[0]==='export'),['export','entornos-reales.txt']);assert.equal(c.d.querySelector('input[type=checkbox]'),null);c.close();
});

test('real module exposes accessible landmarks, headings, controls and live state',async()=>{
 const c=await boot();c.w.eval(fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8'));const result=await c.w.axe.run(c.d,{rules:{'color-contrast':{enabled:false}}});
 assert.equal(result.violations.length,0,JSON.stringify(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))));assert.equal(c.d.querySelectorAll('h1').length,1);assert.ok(c.d.querySelector('[role=status][aria-live=polite]'));c.close();
});
