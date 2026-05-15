const OPTION_KEYS = ['A', 'B', 'C', 'D']

function warnInvalidQuestion(question, reason) {
  if (import.meta.env?.DEV) {
    console.warn(`[shuffleOptions] ${reason}`, question)
  }
}

function hasValidOptions(question) {
  if (!question || !question.options || !OPTION_KEYS.includes(question.answer)) return false
  return OPTION_KEYS.every(key => Object.prototype.hasOwnProperty.call(question.options, key))
}

export function shuffleArray(items) {
  const shuffled = [...items]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function validateShuffledQuestion(originalQuestion, shuffledQuestion) {
  if (!hasValidOptions(originalQuestion) || !hasValidOptions(shuffledQuestion)) return false

  const originalCorrectText = originalQuestion.options[originalQuestion.answer]
  const shuffledCorrectText = shuffledQuestion.options[shuffledQuestion.answer]
  const originalTexts = OPTION_KEYS.map(key => originalQuestion.options[key]).sort()
  const shuffledTexts = OPTION_KEYS.map(key => shuffledQuestion.options[key]).sort()

  return (
    originalQuestion.id === shuffledQuestion.id &&
    OPTION_KEYS.includes(shuffledQuestion.answer) &&
    shuffledCorrectText === originalCorrectText &&
    JSON.stringify(originalTexts) === JSON.stringify(shuffledTexts) &&
    OPTION_KEYS.every(key => Object.prototype.hasOwnProperty.call(shuffledQuestion.optionShuffleMap || {}, key))
  )
}

export function shuffleQuestionOptions(question) {
  if (!hasValidOptions(question)) {
    warnInvalidQuestion(question, 'Invalid question options; returning unchanged question.')
    return question
  }

  const originalAnswer = question.answer
  const originalOptions = { ...question.options }
  const shuffledOriginalKeys = shuffleArray(OPTION_KEYS)
  const options = {}
  const optionShuffleMap = {}
  let answer = originalAnswer

  OPTION_KEYS.forEach((newKey, index) => {
    const originalKey = shuffledOriginalKeys[index]
    options[newKey] = originalOptions[originalKey]
    optionShuffleMap[newKey] = originalKey
    if (originalKey === originalAnswer) answer = newKey
  })

  const shuffledQuestion = {
    ...question,
    originalAnswer,
    originalOptions,
    options,
    answer,
    optionShuffleMap,
  }

  if (!validateShuffledQuestion(question, shuffledQuestion)) {
    warnInvalidQuestion(question, 'Shuffled question failed validation; returning unchanged question.')
    return question
  }

  return shuffledQuestion
}

export function prepareQuestionsWithShuffledOptions(questions) {
  return questions.map(question => shuffleQuestionOptions(question))
}
