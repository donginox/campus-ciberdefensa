const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

let Core = {};
try { Core = require('../src/shared/study-core.js'); } catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND') throw error;
}
const curriculum = { modules: [{ id: 'fundamentos', title: 'Fundamentos', lessons: [
  { id: 'redes', quiz: [
    { id: 'r1', prompt: 'Uno', options: ['A', 'B', 'C'], correct: 0 },
    { id: 'r2', prompt: 'Dos', options: ['A', 'B'], correct: 1 },
    { id: 'r3', prompt: 'Tres', options: ['A', 'B', 'C'], correct: 2 }
  ] },
  { id: 'sistemas', quiz: [
    { id: 's1', options: ['A', 'B'], correct: 1 },
    { id: 's2', options: ['A', 'B'], correct: 0 },
    { id: 's3', options: ['A', 'B'], correct: 1 }
  ] }
] }] };
const networks = curriculum.modules[0].lessons[0];
const systems = curriculum.modules[0].lessons[1];
const answer = 'Justifico mi decisión con evidencia suficiente.';
const correct = { r1: 0, r2: 1, r3: 2 };
function api(name) {
  assert.equal(typeof Core[name], 'function', `Falta la API ${name}`);
  return Core[name];
}
function fresh() { return api('createState')(curriculum); }
function complete(state, lesson = networks) {
  const answers = lesson.id === 'redes' ? correct : { s1: 1, s2: 0, s3: 1 };
  return Core.recordQuiz(Core.updateLesson(state, lesson.id, { read: true, practiceDone: true, answer }), lesson, answers);
}
function envelope(state) {
  return JSON.stringify({ app: 'academia-ciberdefensa', version: 1, savedAt: '2026-11-01T00:00:00.000Z', state });
}

test('a fresh course has independent lesson progress and no implied quiz attempt', () => {
  const state = fresh();
  assert.equal(state.version, 1);
  assert.equal(state.lastLessonId, null);
  assert.equal(Number.isNaN(Date.parse(state.updatedAt)), false);
  assert.deepEqual(Object.keys(state.lessons), ['redes', 'sistemas']);
  assert.deepEqual(state.lessons.redes, {
    read: false, practiceDone: false, answer: '', notes: '',
    lastScore: null, bestScore: null, attempts: 0, lastAnswers: {}
  });
  assert.deepEqual(state.final, { notes: '', stations: {} });
  assert.notEqual(state.lessons.redes, state.lessons.sistemas);
});

test('editing a lesson preserves the previous state and updates the resume target', () => {
  api('updateLesson'); api('getLesson');
  const previous = fresh();
  const edited = Core.updateLesson(previous, 'redes', { read: true, answer, notes: 'Línea 1\nLínea 2' });
  assert.equal(previous.lessons.redes.read, false);
  assert.equal(previous.lastLessonId, null);
  assert.equal(edited.lastLessonId, 'redes');
  assert.equal(edited.lessons.redes.answer, answer);
  assert.equal(edited.lessons.redes.notes, 'Línea 1\nLínea 2');
  assert.equal(Core.getLesson(edited, 'redes').read, true);
  assert.equal(Core.getLesson(edited, 'ausente'), null);
  assert.throws(() => Core.updateLesson(previous, 'redes', { read: 'true' }), /lectura|boolean|tipo/i);
  assert.throws(() => Core.updateLesson(previous, 'redes', { bestScore: 3 }), /campo|permitid/i);
  assert.throws(() => Core.updateLesson(previous, 'ausente', { read: true }), /lección/i);
});

test('completion requires reading, practice, a substantial answer, and at least two correct answers', () => {
  const isComplete = api('isComplete');
  const ready = { read: true, practiceDone: true, answer: '12345678901234567890', bestScore: 2 };
  assert.equal(isComplete(ready), true);
  for (const patch of [{ read: false }, { practiceDone: false }, { answer: ' 1234567890123456789 ' }, { bestScore: 1 }, { bestScore: null }]) {
    assert.equal(isComplete({ ...ready, ...patch }), false);
  }
  assert.equal(isComplete(null), false);
});

test('an unanswered quiz cannot silently award the first option or change progress', () => {
  const recordQuiz = api('recordQuiz');
  const state = fresh();
  assert.throws(() => recordQuiz(state, networks, { r2: 1, r3: 2 }), /todas|falt|respond/i);
  assert.throws(() => recordQuiz(state, networks, { r1: null, r2: 1, r3: 2 }), /opción|respuesta|entero/i);
  assert.throws(() => recordQuiz(state, networks, { r1: 3, r2: 1, r3: 2 }), /opción|respuesta/i);
  assert.throws(() => recordQuiz(state, networks, { r1: '0', r2: 1, r3: 2 }), /opción|respuesta|entero/i);
  assert.throws(() => recordQuiz(state, networks, []), /objeto|respuestas/i);
  assert.equal(state.lessons.redes.attempts, 0);
  assert.equal(state.lessons.redes.lastScore, null);
});

