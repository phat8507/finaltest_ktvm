/**
 * storage.js
 * localStorage wrappers for all persisted data.
 */

const KEYS = {
  HISTORY: 'macro_history',
  WRONG_QUESTIONS: 'macro_wrong_questions',
  MASTERED: 'macro_mastered',
  CONSECUTIVE: 'macro_consecutive_correct',
  ACCURACY_CHAPTER: 'macro_accuracy_chapter',
  ACCURACY_CLO: 'macro_accuracy_clo',
};

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('[storage] Failed to save:', key, e);
  }
}

// ── History ───────────────────────────────────────────────────────────────────
export function getHistory() {
  return load(KEYS.HISTORY, []);
}

export function saveSession(session) {
  const history = getHistory();
  history.unshift({ ...session, id: Date.now(), date: new Date().toISOString() });
  save(KEYS.HISTORY, history);
}

export function clearHistory() {
  save(KEYS.HISTORY, []);
}

// ── Wrong Questions ───────────────────────────────────────────────────────────
export function getWrongQuestions() {
  return load(KEYS.WRONG_QUESTIONS, {});
}

export function recordAnswer(questionId, isCorrect) {
  const wrongs = getWrongQuestions();
  const consec = load(KEYS.CONSECUTIVE, {});

  if (isCorrect) {
    consec[questionId] = (consec[questionId] || 0) + 1;
    // Remove from wrongs if mastered (2 correct in a row)
    if (consec[questionId] >= 2) {
      delete wrongs[questionId];
      const mastered = load(KEYS.MASTERED, {});
      mastered[questionId] = true;
      save(KEYS.MASTERED, mastered);
    }
  } else {
    wrongs[questionId] = (wrongs[questionId] || 0) + 1;
    consec[questionId] = 0;
  }

  save(KEYS.WRONG_QUESTIONS, wrongs);
  save(KEYS.CONSECUTIVE, consec);
}

export function recordBatchAnswers(answers) {
  // answers: { questionId: boolean }
  Object.entries(answers).forEach(([qId, correct]) => recordAnswer(qId, correct));
}

export function getMastered() {
  return load(KEYS.MASTERED, {});
}

export function resetMastered() {
  save(KEYS.MASTERED, {});
  save(KEYS.CONSECUTIVE, {});
}

// ── Accuracy ──────────────────────────────────────────────────────────────────
export function getAccuracyByChapter() {
  return load(KEYS.ACCURACY_CHAPTER, {});
}

export function getAccuracyByCLO() {
  return load(KEYS.ACCURACY_CLO, {});
}

export function updateAccuracy(answeredQuestions, questionsMap) {
  const byChapter = getAccuracyByChapter();
  const byCLO = getAccuracyByCLO();

  Object.entries(answeredQuestions).forEach(([qId, isCorrect]) => {
    const q = questionsMap[qId];
    if (!q) return;

    const chKey = q.week;
    if (!byChapter[chKey]) byChapter[chKey] = { correct: 0, total: 0 };
    byChapter[chKey].total++;
    if (isCorrect) byChapter[chKey].correct++;

    q.clo.forEach(clo => {
      if (!byCLO[clo]) byCLO[clo] = { correct: 0, total: 0 };
      byCLO[clo].total++;
      if (isCorrect) byCLO[clo].correct++;
    });
  });

  save(KEYS.ACCURACY_CHAPTER, byChapter);
  save(KEYS.ACCURACY_CLO, byCLO);
}

// ── Export / Import / Reset ───────────────────────────────────────────────────
export function exportProgress() {
  return {
    exportDate: new Date().toISOString(),
    history: getHistory(),
    wrongQuestions: getWrongQuestions(),
    mastered: getMastered(),
    accuracyByChapter: getAccuracyByChapter(),
    accuracyByCLO: getAccuracyByCLO(),
  };
}

export function importProgress(data) {
  if (data.history) save(KEYS.HISTORY, data.history);
  if (data.wrongQuestions) save(KEYS.WRONG_QUESTIONS, data.wrongQuestions);
  if (data.mastered) save(KEYS.MASTERED, data.mastered);
  if (data.accuracyByChapter) save(KEYS.ACCURACY_CHAPTER, data.accuracyByChapter);
  if (data.accuracyByCLO) save(KEYS.ACCURACY_CLO, data.accuracyByCLO);
}

export function resetAllProgress() {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
}
