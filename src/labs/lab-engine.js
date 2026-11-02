(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LabEngine = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const field = (id, label, type = 'text', options) => ({ id, label, type, ...(options ? { options: options.map(([value, label]) => ({value, label})) } : {}) });
  const integritySample = 'CASO-2026-042\nEvidencia sintética. Preservar sin modificar.\n';
  const catalog = [
    {id:'linux-permissions', title:'Linux · custodiar un informe', description:'Terminal virtual persistente: rutas, archivos y permisos Unix. No ejecuta comandos del equipo.', type:'Simulador', difficulty:'Inicial', duration:'15–20 min', environment:'Sistema de archivos virtual; usuario student.', objective:'Dejar incident.txt legible y escribible solo por su propietario; comprobar el resultado.', steps:['Consultá help, pwd y ls para orientarte.','Leé incident.txt y consultá stat incident.txt.','Aplicá el permiso mínimo: solo propietario con lectura y escritura.','Comprobá el estado final con stat y enviá la evidencia.'], scenario:'El informe /home/student/incident.txt contiene datos sintéticos y comienza con modo 644. El grupo y otros usuarios no deben leerlo.', fields:[], materials:['laboratorios-kali.html'], limitation:'Verifica operaciones en un simulador; no acredita administración de un Linux real.'},
    {id:'windows-acl', title:'Windows · mínimo privilegio NTFS', description:'Resolvé un caso de permisos efectivos e herencia sin cambiar carpetas reales.', type:'Simulador de decisiones', difficulty:'Inicial', duration:'15 min', environment:'ACL ficticia de C:\\Casos\\Informe; no modifica Windows.', objective:'Permitir a Soporte leer el informe sin modificarlo ni otorgar acceso a Todos.', scenario:'Carpeta padre: Todos — Modificar (heredado). Informe: Administradores — Control total (explícito). El equipo Soporte necesita únicamente leer. Conservá la entrada administrativa explícita y decidí qué hacer con la concesión heredada.', steps:['Identificá por qué agregar Lectura no elimina un permiso Modificar heredado.','Elegí el grupo de trabajo y su permiso mínimo.','Quitá la concesión amplia heredada conservando Administradores.','Contrastá el caso con la guía local de ACL en una carpeta de prueba propia.'], fields:[field('principal','Grupo destinatario','select',[['Soporte','Soporte'],['Todos','Todos'],['Administradores','Administradores']]),field('permission','Permiso para el grupo','select',[['read','Lectura'],['modify','Modificar'],['full','Control total']]),field('inheritance','Concesión heredada a Todos','select',[['remove','Quitar esa concesión heredada'],['keep','Conservarla']])], materials:['windows.html'], limitation:'Este caso evalúa la decisión; la práctica real opcional se realiza manualmente siguiendo la guía.'},
    {id:'ipv4-subnet', title:'Redes · delimitar una subred IPv4', description:'Calculá red, difusión y rango utilizable de una dirección de documentación.', type:'Simulador de cálculo', difficulty:'Inicial', duration:'15 min', environment:'IPv4 local: 192.0.2.131/26 (rango de documentación).', objective:'Separar bits de red/host y justificar la capacidad de la subred.', scenario:'Una VLAN de práctica usa 192.0.2.131/26. Informá la dirección de red, difusión, primer y último host y cantidad de hosts utilizables. No se envían paquetes.', steps:['Convertí /26 a máscara decimal.','Ubicá el bloque que contiene .131.','Excluí red y difusión para este /26.','Completá los cinco resultados.'], fields:[field('network','Dirección de red'),field('broadcast','Dirección de difusión'),field('firstHost','Primer host'),field('lastHost','Último host'),field('usableHosts','Hosts utilizables')], materials:['repaso-anual.html']},
    {id:'sql-investigation',title:'SQL · investigar accesos fallidos',description:'Ejecutá SELECT real sobre SQLite en un proceso de trabajo aislado y descartable.',type:'Motor SQL real aislado',difficulty:'Intermedia',duration:'20 min',environment:'sql.js / SQLite en memoria, semilla sintética fija, sin archivos del equipo.',objective:'Encontrar orígenes con tres o más accesos fallidos y mostrar source_ip y failures.',scenario:'Tabla auth_events(id INTEGER, occurred_at TEXT, username TEXT, source_ip TEXT, outcome TEXT). outcome vale failure o success. Tabla assets(id INTEGER, hostname TEXT, criticality TEXT). Agrupá fallos por source_ip; devolvé columnas source_ip y failures y solo grupos con al menos tres. Se evalúan las filas obtenidas, no palabras de la consulta.',steps:['Inspeccioná el conjunto con SELECT * FROM auth_events.','Filtrá fallos y agrupá por origen.','Aplicá HAVING para conservar tres o más fallos.','Ejecutá tu consulta final y evaluá su resultado.'],fields:[field('query','Consulta SQL de solo lectura','textarea')],taskId:'sql-investigation',defaultQuery:'SELECT * FROM auth_events ORDER BY id;',materials:['final-anual.html'],limitation:'Cada ejecución crea una base nueva. Solo SELECT/WITH de lectura; máximo 8 KB y 200 filas; tiempo limitado por escritorio.'},
    {id:'incident-logs',title:'SOC · correlacionar una secuencia',description:'Filtrá eventos sintéticos y distinguí una intrusión probable de errores benignos.',type:'Simulador de investigación',difficulty:'Intermedia',duration:'20 min',environment:'Ocho eventos UTC de autenticación y archivos, totalmente ficticios.',objective:'Correlacionar fallos, éxito y lectura de archivo por origen/cuenta, citando IDs de evidencia.',scenario:'Investigá la ventana de 09:00 a 09:10 UTC. Una cuenta tuvo errores benignos desde su origen habitual; otra secuencia combina tres fallos, éxito y lectura sensible. Usá los filtros de la tabla y citá todos los eventos de esa secuencia.',steps:['Leé todos los eventos antes de filtrar.','Correlacioná origen, cuenta y orden temporal.','Separá el error benigno de la secuencia de cinco eventos.','Registrá origen, cuenta e IDs separados por coma.'],fields:[field('sourceIp','Origen investigado'),field('account','Cuenta afectada'),field('evidenceIds','IDs de evidencia separados por coma')],materials:['blue-team.html']},
    {id:'phishing-triage',title:'Correo · analizar un mensaje sospechoso',description:'Examiná un mensaje ficticio, su dominio y la acción de respuesta.',type:'Simulador de análisis',difficulty:'Inicial',duration:'10–15 min',environment:'Correo estático y dominio .invalid; no hay enlaces activos ni envíos.',objective:'Fundamentar el veredicto con un indicador verificable y elegir una acción segura.',scenario:'De: Mesa de ayuda <soporte@campus-validacion.invalid>\nPara: alumno@campus.example\nAsunto: Su cuenta se suspende en 20 minutos\nMensaje: Confirme su contraseña para conservar acceso.\nDestino mostrado: https://campus.example/ingreso\nDestino real (texto inerte): https://campus-validacion.invalid/verificar\nContexto: el dominio institucional esperado es campus.example. No solicitó un restablecimiento.',steps:['Compará dominio esperado, remitente y destino real.','No uses el logo o la urgencia como prueba única.','Elegí veredicto, indicador principal y respuesta.'],fields:[field('verdict','Veredicto','select',[['phishing','Phishing'],['legitimate','Legítimo']]),field('signal','Indicador verificable principal','select',[['domain','Dominio de destino distinto al institucional'],['logo','Apariencia del logo'],['urgency','Urgencia por sí sola']]),field('action','Acción','select',[['report','Reportar por canal institucional independiente'],['reply','Responder con la contraseña'],['open','Abrir el enlace y probar']])],materials:['blue-team.html']},
    {id:'integrity-hash',title:'Integridad · calcular SHA-256',description:'Calculá un hash real local de bytes UTF-8 y contrastalo con una referencia.',type:'Práctica real guiada',difficulty:'Inicial',duration:'15 min',environment:'Web Crypto local; texto sintético incluido, sin acceso a archivos personales.',objective:'Distinguir integridad de confidencialidad y conservar un digest reproducible.',scenario:'El texto de evidencia incluye saltos de línea LF y un LF final. Calculá SHA-256 usando el botón y compará el resultado completo con la referencia. Un hash sin procedencia confiable no demuestra autoría.',sample:integritySample,referenceDigest:'3dab75982a9b315de457f4564e5dbe541f459174293413e9a127231c096f864a',steps:['Inspeccioná el texto exacto, incluidos saltos de línea.','Calculá SHA-256 localmente.','Compará los 64 caracteres con la referencia y anotá el digest.','Usá la guía para repetir manualmente en una copia de prueba en Windows o Linux.'],fields:[field('digest','SHA-256 calculado'),field('decision','Comparación con la referencia','select',[['match','Coincide'],['mismatch','No coincide']])],materials:['seguridad-casos.html'],limitation:'Se verifica cálculo criptográfico local de texto; no sustituye una cadena de custodia ni analiza malware.'},
    {id:'recovery-evidence',title:'Recuperación · reconstruir con evidencia',description:'Ordená un plan de respuesta y restauración sobre un incidente sintético.',type:'Simulador de decisiones',difficulty:'Intermedia',duration:'20 min',environment:'Caso de mesa; ningún servicio real se detiene ni restaura.',objective:'Preservar evidencia y validar la restauración antes del retorno al servicio.',scenario:'El servidor de práctica fue alterado. Existe un respaldo offline previo al incidente con manifiesto de hashes verificado y una copia original sospechosa. Etiquetas de acciones: isolate = aislar; preserve = preservar evidencia; restore = restaurar; validate = verificar hashes y funcionamiento. El equipo de respuesta ya autorizó el aislamiento.',steps:['Ordená las cuatro etiquetas separadas por coma.','Elegí la fuente de restauración.','Elegí cómo validar integridad y operación.','Documentá el alcance y la evidencia que falta antes de aplicarlo en un entorno real.'],fields:[field('order','Orden de acciones (etiquetas separadas por coma)'),field('source','Fuente de restauración','select',[['verified-backup','Respaldo previo verificado'],['original','Copia original sospechosa']]),field('validation','Validación final','select',[['hash-and-service','Hashes y prueba funcional'],['service-only','Solo comprobar que inicia']])],materials:['windows.html'],limitation:'El plan se evalúa como caso de mesa; no acredita haber recuperado un servidor real.'}
  ];
  const logs = [
    {id:'E01',timestamp:'2026-10-01T09:00:00Z',sourceIp:'198.51.100.20',username:'ana',event:'login',outcome:'failure',detail:'Contraseña errónea; origen habitual'},
    {id:'E02',timestamp:'2026-10-01T09:01:00Z',sourceIp:'203.0.113.44',username:'backup',event:'login',outcome:'failure',detail:'Contraseña errónea'},
    {id:'E03',timestamp:'2026-10-01T09:02:00Z',sourceIp:'203.0.113.44',username:'backup',event:'login',outcome:'failure',detail:'Contraseña errónea'},
    {id:'E04',timestamp:'2026-10-01T09:03:00Z',sourceIp:'203.0.113.44',username:'backup',event:'login',outcome:'failure',detail:'Contraseña errónea'},
    {id:'E05',timestamp:'2026-10-01T09:04:00Z',sourceIp:'203.0.113.44',username:'backup',event:'login',outcome:'success',detail:'Sesión abierta tras fallos'},
    {id:'E06',timestamp:'2026-10-01T09:05:00Z',sourceIp:'203.0.113.44',username:'backup',event:'file_read',outcome:'success',detail:'Lectura de /casos/nomina-sintetica.csv'},
    {id:'E07',timestamp:'2026-10-01T09:06:00Z',sourceIp:'198.51.100.20',username:'ana',event:'login',outcome:'success',detail:'MFA correcto; origen habitual'},
    {id:'E08',timestamp:'2026-10-01T09:08:00Z',sourceIp:'192.0.2.5',username:'monitor',event:'health',outcome:'success',detail:'Comprobación programada'}
  ];
  function getLab(id) { const lab = catalog.find(x => x.id === id); if (!lab) throw new Error('Laboratorio desconocido.'); return lab; }
  function normalizePath(path, cwd) {
    if (typeof path !== 'string' || path.length > 256 || /[\x00-\x1f\\]/.test(path)) throw new Error('Ruta virtual no válida.');
    const parts = (path.startsWith('/') ? path : cwd + '/' + path).split('/'); const stack = [];
    for (const p of parts) { if (!p || p === '.') continue; if (p === '..') stack.pop(); else stack.push(p); }
    return '/' + stack.join('/');
  }
  function startLab(id) {
    getLab(id);
    if (id !== 'linux-permissions') return {labId:id};
    return {labId:id,cwd:'/home/student',history:[],fs:{'/':{type:'dir',mode:'755'},'/home':{type:'dir',mode:'755'},'/home/student':{type:'dir',mode:'755'},'/home/student/incident.txt':{type:'file',mode:'644',content:'CASO-42: informe sintético confidencial.\n'}}};
  }
  function copyState(state) {
    if (!state || state.labId !== 'linux-permissions' || typeof state.cwd !== 'string' || !state.fs || typeof state.fs !== 'object') throw new Error('Estado virtual inválido. Reiniciá el laboratorio.');
    const keys=Object.keys(state.fs); if(keys.length>256) throw new Error('Límite de archivos virtuales.');
    const fs=Object.create(null); let size=0;
    for(const key of keys){ const entry=state.fs[key]; if(normalizePath(key,'/')!==key || !entry || !['dir','file'].includes(entry.type) || !/^[0-7]{3}$/.test(entry.mode)) throw new Error('Estado virtual inválido.');
      const content=entry.type==='file'?entry.content:undefined; if(entry.type==='file' && (typeof content!=='string'||content.length>16384)) throw new Error('Archivo virtual inválido.');
      size+=(content||'').length; fs[key]={type:entry.type,mode:entry.mode,...(entry.type==='file'?{content}:{})}; }
    if(size>131072 || !fs[state.cwd] || fs[state.cwd].type!=='dir') throw new Error('Estado virtual inválido.');
    return {labId:state.labId,cwd:state.cwd,fs,history:Array.isArray(state.history)?state.history.filter(x=>typeof x==='string').slice(-99):[]};
  }
  function tokenize(command) {
    const args=[]; let token='',quote='',active=false;
    for(const ch of command){ if(quote){if(ch===quote)quote='';else token+=ch;active=true;}
      else if(ch==='"'||ch==="'"){quote=ch;active=true;}
      else if(/\s/.test(ch)){if(active){args.push(token);token='';active=false;}}
      else {token+=ch;active=true;} }
    if(quote) throw new Error('Comillas sin cerrar.'); if(active)args.push(token); return args;
  }
  function runCommand(state,input) {
    let next; try{next=copyState(state);}catch(error){return {state,output:error.message};}
    try{
      if(typeof input!=='string'||input.length>1024)throw new Error('Comando no válido (máximo 1024 caracteres).');
      if(/[;&|`$<>\r\n]/.test(input) && !/^echo\s+[^;&|`$<>\r\n]+\s>\s[^;&|`$<>\r\n]+$/.test(input))throw new Error('Operador no permitido. Usá un comando virtual por vez.');
      const args=tokenize(input.trim()); if(!args.length)return {state:next,output:''}; const command=args.shift(); next.history.push(input);
      const path=(value)=>normalizePath(value,next.cwd);
      const permission=(node,bit)=>{if((Number(node.mode[0])&bit)!==bit)throw new Error('Permiso denegado para student (propietario virtual).');};
      const traverse=(p)=>{const parts=p.split('/').filter(Boolean);let current='/';for(let i=0;i<parts.length;i++){const parent=next.fs[current];if(!parent||parent.type!=='dir')throw new Error('El directorio padre no existe.');permission(parent,1);current=(current==='/'?'':current)+'/'+parts[i];}};
      const entry=(value)=>{const p=path(value);traverse(p);if(!Object.hasOwn(next.fs,p))throw new Error('La ruta virtual no existe.');return [p,next.fs[p]];};
      const writableParent=(p)=>{traverse(p);const parent=p.slice(0,p.lastIndexOf('/'))||'/';if(!next.fs[parent]||next.fs[parent].type!=='dir')throw new Error('El directorio padre no existe.');permission(next.fs[parent],3);};
      const requireCount=(min,max=min)=>{if(args.length<min||args.length>max)throw new Error('Cantidad de argumentos no válida. Consultá help.');};
      let output='';
      if(command==='help')output='Comandos virtuales: help, pwd, whoami, ls [ruta], cd [ruta], mkdir ruta, touch archivo, cat archivo, chmod 000 ruta, stat ruta, echo texto [> archivo], clear. Sin tuberías, ejecución, red ni acceso al equipo.';
      else if(command==='pwd'){requireCount(0);output=next.cwd;}
      else if(command==='whoami'){requireCount(0);output='student (usuario virtual)';}
      else if(command==='clear'){requireCount(0);output='';}
      else if(command==='ls'){requireCount(0,1);const [p,e]=entry(args[0]||'.');if(e.type==='dir')permission(e,5);output=e.type==='file'?p.split('/').pop():Object.keys(next.fs).filter(k=>k!==p&&k.startsWith(p==='/'?'/':p+'/')&&!k.slice((p==='/'?'':p).length+1).includes('/')).map(k=>k.split('/').pop()+(next.fs[k].type==='dir'?'/':'')).sort().join('\n');}
      else if(command==='cd'){requireCount(0,1);const [p,e]=entry(args[0]||'/home/student');if(e.type!=='dir')throw new Error('La ruta no es un directorio.');permission(e,1);next.cwd=p;}
      else if(command==='mkdir'||command==='touch'){requireCount(1);const p=path(args[0]);traverse(p);if(Object.hasOwn(next.fs,p)){if(command==='mkdir'||next.fs[p].type!=='file')throw new Error('La ruta ya existe.');permission(next.fs[p],2);}else{if(Object.keys(next.fs).length>=256)throw new Error('Límite de archivos virtuales.');writableParent(p);next.fs[p]=command==='mkdir'?{type:'dir',mode:'755'}:{type:'file',mode:'644',content:''};}}
      else if(command==='cat'){requireCount(1);const [,e]=entry(args[0]);if(e.type!=='file')throw new Error('La ruta no es un archivo.');permission(e,4);output=e.content;}
      else if(command==='stat'){requireCount(1);const [p,e]=entry(args[0]);output=`${p}\nTipo: ${e.type}\nModo: ${e.mode}\nPropietario: student\nTamaño: ${e.type==='file'?e.content.length:0}`;}
      else if(command==='chmod'){requireCount(2);if(!/^[0-7]{3}$/.test(args[0]))throw new Error('Usá un modo octal de tres dígitos (000 a 777).');const [,e]=entry(args[1]);e.mode=args[0];}
      else if(command==='echo'){const redirect=args.indexOf('>');if(redirect<0)output=args.join(' ');else{if(redirect!==args.length-2||redirect===0)throw new Error('Sintaxis: echo texto > archivo');const p=path(args.at(-1));traverse(p);if(next.fs[p]){if(next.fs[p].type!=='file')throw new Error('La ruta no es un archivo.');permission(next.fs[p],2);}else{if(Object.keys(next.fs).length>=256)throw new Error('Límite de archivos virtuales.');writableParent(p);}next.fs[p]={type:'file',mode:next.fs[p]?.mode||'644',content:args.slice(0,redirect).join(' ')};}}
      else throw new Error('Comando no admitido. Consultá help.');
      copyState(next); // Bound the persisted virtual data after every mutation.
      return {state:next,output};
    }catch(error){return {state,output:error.message};}
  }
  function calculateSubnet(cidr) {
    if(typeof cidr!=='string'||!/^\d{1,3}(\.\d{1,3}){3}\/\d{1,2}$/.test(cidr))throw new Error('Ingresá IPv4/prefijo válido.');
    const [ip,prefixText]=cidr.split('/'); const octets=ip.split('.').map(Number),prefix=Number(prefixText);
    if(octets.some(x=>x>255)||prefix>32)throw new Error('IPv4 o prefijo fuera de rango.');
    const number=octets.reduce((n,x)=>n*256+x,0),size=2**(32-prefix),network=Math.floor(number/size)*size,broadcast=network+size-1;
    const format=(n)=>[24,16,8,0].map(shift=>Math.floor(n/2**shift)%256).join('.');
    return {network:format(network),broadcast:format(broadcast),firstHost:format(prefix>=31?network:network+1),lastHost:format(prefix>=31?broadcast:broadcast-1),usableHosts:prefix>=31?size:size-2,prefix,mask:format(4294967296-size)};
  }
  function queryLog(filters={}) {
    if(!filters||typeof filters!=='object'||Array.isArray(filters))return [];
    const allowed=['sourceIp','username','outcome','event','from','to'];
    if(Object.keys(filters).some(k=>!allowed.includes(k)))return [];
    return logs.filter(row=>Object.entries(filters).every(([k,value])=>!value||(typeof value==='string'&&(k==='from'?row.timestamp>=value:k==='to'?row.timestamp<=value:row[k]===value)))).map(x=>({...x}));
  }
  function evaluate(id,answers={}) {
    const lab=getLab(id); const a=answers&&typeof answers==='object'&&!Array.isArray(answers)?answers:{}; const checks=[];
    const check=(ok,message)=>checks.push({ok:!!ok,message});
    if(id==='linux-permissions'){let valid;try{valid=copyState(a.state);}catch{}check(valid?.fs['/home/student/incident.txt']?.mode==='600','El modo 600 conserva lectura/escritura del propietario y quita acceso a grupo y otros. Verificá el archivo original con stat.');}
    if(id==='windows-acl'){check(a.principal==='Soporte','La entrada de lectura debe asignarse al grupo Soporte.');check(a.permission==='read','Lectura es suficiente; Modificar y Control total exceden la necesidad.');check(a.inheritance==='remove','La concesión heredada a Todos debe quitarse; agregar Lectura no reduce el Modificar que ya existía. Conservá Administradores.');}
    if(id==='ipv4-subnet'){const expected=calculateSubnet('192.0.2.131/26');for(const key of ['network','broadcast','firstHost','lastHost','usableHosts'])check(String(a[key]??'').trim()===String(expected[key]),`${key}: para /26 el bloque es de 64 direcciones. Resultado: ${expected[key]}.`);}
    if(id==='sql-investigation'){const r=a.result;const cols=Array.isArray(r?.columns)?r.columns:[];const ip=cols.indexOf('source_ip'),count=cols.indexOf('failures');check(ip>=0&&count>=0,'La consulta final debe devolver source_ip y COUNT(*) AS failures.');check(ip>=0&&count>=0&&Array.isArray(r?.rows)&&r.rows.length===1&&Array.isArray(r.rows[0])&&r.rows[0][ip]==='203.0.113.44'&&Number(r.rows[0][count])===3&&!r.truncated,'Al filtrar outcome = failure y agrupar, el único origen con al menos tres fallos es 203.0.113.44, con 3. Evaluación del resultado ejecutado.');}
    if(id==='incident-logs'){check(a.sourceIp==='203.0.113.44','El origen 203.0.113.44 conecta tres fallos, un éxito y una lectura.');check(a.account==='backup','La cuenta backup aparece en toda la secuencia correlacionada.');const ids=typeof a.evidenceIds==='string'?a.evidenceIds.split(/[,\s]+/).filter(Boolean):[];check(new Set(ids).size===5&&['E02','E03','E04','E05','E06'].every(x=>ids.includes(x)),'Citá E02, E03, E04, E05 y E06. E01/E07 son el error y acceso habitual de ana; no prueban la misma intrusión.');}
    if(id==='phishing-triage'){check(a.verdict==='phishing','El mensaje es phishing en este caso ficticio.');check(a.signal==='domain','El destino real campus-validacion.invalid no es campus.example; el texto visible intenta ocultarlo.');check(a.action==='report','Reportá por un canal institucional independiente sin responder ni seguir el enlace.');}
    if(id==='integrity-hash'){check(typeof a.digest==='string'&&a.digest.toLowerCase().trim()===catalog.find(x=>x.id===id).referenceDigest,'Compará el SHA-256 completo del texto UTF-8, incluidos los dos LF. El resultado cambia al modificar bytes.');check(a.decision==='match','La evidencia incluida coincide con su referencia. Esto comprueba integridad respecto de esa referencia, no autoría.');}
    if(id==='recovery-evidence'){check(typeof a.order==='string'&&a.order.replace(/\s/g,'').toLowerCase()==='isolate,preserve,restore,validate','Secuencia del caso: isolate, preserve, restore, validate; preservá evidencia antes de reemplazar datos.');check(a.source==='verified-backup','Usá el respaldo previo verificado, no la copia posiblemente alterada.');check(a.validation==='hash-and-service','Verificá hashes y funcionamiento; que el servicio inicie no demuestra integridad.');}
    const score=checks.filter(x=>x.ok).length;
    return {score,total:checks.length,passed:score===checks.length&&score>0,feedback:checks.map(x=>(x.ok?'✓ ':'Revisar: ')+x.message),evidence:{labId:id,type:lab.type,criteria:checks.map((x,index)=>({index,met:x.ok})),scope:lab.limitation||'Resultado del caso sintético local; no certifica competencia profesional.'}};
  }
  async function hashText(text) {
    if(typeof text!=='string'||text.length>1048576)throw new Error('El texto debe tener hasta 1 MB.');
    const provider=typeof globalThis.crypto?.subtle!=='undefined'?globalThis.crypto:typeof require==='function'?require('node:crypto').webcrypto:null;
    if(!provider)throw new Error('SHA-256 no disponible en este contexto.');
    const digest=await provider.subtle.digest('SHA-256',new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
  }
  return {catalog,startLab,runCommand,evaluate,calculateSubnet,queryLog,hashText,integritySample};
});


