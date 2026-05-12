/**
 * stats.js
 * Computes statistics from history and accuracy data.
 */

import { getAccuracyByChapter, getAccuracyByCLO, getHistory, getWrongQuestions } from './storage.js';

export function getOverallAccuracy() {
  const history = getHistory();
  if (!history.length) return null;
  const totals = history.reduce((acc, s) => {
    acc.correct += s.correctCount || 0;
    acc.total += s.answeredCount || s.totalQuestions || 0;
    return acc;
  }, { correct: 0, total: 0 });
  return totals.total > 0 ? Math.round((totals.correct / totals.total) * 100) : 0;
}

export function getWeakestChapters(n = 3) {
  const acc = getAccuracyByChapter();
  return Object.entries(acc)
    .filter(([, v]) => v.total > 0)
    .map(([week, v]) => ({ week, accuracy: Math.round((v.correct / v.total) * 100), total: v.total }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, n);
}

export function getWeakestCLOs(n = 3) {
  const acc = getAccuracyByCLO();
  return Object.entries(acc)
    .filter(([, v]) => v.total > 0)
    .map(([clo, v]) => ({ clo, accuracy: Math.round((v.correct / v.total) * 100), total: v.total }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, n);
}

export function getChapterStats() {
  return getAccuracyByChapter();
}

export function getCLOStats() {
  return getAccuracyByCLO();
}

export function getWrongCount() {
  return Object.keys(getWrongQuestions()).length;
}

export function computeSessionStats(examQuestions, userAnswers) {
  let correct = 0;
  const byChapter = {};
  const byCLO = {};
  const wrongList = [];

  examQuestions.forEach(q => {
    const userAns = userAnswers[q.id];
    const isCorrect = userAns === q.answer;
    if (isCorrect) correct++;
    else wrongList.push({ question: q, userAnswer: userAns });

    // By chapter
    if (!byChapter[q.week]) byChapter[q.week] = { week: q.week, chapterName: q.chapterName, correct: 0, total: 0 };
    byChapter[q.week].total++;
    if (isCorrect) byChapter[q.week].correct++;

    // By CLO
    q.clo.forEach(clo => {
      if (!byCLO[clo]) byCLO[clo] = { clo, correct: 0, total: 0 };
      byCLO[clo].total++;
      if (isCorrect) byCLO[clo].correct++;
    });
  });

  return {
    correct,
    total: examQuestions.length,
    accuracy: Math.round((correct / examQuestions.length) * 100),
    byChapter: Object.values(byChapter),
    byCLO: Object.values(byCLO),
    wrongList,
  };
}