test('quiz attempts keep the actual latest score and retain the strongest result', () => {
  api('recordQuiz');
  const state = fresh();
  const submitted = { ...correct };
  const first = Core.recordQuiz(state, networks, submitted);
  submitted.r1 = 2;
  const second = Core.recordQuiz(first, networks, { r1: 1, r2: 1, r3: 1 });
  assert.equal(first.lessons.redes.lastScore, 3);
  assert.equal(first.lessons.redes.lastAnswers.r1, 0);
  assert.equal(second.lessons.redes.lastScore, 1);
  assert.equal(second.lessons.redes.bestScore, 3);
  assert.equal(second.lessons.redes.attempts, 2);
  assert.deepEqual(second.lessons.redes.lastAnswers, { r1: 1, r2: 1, r3: 1 });
  assert.equal(second.lastLessonId, 'redes');
  assert.equal(state.lessons.redes.attempts, 0);
});

test('summary counts complete work, substantive written answers, and quizzes needing review', () => {
  api('summary'); api('updateLesson'); api('recordQuiz');
  let state = complete(fresh());
  state = Core.updateLesson(state, 'sistemas', { answer });
  state = Core.recordQuiz(state, systems, { s1: 0, s2: 0, s3: 0 });
  assert.deepEqual(Core.summary(state, curriculum), { total: 2, completed: 1, percent: 50, answered: 2, review: 1 });
  assert.deepEqual(Core.summary(Core.createState({ modules: [] }), { modules: [] }), { total: 0, completed: 0, percent: 0, answered: 0, review: 0 });
});

test('resume prefers the last unfinished lesson, skips completed lessons, and ends at null', () => {
  api('nextLesson'); api('updateLesson'); api('recordQuiz');
  let state = fresh();
  assert.equal(Core.nextLesson(state, curriculum).id, 'redes');
  state = Core.updateLesson(state, 'sistemas', { notes: 'Seguir aquí' });
  assert.equal(Core.nextLesson(state, curriculum).id, 'sistemas');
  state = complete(state, systems);
  assert.equal(Core.nextLesson(state, curriculum).id, 'redes');
  state = complete(state);
  assert.equal(Core.nextLesson(state, curriculum), null);
});

test('normalization fills missing progress, preserves text, and drops obsolete lesson ids', () => {
  const normalize = api('normalizeState');
  const raw = { version: 1, lessons: { redes: { read: true, answer: 'Acentos: decisión y acción.\nOtra línea.', notes: 'Útil' }, antigua: {} }, lastLessonId: 'antigua', final: { notes: 'Resumen', stations: { dns: 'Investigación\nCon evidencia.' } } };
  const normalized = normalize(raw, curriculum);
  assert.equal(normalized.lessons.redes.read, true);
  assert.equal(normalized.lessons.redes.practiceDone, false);
  assert.equal(normalized.lessons.redes.answer, 'Acentos: decisión y acción.\nOtra línea.');
  assert.equal(normalized.lessons.redes.notes, 'Útil');
  assert.deepEqual(Object.keys(normalized.lessons), ['redes', 'sistemas']);
  assert.equal(normalized.lastLessonId, null);
  assert.deepEqual(normalized.final, { notes: 'Resumen', stations: { dns: 'Investigación\nCon evidencia.' } });
  assert.equal(raw.lessons.redes.practiceDone, undefined);
});

test('normalization rejects incompatible versions, arrays, and incoherent progress types', () => {
  const normalize = api('normalizeState');
  for (const raw of [null, [], { version: 2 }, { version: '1' }, { version: 1, lessons: [] }, { version: 1, final: [] }, { version: 1, final: { stations: { dns: true } } }, { version: 1, lastLessonId: 123 }]) {
    assert.throws(() => normalize(raw, curriculum), Error);
  }
  for (const patch of [{ read: 1 }, { practiceDone: 'false' }, { answer: false }, { notes: [] }, { lastScore: 4 }, { bestScore: -1 }, { attempts: 1.5 }, { lastAnswers: [] }]) {
    assert.throws(() => normalize({ version: 1, lessons: { redes: patch } }, curriculum), Error);
  }
});

