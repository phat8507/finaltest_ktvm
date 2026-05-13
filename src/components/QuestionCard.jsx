export default function QuestionCard({ question: q, questionNum, userAnswer, onSelect, showResult = false, mode = 'exam' }) {
  if (!q) return null

  const isPractice = mode === 'practice'
  const revealed = showResult || (isPractice && userAnswer)

  function getOptionClass(key) {
    let cls = 'option-btn'
    if (revealed) {
      if (key === q.answer) cls += ' correct'
      else if (key === userAnswer && key !== q.answer) cls += ' wrong'
    } else if (key === userAnswer) {
      cls += ' selected'
    }
    return cls
  }

  const diffTag = q.difficulty === 'hard' ? 'tag-diff-hard' : q.difficulty === 'easy' ? 'tag-diff-easy' : 'tag-diff-medium'
  const diffLabel = q.difficulty === 'hard' ? 'Khó' : q.difficulty === 'easy' ? 'Dễ' : 'Trung bình'

  return (
    <div className="question-card">
      <div className="question-tags">
        <span className="tag tag-week">{q.week}</span>
        {q.clo.map(c => <span key={c} className="tag tag-clo">{c}</span>)}
        <span className="tag tag-source">{q.source}</span>
        <span className={`tag ${diffTag}`}>{diffLabel}</span>
      </div>
      <div className="question-number">Câu {questionNum}</div>
      <div className="question-text">{q.question}</div>
      <div className="options-list">
        {['A', 'B', 'C', 'D'].map(key => (
          <button
            key={key}
            className={getOptionClass(key)}
            onClick={() => !revealed && onSelect && onSelect(key)}
            disabled={revealed}
          >
            <span className="option-key">{key}.</span>
            <span>{q.options[key]}</span>
          </button>
        ))}
      </div>
      {revealed && isPractice && q.explanation && (
        <div className="alert alert-info mt-4">
          <span>{q.explanation}</span>
        </div>
      )}
    </div>
  )
}
