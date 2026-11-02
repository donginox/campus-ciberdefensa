const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {Worker} = require('node:worker_threads');
const engine = require('../src/labs/lab-engine.js');
function sql(query, taskId='sql-investigation') {
 return new Promise((resolve,reject)=>{
  const worker = new Worker(path.join(__dirname,'../src/labs/sql-worker.cjs'),{workerData:{query,taskId},resourceLimits:{maxOldGenerationSizeMb:64}});
  const timer=setTimeout(()=>{worker.terminate();reject(new Error('Test worker timed out'));},3000);
  worker.once('message',result=>{clearTimeout(timer);worker.terminate();resolve(result);});worker.once('error',error=>{clearTimeout(timer);reject(error);});
 });
}
test('SQLite executes aggregate over actual fixed data and evaluation consumes rows',async()=>{
 const result=await sql("SELECT source_ip, count(*) AS failures FROM auth_events WHERE outcome='failure' GROUP BY source_ip HAVING count(*)>=3");
 assert.deepEqual(result.columns,['source_ip','failures']);
 assert.deepEqual(result.rows,[['203.0.113.44',3]]);
 assert.equal(result.rowCount,1);assert.equal(result.truncated,false);
 assert.equal(engine.evaluate('sql-investigation',{result}).passed,true);
 const wrong=await sql("SELECT '203.0.113.44' AS source_ip, 2 AS failures");
 assert.equal(engine.evaluate('sql-investigation',{result:wrong}).passed,false);
});
test('SQLite blocks mutation, injection, filesystem functions and malformed inputs',async()=>{
 for(const query of ["SELECT 1; DELETE FROM auth_events",'DELETE FROM auth_events','PRAGMA database_list',"ATTACH DATABASE '/tmp/private' AS private", "SELECT load_extension('x')",'WITH rows AS (SELECT 1) DELETE FROM auth_events','SELECT 1; SELECT 2','SELECT 1 /*','SELECT '+ 'x'.repeat(8000),null]){
  const result=await sql(query);assert.equal(typeof result.error?.message,'string',String(query).slice(0,60));
 }
 const unknown=await sql('SELECT 1','unrecognized');assert.equal(unknown.error.code,'INVALID_TASK');
});
test('read-only parser accepts quoted semicolons and comments, and each invocation resets seed',async()=>{
 const result=await sql("-- SELECT with an inert string\nWITH x AS (SELECT '; DELETE FROM auth_events' AS note) SELECT note FROM x;");
 assert.deepEqual(result.rows,[['; DELETE FROM auth_events']]);
 const fresh=await sql('SELECT COUNT(*) AS total FROM auth_events');assert.deepEqual(fresh.rows,[[7]]);
});
test('recursive SELECT truncates while stepping and reports cap without materializing all rows',async()=>{
 const result=await sql('WITH RECURSIVE series(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM series WHERE n<1000000) SELECT n FROM series');
 assert.equal(result.rowCount,200);assert.equal(result.rows.length,200);assert.equal(result.truncated,true);
 assert.deepEqual(result.rows[0],[1]);assert.deepEqual(result.rows.at(-1),[200]);
});

test('SQLite rejects oversized allocations and never transports an unbounded result cell',async()=>{
 const huge=await sql('SELECT randomblob(100000000)');
 assert.equal(typeof huge.error?.message,'string');
 const cell=await sql("SELECT printf('%10000s','a') AS value");
 assert.equal(cell.truncated,true);assert.ok(cell.rows[0][0].length<=8193);
});
