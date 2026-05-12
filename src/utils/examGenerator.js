/**
 * examGenerator.js
 * Generates a 40-question practice exam following the official CLO blueprint.
 *
 * Blueprint:
 *   Tuần 1 / CLO1        → 3 questions
 *   Tuần 2 / CLO2+CLO9   → 6 questions
 *   Tuần 8 / CLO3+CLO9   → 4 questions
 *   Tuần 3 / CLO4+CLO9   → 5 questions
 *   Tuần 6 / CLO5        → 5 questions
 *   Tuần 4 / CLO6        → 5 questions
 *   Tuần 7 / CLO7+CLO9   → 6 questions
 *   Tuần 5 / CLO8+CLO9   → 6 questions
 *   Total                → 40 questions
 */

/** Fisher-Yates shuffle */
export function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const BLUEPRINT = [
  { week: 'Tuần 1', count: 3,  preferCLO9: false },
  { week: 'Tuần 2', count: 6,  preferCLO9: true  },
  { week: 'Tuần 8', count: 4,  preferCLO9: true  },
  { week: 'Tuần 3', count: 5,  preferCLO9: true  },
  { week: 'Tuần 6', count: 5,  preferCLO9: false },
  { week: 'Tuần 4', count: 5,  preferCLO9: false },
  { week: 'Tuần 7', count: 6,  preferCLO9: true  },
  { week: 'Tuần 5', count: 6,  preferCLO9: true  },
];

/**
 * Pick `n` random questions from pool.
 * Prioritises CLO9 questions when preferCLO9 is true.
 */
function pickFromPool(pool, n, preferCLO9) {
  if (preferCLO9) {
    const clo9 = pool.filter(q => q.clo.includes('CLO9'));
    const nonClo9 = pool.filter(q => !q.clo.includes('CLO9'));
    const shuffledClo9 = shuffleArray(clo9);
    const shuffledRest = shuffleArray(nonClo9);
    const combined = [...shuffledClo9, ...shuffledRest];
    return combined.slice(0, n);
  }
  return shuffleArray(pool).slice(0, n);
}

/**
 * generateExam40(questions)
 * Returns { selected: Question[], warnings: string[] }
 */
export function generateExam40(allQuestions) {
  const warnings = [];
  const selected = [];
  const usedIds = new Set();

  // Group questions by week
  const byWeek = {};
  allQuestions.forEach(q => {
    if (!byWeek[q.week]) byWeek[q.week] = [];
    byWeek[q.week].push(q);
  });

  for (const slot of BLUEPRINT) {
    const available = (byWeek[slot.week] || []).filter(q => !usedIds.has(q.id));
    const needed = slot.count;

    let picked = pickFromPool(available, needed, slot.preferCLO9);

    // Fallback: if not enough, fill from other weeks
    if (picked.length < needed) {
      warnings.push(
        `⚠️ ${slot.week} chỉ có ${picked.length}/${needed} câu – bổ sung từ tuần gần nhất.`
      );
      const fallbackPool = allQuestions.filter(q => !usedIds.has(q.id) && q.week !== slot.week);
      const extra = shuffleArray(fallbackPool).slice(0, needed - picked.length);
      picked = [...picked, ...extra];
    }

    picked.forEach(q => usedIds.add(q.id));
    selected.push(...picked);
  }

  // Final shuffle so order is random
  return { selected: shuffleArray(selected), warnings };
}
