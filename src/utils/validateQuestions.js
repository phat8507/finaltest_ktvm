/**
 * validateQuestions.js
 * Validates questions.json schema at startup and logs warnings to console.
 */

export function validateQuestionsData(questions) {
  if (!Array.isArray(questions)) {
    console.error('[VALIDATION] questions.json is not an array!');
    return;
  }

  const ids = new Set();
  let errors = 0;

  questions.forEach((q, idx) => {
    const tag = `[Q${idx + 1}/${q.id}]`;
    if (!q.id) { console.warn(`${tag} Missing id`); errors++; }
    if (ids.has(q.id)) { console.warn(`${tag} Duplicate id: ${q.id}`); errors++; }
    else if (q.id) ids.add(q.id);
    if (!q.question) { console.warn(`${tag} Empty question text`); errors++; }
    if (!q.options?.A || !q.options?.B || !q.options?.C || !q.options?.D) {
      console.warn(`${tag} Missing answer option(s)`); errors++;
    }
    if (!['A', 'B', 'C', 'D'].includes(q.answer)) {
      console.warn(`${tag} Invalid answer: "${q.answer}"`); errors++;
    }
    if (!q.chapter) { console.warn(`${tag} Missing chapter`); errors++; }
    if (!q.week) { console.warn(`${tag} Missing week`); errors++; }
    if (!Array.isArray(q.clo) || q.clo.length === 0) {
      console.warn(`${tag} Missing CLO`); errors++;
    }
  });

  if (errors === 0) {
    console.log(`[VALIDATION] ✅ All ${questions.length} questions passed validation.`);
  } else {
    console.warn(`[VALIDATION] ⚠️ ${errors} error(s) found in ${questions.length} questions.`);
  }
}
