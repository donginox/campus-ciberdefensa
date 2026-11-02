'use strict';
const { parentPort, workerData } = require('node:worker_threads');
const initSqlJs = require('sql.js');

function invalid(message, code = 'INVALID_QUERY') {
  const error = new Error(message); error.code = code; throw error;
}

// Lex only to enforce a deliberately small read-only language. SQLite still parses
// and executes the actual query. Quotes/comments never become statement separators.
function validateQuery(query) {
  if (typeof query !== 'string' || Buffer.byteLength(query, 'utf8') > 8000 || !query.trim() || query.includes('\0')) invalid('La consulta debe tener entre 1 y 8000 bytes.');
  const tokens = []; let index = 0, ended = false;
  while (index < query.length) {
    const char = query[index];
    if (/\s/.test(char)) { index++; continue; }
    if (query.slice(index,index+2) === '--') { const end=query.indexOf('\n',index+2); index=end===-1?query.length:end+1; continue; }
    if (query.slice(index,index+2) === '/*') { const end=query.indexOf('*/',index+2); if(end===-1)invalid('Comentario SQL sin cerrar.'); index=end+2; continue; }
    if (ended) invalid('Solo se admite una sentencia SELECT.');
    if (char === ';') { ended=true; index++; continue; }
    if (char === "'" || char === '"' || char === '`' || char === '[') {
      const close=char==='['?']':char; let value='',closed=false; index++;
      while(index<query.length) { if(query[index]===close) { if(query[index+1]===close&&char!=='['){value+=close;index+=2;continue;}index++;closed=true;break;}value+=query[index++]; }
      if(!closed)invalid('Literal o identificador SQL sin cerrar.');
      // Quoted identifiers can also name extension/pragma functions.
      if(char!=="'" || /^\s*\(/.test(query.slice(index))) tokens.push(value.toUpperCase());
      continue;
    }
    if (/[a-zA-Z_]/.test(char)) { const match=query.slice(index).match(/^[a-zA-Z_][a-zA-Z_0-9]*/)[0];tokens.push(match.toUpperCase());index+=match.length;continue; }
    index++;
  }
  if (!['SELECT','WITH'].includes(tokens[0])) invalid('Solo se admiten SELECT o WITH de lectura.');
  const forbidden=new Set(['INSERT','UPDATE','DELETE','REPLACE','DROP','CREATE','ALTER','ATTACH','DETACH','PRAGMA','VACUUM','REINDEX','ANALYZE','BEGIN','COMMIT','ROLLBACK','SAVEPOINT','RELEASE','LOAD_EXTENSION','READFILE','WRITEFILE','EDIT','EVAL']);
  if(tokens.some(token=>forbidden.has(token)||token.startsWith('PRAGMA_')))invalid('La consulta contiene una operación no permitida.');
}

const seed = `
CREATE TABLE auth_events (id INTEGER PRIMARY KEY, occurred_at TEXT NOT NULL, username TEXT NOT NULL, source_ip TEXT NOT NULL, outcome TEXT NOT NULL);
INSERT INTO auth_events VALUES
(1,'2026-10-01T09:00:00Z','ana','198.51.100.20','failure'),
(2,'2026-10-01T09:01:00Z','backup','203.0.113.44','failure'),
(3,'2026-10-01T09:02:00Z','backup','203.0.113.44','failure'),
(4,'2026-10-01T09:03:00Z','backup','203.0.113.44','failure'),
(5,'2026-10-01T09:04:00Z','backup','203.0.113.44','success'),
(6,'2026-10-01T09:06:00Z','ana','198.51.100.20','success'),
(7,'2026-10-01T09:08:00Z','monitor','192.0.2.5','success');
CREATE TABLE assets (id INTEGER PRIMARY KEY, hostname TEXT NOT NULL, criticality TEXT NOT NULL);
INSERT INTO assets VALUES (1,'srv-casos','high'),(2,'pc-aula','low'),(3,'srv-backup','high');
`;

async function run(data) {
  const started=performance.now();
  if(!data||!['sql-investigation','failed-logins'].includes(data.taskId))invalid('Tarea SQL desconocida.','INVALID_TASK');
  validateQuery(data.query);
  const SQL=await initSqlJs({locateFile:file=>file.endsWith('.wasm')?(data.wasmPath||require.resolve('sql.js/dist/sql-wasm.wasm')):file});
  const db=new SQL.Database(); let statement;
  try {
    // sqlite allocator bounds also cover large cells and transient sorts, unlike
    // worker V8 resourceLimits which do not bound WebAssembly linear memory.
    db.run('PRAGMA hard_heap_limit=16777216; PRAGMA temp_store=MEMORY; PRAGMA max_page_count=256;');
    db.run(seed);
    db.run('PRAGMA query_only=ON;');
    statement=db.prepare(data.query);
    const columns=statement.getColumnNames();
    if(columns.length>64)invalid('Máximo 64 columnas por resultado.','RESULT_LIMIT');
    const rows=[];let truncated=false;
    while(statement.step()) {
      if(rows.length===200){truncated=true;break;}
      const row=statement.get().map(value=>{
        if(typeof value==='string'&&value.length>8192){truncated=true;return value.slice(0,8192)+'…';}
        if(value instanceof Uint8Array){if(value.length>256)truncated=true;return '[BLOB '+value.length+' bytes: '+Buffer.from(value.subarray(0,256)).toString('hex')+(value.length>256?'…':'')+']';}
        return value;
      });
      rows.push(row);
    }
    return {columns,rows,rowCount:rows.length,truncated,elapsedMs:Math.round((performance.now()-started)*100)/100};
  } finally { if(statement)statement.free();db.close(); }
}

run(workerData).then(result=>parentPort.postMessage(result)).catch(error=>parentPort.postMessage({error:{code:error.code||'SQL_ERROR',message:String(error.message||'No se pudo ejecutar la consulta.').slice(0,512)}}));
