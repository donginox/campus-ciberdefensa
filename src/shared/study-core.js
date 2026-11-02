(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.StudyCore = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var APP = 'academia-ciberdefensa';
  var MAX_BYTES = 5 * 1024 * 1024;
  var forbidden = ['__proto__', 'constructor', 'prototype'];
  var own = function (value, key) { return Object.prototype.hasOwnProperty.call(value, key); };
  var now = function () { return new Date().toISOString(); };

  function fail(message) { throw new Error(message); }
  function safeId(id) {
    return typeof id === 'string' && id.length > 0 && forbidden.indexOf(id) === -1;
  }
  function object(value, name) {
    if (!value || Object.prototype.toString.call(value) !== '[object Object]') fail((name || 'El dato') + ' debe ser un objeto válido.');
    var proto = Object.getPrototypeOf(value);
    if (proto !== null && Object.getPrototypeOf(proto) !== null) fail((name || 'El dato') + ' debe ser un objeto simple.');
    return value;
  }
  function safeTree(value) {
    var pending = [value];
    var seen = new Set();
    while (pending.length) {
      var item = pending.pop();
      if (!item || typeof item !== 'object') continue;
      object(item, 'El respaldo');
      if (seen.has(item)) fail('El respaldo contiene una estructura circular inválida.');
      seen.add(item);
      Object.keys(item).forEach(function (key) {
        if (forbidden.indexOf(key) !== -1) fail('El respaldo contiene una clave no permitida.');
        pending.push(item[key]);
      });
    }
  }
  function lessonsOf(curriculum) {
    object(curriculum, 'El programa');
    if (!Array.isArray(curriculum.modules)) fail('El programa debe incluir sus módulos.');
    var found = Object.create(null);
    var lessons = [];
    curriculum.modules.forEach(function (module) {
      object(module, 'El módulo');
      if (!Array.isArray(module.lessons)) fail('El módulo debe incluir sus lecciones.');
      module.lessons.forEach(function (lesson) {
        object(lesson, 'La lección');
        if (!safeId(lesson.id) || found[lesson.id]) fail('El programa contiene una clave de lección inválida o repetida.');
        found[lesson.id] = true;
        lessons.push(lesson);
      });
    });
    return lessons;
  }
  function emptyProgress() {
    return { read: false, practiceDone: false, answer: '', notes: '', lastScore: null, bestScore: null, attempts: 0, lastAnswers: {} };
  }
  function defaultPreferences() {
    return { theme: 'system', font: 'standard', contrast: 'standard', spacing: 'standard', motion: 'system', focusMode: false };
  }
  function preferencePatch(raw) {
    object(raw, 'Las preferencias');
    safeTree(raw);
    var choices = { theme: ['system', 'light', 'dark'], font: ['standard', 'large', 'xl'], contrast: ['standard', 'high'], spacing: ['standard', 'wide'], motion: ['system', 'reduced'] };
    Object.keys(raw).forEach(function (key) {
      if (key === 'focusMode') {
        if (typeof raw[key] !== 'boolean') fail('El modo de concentración debe tener un valor booleano.');
      } else if (!own(choices, key) || choices[key].indexOf(raw[key]) === -1) fail('La preferencia o su valor no son válidos.');
    });
    return raw;
  }
  function updatePreferences(state, patch) {
    preferencePatch(patch);
    return Object.assign({}, state, { preferences: Object.assign(defaultPreferences(), state.preferences, patch), updatedAt: now() });
  }
  function roadmapId(id) {
    return safeId(id) && /^[a-zA-Z0-9_-]{1,160}$/.test(id);
  }
  function updateRoadmapTask(state, id, checked) {
    if (!roadmapId(id)) fail('La clave del paso no es válida.');
    if (typeof checked !== 'boolean') fail('El paso debe tener un valor booleano.');
    var previous = state.roadmap || { tasks: {}, notes: {} };
    var tasks = Object.assign({}, previous.tasks);
    tasks[id] = checked;
    return Object.assign({}, state, { roadmap: { tasks: tasks, notes: Object.assign({}, previous.notes) }, updatedAt: now() });
  }
  function updateRoadmapNote(state, id, text) {
    if (!roadmapId(id) || typeof text !== 'string') fail('La clave y las notas de la ruta no son válidas.');
    var previous = state.roadmap || { tasks: {}, notes: {} };
    var notes = Object.assign({}, previous.notes);
    notes[id] = text;
    return Object.assign({}, state, { roadmap: { tasks: Object.assign({}, previous.tasks), notes: notes }, updatedAt: now() });
  }
  function createState(curriculum) {
    var state = { version: 1, updatedAt: now(), lessons: {}, lastLessonId: null, final: { notes: '', stations: {} }, preferences: defaultPreferences(), roadmap: { tasks: {}, notes: {} } };
    lessonsOf(curriculum).forEach(function (lesson) { state.lessons[lesson.id] = emptyProgress(); });
    return state;
  }
  function getLesson(state, id) {
    return safeId(id) && state && state.lessons && own(state.lessons, id) ? state.lessons[id] : null;
  }
  function checkEditable(key, value) {
    if (key === 'read' || key === 'practiceDone') {
      if (typeof value !== 'boolean') fail('La lectura y la práctica deben tener un valor booleano.');
    } else if (key === 'answer' || key === 'notes') {
      if (typeof value !== 'string') fail('La respuesta y las notas deben ser texto.');
    } else fail('El campo de progreso no está permitido.');
  }
  function replaceProgress(state, id, progress) {
    var lessons = Object.assign({}, state.lessons);
    lessons[id] = progress;
    return Object.assign({}, state, { lessons: lessons, lastLessonId: id, updatedAt: now() });
  }
  function updateLesson(state, id, patch) {
    var previous = getLesson(state, id);
    if (!previous) fail('No se encontró la lección indicada.');
    object(patch, 'La edición');
    safeTree(patch);
    Object.keys(patch).forEach(function (key) { checkEditable(key, patch[key]); });
    return replaceProgress(state, id, Object.assign({}, previous, patch));
  }
  function quizQuestions(lesson) {
    object(lesson, 'La lección');
    if (!safeId(lesson.id) || !Array.isArray(lesson.quiz) || lesson.quiz.length !== 3) fail('La lección debe tener una autoevaluación válida de tres preguntas.');
    var ids = Object.create(null);
    lesson.quiz.forEach(function (question) {
      object(question, 'La pregunta');
      if (!safeId(question.id) || ids[question.id]) fail('La pregunta tiene una clave inválida o repetida.');
      if (!Array.isArray(question.options) || question.options.length < 2 || !Number.isInteger(question.correct) || question.correct < 0 || question.correct >= question.options.length) fail('Las opciones de la pregunta son inválidas.');
      ids[question.id] = true;
    });
    return lesson.quiz;
  }
  function scoreAnswers(lesson, answers) {
    object(answers, 'Las respuestas');
    safeTree(answers);
    var questions = quizQuestions(lesson);
    var ids = questions.map(function (question) { return question.id; });
    if (Object.keys(answers).some(function (key) { return ids.indexOf(key) === -1; })) fail('Las respuestas incluyen una pregunta desconocida.');
    var score = 0;
    questions.forEach(function (question) {
      if (!own(answers, question.id)) fail('Respondé todas las preguntas antes de corregir.');
      var index = answers[question.id];
      if (!Number.isInteger(index) || index < 0 || index >= question.options.length) fail('Cada respuesta debe indicar una opción válida con un índice entero.');
      if (index === question.correct) score += 1;
    });
    return score;
  }
  function recordQuiz(state, lesson, answers) {
    if (!lesson || !getLesson(state, lesson.id)) fail('No se encontró la lección indicada.');
    var score = scoreAnswers(lesson, answers);
    var previous = getLesson(state, lesson.id);
    return replaceProgress(state, lesson.id, Object.assign({}, previous, {
      lastScore: score,
      bestScore: previous.bestScore === null ? score : Math.max(previous.bestScore, score),
      attempts: previous.attempts + 1,
      lastAnswers: Object.assign({}, answers)
    }));
  }
  function isComplete(progress) {
    return !!(progress && progress.read === true && progress.practiceDone === true && typeof progress.answer === 'string' && progress.answer.trim().length >= 20 && Number.isInteger(progress.bestScore) && progress.bestScore >= 2);
  }
  function summary(state, curriculum) {
    var lessons = lessonsOf(curriculum);
    var result = { total: lessons.length, completed: 0, percent: 0, answered: 0, review: 0 };
    lessons.forEach(function (lesson) {
      var progress = getLesson(state, lesson.id);
      if (!progress) return;
      if (isComplete(progress)) result.completed += 1;
      if (typeof progress.answer === 'string' && progress.answer.trim().length >= 20) result.answered += 1;
      if (progress.attempts > 0 && progress.bestScore < 2) result.review += 1;
    });
    result.percent = result.total ? Math.round(result.completed / result.total * 100) : 0;
    return result;
  }
  function nextLesson(state, curriculum) {
    var lessons = lessonsOf(curriculum);
    var last = lessons.find(function (lesson) { return lesson.id === state.lastLessonId && !isComplete(getLesson(state, lesson.id)); });
    return last || lessons.find(function (lesson) { return !isComplete(getLesson(state, lesson.id)); }) || null;
  }
  function normalizeProgress(raw, lesson) {
    object(raw, 'El progreso de la lección');
    var progress = emptyProgress();
    ['read', 'practiceDone', 'answer', 'notes'].forEach(function (key) {
      if (own(raw, key)) {
        checkEditable(key, raw[key]);
        progress[key] = raw[key];
      }
    });
    ['lastScore', 'bestScore'].forEach(function (key) {
      if (!own(raw, key)) return;
      if (raw[key] !== null && (!Number.isInteger(raw[key]) || raw[key] < 0 || raw[key] > 3)) fail('La puntuación de la autoevaluación es inválida.');
      progress[key] = raw[key];
    });
    if (own(raw, 'attempts')) {
      if (!Number.isSafeInteger(raw.attempts) || raw.attempts < 0) fail('La cantidad de intentos debe ser un entero válido.');
      progress.attempts = raw.attempts;
    }
    if (own(raw, 'lastAnswers')) {
      object(raw.lastAnswers, 'Las respuestas de la autoevaluación');
      progress.lastAnswers = Object.assign({}, raw.lastAnswers);
    }
    if (progress.attempts === 0) {
      if (progress.lastScore !== null || progress.bestScore !== null || Object.keys(progress.lastAnswers).length) fail('El progreso incluye puntuaciones sin un intento registrado.');
    } else {
      if (progress.lastScore === null || progress.bestScore === null || progress.bestScore < progress.lastScore) fail('Las puntuaciones y los intentos son incoherentes.');
      if (scoreAnswers(lesson, progress.lastAnswers) !== progress.lastScore) fail('Las respuestas no coinciden con la última puntuación.');
    }
    return progress;
  }
  function normalizeState(raw, curriculum) {
    object(raw, 'El progreso');
    safeTree(raw);
    if (raw.version !== 1) fail('La versión del progreso no es compatible.');
    var state = createState(curriculum);
    if (own(raw, 'updatedAt')) {
      if (typeof raw.updatedAt !== 'string' || !Number.isFinite(Date.parse(raw.updatedAt))) fail('La fecha del progreso es inválida.');
      state.updatedAt = raw.updatedAt;
    }
    if (own(raw, 'lessons')) {
      object(raw.lessons, 'Las lecciones');
      Object.keys(raw.lessons).forEach(function (id) { object(raw.lessons[id], 'El progreso de la lección'); });
      lessonsOf(curriculum).forEach(function (lesson) {
        if (own(raw.lessons, lesson.id)) state.lessons[lesson.id] = normalizeProgress(raw.lessons[lesson.id], lesson);
      });
    }
    if (own(raw, 'lastLessonId')) {
      if (raw.lastLessonId !== null && typeof raw.lastLessonId !== 'string') fail('La última lección debe ser una clave válida.');
      if (raw.lastLessonId !== null && getLesson(state, raw.lastLessonId)) state.lastLessonId = raw.lastLessonId;
    }
    if (own(raw, 'final')) {
      object(raw.final, 'La evaluación final');
      if (own(raw.final, 'notes')) {
        if (typeof raw.final.notes !== 'string') fail('Las notas finales deben ser texto.');
        state.final.notes = raw.final.notes;
      }
      if (own(raw.final, 'stations')) {
        object(raw.final.stations, 'Las estaciones finales');
        Object.keys(raw.final.stations).forEach(function (id) {
          if (!safeId(id) || typeof raw.final.stations[id] !== 'string') fail('La estación final debe contener una clave y notas de texto válidas.');
          state.final.stations[id] = raw.final.stations[id];
        });
      }
    }
    if (own(raw, 'preferences')) state.preferences = Object.assign(defaultPreferences(), preferencePatch(raw.preferences));
    if (own(raw, 'roadmap')) {
      object(raw.roadmap, 'La ruta de certificaciones');
      if (own(raw.roadmap, 'tasks')) {
        object(raw.roadmap.tasks, 'Los pasos de la ruta');
        Object.keys(raw.roadmap.tasks).forEach(function (id) {
          if (!roadmapId(id) || typeof raw.roadmap.tasks[id] !== 'boolean') fail('El paso debe tener una clave válida y un valor booleano.');
          state.roadmap.tasks[id] = raw.roadmap.tasks[id];
        });
      }
      if (own(raw.roadmap, 'notes')) {
        object(raw.roadmap.notes, 'Las notas de la ruta');
        Object.keys(raw.roadmap.notes).forEach(function (id) {
          if (!roadmapId(id) || typeof raw.roadmap.notes[id] !== 'string') fail('Las notas de la ruta deben tener una clave válida y texto.');
          state.roadmap.notes[id] = raw.roadmap.notes[id];
        });
      }
    }
    return state;
  }
  function exportBackup(state) {
    object(state, 'El progreso');
    safeTree(state);
    if (state.version !== 1) fail('La versión del progreso no es compatible.');
    var text = JSON.stringify({ app: APP, version: 1, savedAt: now(), state: state }, null, 2);
    if (text.length > MAX_BYTES || utf8Bytes(text) > MAX_BYTES) fail('El respaldo supera el tamaño máximo de 5 MB. Reducí las notas antes de exportar.');
    return text;
  }
  function utf8Bytes(text) {
    var count = 0;
    for (var i = 0; i < text.length; i += 1) {
      var code = text.charCodeAt(i);
      if (code < 0x80) count += 1;
      else if (code < 0x800) count += 2;
      else if (code >= 0xD800 && code <= 0xDBFF && i + 1 < text.length && text.charCodeAt(i + 1) >= 0xDC00 && text.charCodeAt(i + 1) <= 0xDFFF) { count += 4; i += 1; }
      else count += 3;
      if (count > MAX_BYTES) break;
    }
    return count;
  }
  function importBackup(text, curriculum) {
    if (typeof text !== 'string') fail('El respaldo debe ser texto JSON.');
    if (text.length > MAX_BYTES || utf8Bytes(text) > MAX_BYTES) fail('El respaldo supera el tamaño máximo de 5 MB.');
    var backup;
    try { backup = JSON.parse(text); } catch (error) { fail('No se pudo leer el respaldo: el archivo JSON es inválido.'); }
    object(backup, 'El respaldo');
    safeTree(backup);
    if (backup.app !== APP) fail('El respaldo no pertenece a Academia de Ciberdefensa.');
    if (backup.version !== 1) fail('La versión del respaldo no es compatible.');
    if (!own(backup, 'state')) fail('El respaldo no contiene progreso.');
    if (typeof backup.savedAt !== 'string' || !Number.isFinite(Date.parse(backup.savedAt))) fail('La fecha del respaldo es inválida.');
    var state = normalizeState(backup.state, curriculum);
    exportBackup(state);
    return state;
  }

  return { createState: createState, normalizeState: normalizeState, getLesson: getLesson, updateLesson: updateLesson, recordQuiz: recordQuiz, isComplete: isComplete, summary: summary, nextLesson: nextLesson, exportBackup: exportBackup, importBackup: importBackup, updatePreferences: updatePreferences, updateRoadmapTask: updateRoadmapTask, updateRoadmapNote: updateRoadmapNote };
}));
