(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.RealEnvironments=api;
})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const setupUrl='https://docs.docker.com/desktop/setup/install/windows-install/';
 const labels={unknown:'Sin comprobar',missing:'Sin crear',unavailable:'Motor no disponible',stopped:'Detenido',running:'En ejecución',starting:'Iniciando',unsafe:'Revisión necesaria',error:'No se pudo comprobar'};
 const progress={check:'Comprobando Docker y el objetivo…',start:'Iniciando el objetivo real. La primera descarga puede demorar…',stop:'Deteniendo el objetivo…',reset:'Esperando la confirmación del sistema y restableciendo el objetivo…',open:'Validando y abriendo el objetivo…',export:'Guardando la guía…'};
 const text=value=>String(value??'').slice(0,4000);
 function localUrl(value){
  try{const url=new URL(value);return url.protocol==='http:'&&url.hostname==='127.0.0.1'&&!url.username&&!url.password&&Number(url.port)>=2000&&Number(url.port)<=65535&&url.pathname==='/'&&!url.search&&!url.hash?url.href:''}catch{return ''}
 }
 function create({desktop,getProfileId,announce=()=>{}}={}){
  let page=null,timer=null,generation=0,profileId=null,busy='',error='',notice='',doctor=null;
  let snapshot={state:'unknown',message:'Comprobá el motor local antes de iniciar el objetivo.'};
  const profile=()=>typeof getProfileId==='function'?getProfileId():null;
  const bridge=()=>desktop&&['realLabDoctor','realLabStatus','startRealLab','stopRealLab','resetRealLab','openRealLab'].every(name=>typeof desktop[name]==='function');
  const current=(token,id)=>page?.isConnected&&generation===token&&id===profileId&&id===profile();
  const find=selector=>page?.querySelector(selector);
  const button=action=>find(`[data-real-env-action="${action}"]`);
  function update(){
   if(!page?.isConnected)return;
   const state=snapshot.state,enabled=!!doctor?.ready&&!busy&&!!profileId;
   const states={check:!!bridge()&&!busy&&!!profileId,start:enabled&&['missing','stopped'].includes(state),open:enabled&&state==='running'&&!!localUrl(snapshot.url),stop:enabled&&state==='running',reset:enabled&&(['running','stopped'].includes(state)||(state==='error'&&snapshot.canReset===true)),export:!busy&&typeof desktop?.exportMaterial==='function'};
   for(const [action,available]of Object.entries(states))button(action).disabled=!available;
   find('[data-real-env-live]').setAttribute('aria-busy',String(!!busy));
   const badge=find('[data-real-env-badge]');badge.textContent=labels[state]||labels.error;badge.dataset.state=state;
   find('[data-real-env-status]').textContent=progress[busy]||notice||snapshot.message||labels[state]||labels.error;
   find('[data-real-env-engine]').textContent=doctor?text(doctor.message):'Motor local pendiente de comprobación.';
   find('[data-real-env-url]').textContent=state==='running'?localUrl(snapshot.url):'';
   find('[data-real-env-address]').hidden=!(state==='running'&&localUrl(snapshot.url));
   find('[data-real-env-setup]').hidden=!!doctor?.ready||!['missing','unavailable'].includes(state);
   const problem=find('[data-real-env-error]');problem.textContent=error;problem.hidden=!error;
  }
  function accept(value){
   if(!value||!Object.hasOwn(labels,value.state))throw new Error('El motor devolvió un estado no reconocido. Volvé a comprobar el entorno.');
   snapshot={state:value.state,message:text(value.message),url:localUrl(value.url),canReset:value.canReset===true};
   if(value.state==='running'&&!snapshot.url)snapshot={state:'unsafe',message:'No se pudo validar la dirección local del objetivo. Comprobá el entorno antes de abrirlo.'};
   if(snapshot.state==='unavailable')doctor={...doctor,ready:false};
  }
  function focusAfter(action){
   const preferred=button(action);
   if(preferred&&!preferred.disabled){preferred.focus();return}
   const next=button(snapshot.state==='running'?'open':'start');
   if(next&&!next.disabled)next.focus();else button('check')?.focus();
  }
  function fail(cause){error=text(cause?.message||'No se pudo completar la operación. Comprobá Docker y volvé a intentarlo.');update();find('[data-real-env-error]')?.focus();}
  async function check(automatic=false){
   if(busy||!page?.isConnected||profile()!==profileId)return;
   if(!bridge()){
    snapshot={state:'unavailable',message:'Abrí el campus actualizado desde la aplicación de escritorio para usar Docker local.'};update();return;
   }
   if(!profileId){snapshot={state:'unavailable',message:'Elegí un perfil del campus antes de iniciar el objetivo.'};update();return}
   const token=generation,id=profileId;busy=automatic?'refresh':'check';notice='';update();
   try{
    const [engine,target]=await Promise.all([desktop.realLabDoctor(),desktop.realLabStatus(id)]);
    if(!current(token,id))return;
    doctor={ready:engine?.ready===true,message:text(engine?.message)};accept(target);
    if(!doctor.ready&&snapshot.state!=='unsafe')snapshot={state:'unavailable',message:doctor.message||'Iniciá Docker Desktop y volvé a comprobar el entorno.'};
   }catch(cause){
    if(!current(token,id))return;
    doctor=null;snapshot={state:'error',message:'No pudimos comprobar el entorno. Revisá el mensaje y volvé a comprobar.'};error=text(cause?.message||'Docker no respondió.');
   }finally{
    if(current(token,id)){busy='';update();if(!automatic){if(error)find('[data-real-env-error]')?.focus();else focusAfter('check')}}
   }
  }
  async function act(action){
   if(!page?.isConnected||busy)return;
   // A stale screen must never turn a late click into an operation for a new profile.
   if(profile()!==profileId){
    doctor=null;snapshot={state:'unknown',message:'Cambió el perfil. Volvé a abrir Entornos reales para comprobar su objetivo.'};update();return;
   }
   if(action==='check'){await check();return}
   if(button(action)?.disabled)return;
   const methods={start:'startRealLab',stop:'stopRealLab',reset:'resetRealLab',open:'openRealLab',export:'exportMaterial'};
   if(!methods[action])return;
   const token=generation,id=profileId;busy=action;notice='';update();let failed=false;
   try{
    const result=await desktop[methods[action]](action==='export'?'entornos-reales.txt':id);
    if(!current(token,id))return;
    if(action==='reset'){
     if(result?.canceled)notice='Restablecimiento cancelado. El objetivo se conserva.';
     else{accept(result?.snapshot);error=''}
    }else if(action==='open'){
     if(result?.opened===false)throw new Error('El objetivo no pudo abrirse. Volvé a comprobar el entorno.');
     notice='Objetivo abierto en el navegador de este equipo.';
    }else if(action==='export')notice=result?.canceled?'Guardado de la guía cancelado.':'Guía guardada.';
    else{accept(result);error=''}
    if(notice)announce(notice);
   }catch(cause){if(current(token,id)){failed=true;fail(cause)}}
   finally{if(current(token,id)){busy='';update();if(failed)find('[data-real-env-error]')?.focus();else focusAfter(action)}}
  }
  function onClick(event){const control=event.target.closest('[data-real-env-action]');if(control&&page?.contains(control)){event.preventDefault();void act(control.dataset.realEnvAction)}}
  function dispose(){
   generation++;
   if(timer!==null){page?.ownerDocument.defaultView.clearInterval(timer);timer=null}
   page?.removeEventListener('click',onClick);page=null;busy='';
  }
  function mount(root){
   dispose();page=root?.matches?.('.real-env-page')?root:root?.querySelector('.real-env-page');
   if(!page)return;
   const nextProfile=profile();
   if(profileId!==nextProfile){doctor=null;error='';notice='';snapshot={state:'unknown',message:'Comprobá el motor local antes de iniciar el objetivo.'}}
   profileId=nextProfile;page.addEventListener('click',onClick);update();void check(true);
   timer=page.ownerDocument.defaultView.setInterval(()=>{if(page?.isConnected&&profile()===profileId&&!busy)void check(true)},5000);
  }
  function render(){return `<section class="real-env-page" aria-labelledby="real-env-title">
   <header class="real-env-heading"><p class="real-env-eyebrow">Práctica sobre objetivos reales</p><h1 id="real-env-title" tabindex="-1">Entornos reales</h1><p>Ejecutá una aplicación vulnerable en tu equipo o practicá en laboratorios externos. El campus controla el objetivo local de tu perfil.</p></header>
   <section class="real-env-target" aria-labelledby="real-env-target-title">
    <div class="real-env-target-heading"><div><p class="real-env-eyebrow">Objetivo local · Contenedor Linux</p><h2 id="real-env-target-title">OWASP Juice Shop</h2></div><span class="real-env-badge" data-real-env-badge>Sin comprobar</span></div>
    <p>Una tienda web real con vulnerabilidades intencionales para investigar autenticación, permisos y solicitudes HTTP. Versión 20.3.0, imagen fijada por el campus.</p>
    <div class="real-env-live" data-real-env-live aria-busy="false"><p class="real-env-status" data-real-env-status role="status" aria-live="polite" aria-atomic="true">Comprobá el motor local antes de iniciar el objetivo.</p><p class="real-env-engine" data-real-env-engine>Motor local pendiente de comprobación.</p></div>
    <p class="real-env-error" data-real-env-error role="alert" tabindex="-1" hidden></p>
    <p class="real-env-address" data-real-env-address hidden>Dirección actual en este equipo: <code data-real-env-url></code></p>
    <div class="real-env-actions" aria-label="Controles del objetivo local">
     <button class="real-env-button" type="button" data-real-env-action="check">Comprobar entorno</button>
     <button class="real-env-button real-env-primary" type="button" data-real-env-action="start" disabled>Iniciar objetivo</button>
     <button class="real-env-button" type="button" data-real-env-action="open" disabled>Abrir objetivo</button>
     <button class="real-env-button" type="button" data-real-env-action="stop" disabled>Detener</button>
     <button class="real-env-button real-env-destructive" type="button" data-real-env-action="reset" disabled>Restablecer objetivo</button>
    </div>
    <div class="real-env-setup" data-real-env-setup hidden><h3>Prepará Docker en el equipo del campus</h3><p>Si Kali está en otra computadora, ejecutá Campus y Docker en Kali para practicar allí. Este controlador administra únicamente el motor local del equipo donde abrís Campus.</p><ul class="real-env-links"><li><a href="${setupUrl}" target="_blank" rel="noopener noreferrer">Windows: instalar Docker Desktop (guía oficial externa)</a></li><li><a href="https://www.kali.org/docs/containers/installing-docker-on-kali/" target="_blank" rel="noopener noreferrer">Kali/Linux: instalar Docker Engine en Kali (guía oficial externa)</a></li></ul><ol><li>Seguí la guía correspondiente a tu sistema y revisá sus requisitos y permisos.</li><li>Iniciá un motor Docker local compatible. Si usás Docker Desktop, elegí contenedores Linux.</li><li>Abrí Campus como usuario normal y elegí <strong>Comprobar entorno</strong>.</li></ol><p>La instalación y los permisos del motor se configuran aparte. El campus no instala Docker ni cambia grupos de usuarios, WSL, Hyper-V o tus máquinas virtuales.</p></div>
    <p class="real-env-note"><strong>Al iniciar:</strong> se descarga la imagen si hace falta; necesitás conexión para esa primera descarga. Después se publica un puerto dinámico solo en <code>127.0.0.1</code>.</p>
    <p class="real-env-note"><strong>Al terminar:</strong> usá Detener. Cerrar el campus puede dejar el objetivo encendido. Detener conserva el contenedor; al volver a arrancar, Juice Shop puede restablecer datos según su diseño. Algunos retos guardan progreso en el navegador.</p>
    <p class="real-env-note"><strong>Restablecer:</strong> elimina y recrea únicamente el contenedor de este objetivo y perfil. Pierde su estado local; tus notas y cursos del campus se conservan. El sistema te pide confirmación.</p>
   </section>
   <div class="real-env-grid"><section class="real-env-panel" aria-labelledby="real-env-practice-title"><p class="real-env-eyebrow">Primera sesión</p><h2 id="real-env-practice-title">Investigá y guardá evidencia</h2><ol class="real-env-steps"><li><strong>Delimitá el objetivo.</strong> Comprobá la dirección local y abrí la tienda desde este equipo.</li><li><strong>Observá una función.</strong> Elegí inicio de sesión, productos o acceso a datos. Compará lo que cambia antes y después de autenticarte.</li><li><strong>Registrá lo observado.</strong> Usá las herramientas de red del navegador para identificar ruta, método, respuesta y contexto de usuario.</li><li><strong>Explicá el riesgo y la corrección.</strong> Conservá tu evidencia en tus apuntes. Una casilla marcada no certifica que resolviste un reto externo.</li></ol></section>
   <section class="real-env-panel" aria-labelledby="real-env-limits-title"><p class="real-env-eyebrow">Qué estás ejecutando</p><h2 id="real-env-limits-title">Contenedor, host y VM</h2><p>Este contenedor no es una VM de Kali ni un escritorio Linux completo. Ejecuta la aplicación objetivo con límites de recursos y una red interna de Docker. Esa red no garantiza aislamiento absoluto del equipo anfitrión.</p><p><code>127.0.0.1</code> pertenece al equipo que ejecuta Campus. Si abrís Campus en Windows, el objetivo queda en Windows. Si Kali está en otra computadora, ejecutá Campus y Docker allí: el localhost de Kali pertenece a Kali y no apunta a Windows. El puerto local no conecta automáticamente otra computadora o una VM al objetivo.</p><p>Para prácticas entre VMs, prepará una <strong>Internal Network</strong> o una red <strong>host-only</strong> y verificá el alcance. Mantené los objetivos vulnerables sin adaptadores bridged ni NAT. Este campus no configura ni repara VMs existentes.</p><a href="https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/networkingdetails.html" target="_blank" rel="noopener noreferrer">Redes virtuales: documentación oficial de VirtualBox (sitio externo)</a><div class="real-env-actions"><button class="real-env-button" type="button" data-real-env-action="export">Guardar guía de entornos</button></div></section></div>
   <section class="real-env-external" aria-labelledby="real-env-external-title"><p class="real-env-eyebrow">Alternativas disponibles en internet</p><h2 id="real-env-external-title">Laboratorios externos reales</h2><p>Se abren en tu navegador, requieren conexión y una cuenta en la plataforma para guardar o realizar prácticas. Sus resultados no se verifican ni se suman automáticamente al progreso del campus.</p><div class="real-env-grid"><article class="real-env-panel"><h3>PortSwigger Web Security Academy</h3><p>Lecturas y laboratorios web oficiales por tema. Elegí una práctica y documentá tu investigación sin mirar la solución.</p><ul class="real-env-links"><li><a href="https://portswigger.net/web-security/sql-injection" target="_blank" rel="noopener noreferrer">SQL injection: teoría y laboratorios (sitio externo)</a></li><li><a href="https://portswigger.net/web-security/authentication" target="_blank" rel="noopener noreferrer">Autenticación: teoría y laboratorios (sitio externo)</a></li><li><a href="https://portswigger.net/web-security/access-control" target="_blank" rel="noopener noreferrer">Control de acceso: teoría y laboratorios (sitio externo)</a></li></ul></article><article class="real-env-panel"><h3>TryHackMe y AttackBox</h3><p>TryHackMe ofrece prácticas con máquinas remotas. AttackBox es una VM de Ubuntu en la nube accesible desde el navegador. Necesitás una cuenta de TryHackMe; disponibilidad y límites dependen de su servicio y tu plan.</p><ul class="real-env-links"><li><a href="https://tryhackme.com/room/tutorial" target="_blank" rel="noopener noreferrer">Empezar el tutorial de TryHackMe (sitio externo)</a></li><li><a href="https://help.tryhackme.com/en/articles/6721845-the-attackbox-explained" target="_blank" rel="noopener noreferrer">Cómo funciona AttackBox: ayuda oficial (sitio externo)</a></li></ul></article></div></section>
  </section>`}
  return{render,mount,dispose};
 }
 return{create};
});
