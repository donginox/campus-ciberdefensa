'use strict';

const JUICE_IMAGE = 'bkimminich/juice-shop@sha256:cea5a4af4aacee498c491491af0408934ec81d004035c0a02ef3e54395e3bf27';
const CAPABILITIES = Object.freeze(['start', 'open', 'stop', 'reset', 'replay', 'query', 'evidence', 'assess', 'contain']);
const recipes = Object.freeze({
  'juice-shop': Object.freeze({ id: 'juice-shop', title: 'OWASP Juice Shop', description: 'Aplicación web de práctica local.', image: JUICE_IMAGE, imageVersion: '20.3.0', port: 3000, memory: '768m', memoryBytes: 805306368, pids: 256, ephemeral: false, mode: null }),
  'soc-response': Object.freeze({ id: 'soc-response', title: 'Respuesta SOC', description: 'Caso de práctica con tráfico HTTP y registros reales.', imageVersion: 'incluida', port: 8080, memory: '512m', memoryBytes: 536870912, pids: 128, ephemeral: true, mode: 'soc' }),
  'database-fundamentals': Object.freeze({ id: 'database-fundamentals', title: 'Fundamentos de bases de datos', description: 'Consultas sobre una base SQLite real en memoria.', imageVersion: 'incluida', port: 8080, memory: '512m', memoryBytes: 536870912, pids: 128, ephemeral: true, mode: 'database' })
});
const LAB_IDS = Object.freeze(Object.keys(recipes));
function getRecipe(id = 'juice-shop') {
  if (typeof id !== 'string' || !Object.hasOwn(recipes, id)) throw new Error('Identificador de laboratorio inválido.');
  return recipes[id];
}
function capabilities(recipe, state, validated = true) {
  const result = Object.fromEntries(CAPABILITIES.map(key => [key, false]));
  if (!validated) return result;
  result.start = ['missing', 'stopped'].includes(state);
  result.reset = ['running', 'starting', 'stopped', 'error'].includes(state);
  result.stop = ['running', 'starting'].includes(state);
  if (state === 'running') {
    result.open = true; result.evidence = Boolean(recipe.mode);
    result.replay = result.assess = result.contain = recipe.mode === 'soc';
    result.query = recipe.mode === 'database';
  }
  return result;
}
function catalog() {
  return LAB_IDS.map(id => {
    const r = recipes[id];
    return { id, title: r.title, name: r.title, description: r.description, imageVersion: r.imageVersion, ephemeral: r.ephemeral, mode: r.mode, capabilities: { ...capabilities(r, 'running'), start: true, reset: true } };
  });
}
module.exports = { LAB_IDS, getRecipe, catalog, capabilities };
