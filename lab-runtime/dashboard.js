'use strict';
const element = id => document.getElementById(id);
async function request(path, body, actor) {
  const response = await fetch(path, {method: body === undefined ? 'GET' : 'POST', headers: {'Content-Type': 'application/json', ...(actor ? {'X-Campus-Actor': actor} : {})}, ...(body === undefined ? {} : {body: JSON.stringify(body)})});
  const result = await response.json();
  if (!response.ok) throw new Error(result.feedback || result.error || `HTTP ${response.status}`);
  return result;
}
async function refresh() { element('events').textContent = JSON.stringify(await request('/api/events'), null, 2); }
async function perform(path, body, actor) {
  const buttons = [...document.querySelectorAll('button')];
  buttons.forEach(button => { button.disabled = true; });
  element('status').textContent = 'Enviando solicitud…';
  try { element('result').textContent = JSON.stringify(await request(path, body, actor), null, 2); element('status').textContent = 'Solicitud completada.'; }
  catch (error) { element('status').textContent = `Solicitud: ${error.message}`; }
  finally { try { await refresh(); } catch (error) { element('status').textContent = error.message; } buttons.forEach(button => { button.disabled = false; }); }
}
element('login').onclick = () => perform('/login', {username: element('username').value, password: element('password').value}, element('actor').value);
element('catalog').onclick = () => perform('/catalog', undefined, element('actor').value);
element('admin').onclick = () => perform('/admin', undefined, element('actor').value);
element('block').onclick = () => perform('/api/control', {action: 'block', actor: element('actor').value});
element('assess').onclick = () => perform('/api/assess', {actor: element('actor').value, failures: Number(element('failures').value)});
element('execute').onclick = () => perform('/api/query', {query: element('query').value});
element('refresh').onclick = () => perform('/api/events');
(async () => {
  try { const data = await request('/api/case'); element('title').textContent = data.title; element('description').textContent = data.description; element('objective').textContent = data.objective; element('source').textContent = data.sourceNote; element('identity').textContent = `Caso: ${data.caseId}`; element(data.mode).hidden = false; await refresh(); }
  catch (error) { element('status').textContent = `No se pudo cargar la práctica: ${error.message}`; }
})();