test('backup round trips Unicode, newlines, quiz history, and final assessment notes', () => {
  api('exportBackup'); api('importBackup'); api('updateLesson'); api('recordQuiz');
  let state = complete(fresh());
  state = Core.updateLesson(state, 'redes', { notes: 'Análisis de tráfico 🛡️\nDecisión: aislar.' });
  state.final = { notes: 'Explicación general\nCon acentos: áéíóú.', stations: { red: 'Hallazgo\nCon evidencia', host: 'Contención segura' } };
  const text = Core.exportBackup(state);
  const saved = JSON.parse(text);
  assert.equal(saved.app, 'academia-ciberdefensa');
  assert.equal(saved.version, 1);
  assert.equal(Number.isNaN(Date.parse(saved.savedAt)), false);
  assert.deepEqual(Core.importBackup(text, curriculum), state);
});

test('invalid import throws without touching the current state', () => {
  api('importBackup'); api('updateLesson');
  const state = Core.updateLesson(fresh(), 'redes', { notes: 'No perder estas notas.' });
  const before = JSON.stringify(state);
  for (const text of ['{', '[]', JSON.stringify({ app: 'otro', version: 1, state }), JSON.stringify({ app: 'academia-ciberdefensa', version: 2, state }), envelope({ ...state, lessons: { redes: { read: 'sí' } } })]) {
    assert.throws(() => Core.importBackup(text, curriculum), Error);
    assert.equal(JSON.stringify(state), before);
  }
});

test('backup size limit counts UTF-8 bytes, including non-ASCII text', () => {
  api('importBackup');
  const state = fresh();
  state.final.notes = 'á'.repeat(2700000);
  const text = envelope(state);
  assert.ok(text.length < 5 * 1024 * 1024);
  assert.throws(() => Core.importBackup(text, curriculum), /5 MB|tamaño|grande/i);
});

test('export rejects a UTF-8 backup that would be too large to restore', () => {
  api('exportBackup');
  const state = fresh();
  state.final.notes = 'á'.repeat(2700000);
  assert.throws(() => Core.exportBackup(state), /5 MB|tamaño|grande/i);
  assert.equal(state.final.notes.length, 2700000);
});

test('a backup at exactly five megabytes can still be exported and restored', () => {
  api('exportBackup'); api('importBackup');
  const state = fresh();
  // Fill the serialized envelope; Buffer is an independent UTF-8 byte oracle.
  const available = 5242880 - Buffer.byteLength(Core.exportBackup(state), 'utf8');
  state.final.notes = 'á'.repeat(Math.floor(available / 2)) + (available % 2 ? 'a' : '');
  const text = Core.exportBackup(state);
  assert.equal(Buffer.byteLength(text, 'utf8'), 5242880);
  assert.deepEqual(Core.importBackup(text, curriculum), state);
  state.final.notes += 'a';
  assert.throws(() => Core.exportBackup(state), /5 MB|tamaño|grande/i);
});

test('import rejects compact JSON whose restored state cannot be exported within the size limit', () => {
  api('importBackup'); api('exportBackup');
  const state = fresh();
  const available = 5242880 - Buffer.byteLength(envelope(state), 'utf8');
  state.final.notes = 'a'.repeat(available);
  const text = envelope(state);
  const before = JSON.stringify(state);
  assert.equal(Buffer.byteLength(text, 'utf8'), 5242880);
  assert.throws(() => Core.exportBackup(state), /5 MB|tamaño|grande/i);
  assert.throws(() => Core.importBackup(text, curriculum), /5 MB|tamaño|grande/i);
  assert.equal(JSON.stringify(state), before);
});

test('unsafe object keys are rejected at every backup depth without prototype pollution', () => {
  api('importBackup'); api('normalizeState');
  for (const key of ['__proto__', 'constructor', 'prototype']) {
    const raw = JSON.parse(`{"version":1,"lessons":{"redes":{"${key}":{"studyPolluted":true}}}}`);
    assert.throws(() => Core.normalizeState(raw, curriculum), /clave|permitid|inválid/i);
    const station = JSON.parse(`{"version":1,"final":{"stations":{"${key}":"malicioso"}}}`);
    assert.throws(() => Core.importBackup(envelope(station), curriculum), /clave|permitid|inválid/i);
  }
  assert.equal({}.studyPolluted, undefined);
  assert.throws(() => Core.createState({ modules: [{ id: 'm', lessons: [{ id: '__proto__', quiz: [] }] }] }), Error);
});

test('the same core runs in a browser global without CommonJS or a DOM', () => {
  api('createState');
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/shared/study-core.js'), 'utf8'), context);
  const created = context.StudyCore.createState(curriculum);
  assert.equal(created.lessons.redes.attempts, 0);
  assert.equal(context.StudyCore.nextLesson(created, curriculum).id, 'redes');
});
