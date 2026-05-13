import { useEffect, useMemo, useState } from 'react'
import QuestionCard from './QuestionCard.jsx'
import { getHistory, getMastered, getWrongQuestions, recordAnswer, resetMastered, updateAccuracy } from '../utils/storage.js'
import { trackEvent } from '../utils/analytics.js'
import questions from '../data/questions.json'

const qMap = Object.fromEntries(questions.map(q => [q.id, q]))

const CHAPTERS = Object.values(questions.reduce((acc, q) => {
  if (!acc[q.week]) {
    acc[q.week] = {
      week: q.week,
      name: q.chapterName || q.week,
      chapter: q.chapter,
    }
  }
  return acc
}, {})).sort((a, b) => (a.chapter || 0) - (b.chapter || 0))

function getPreviousWrongAnswers(history) {
  const previous = {}
  history.forEach(session => {
    if (!Array.isArray(session.answers)) return
    session.answers.forEach(answer => {
      const questionId = answer.questionId
      if (!questionId || previous[questionId]) return
      const selected = answer.selectedAnswer
      const correct = answer.correctAnswer || qMap[questionId]?.answer
      if (selected && correct && selected !== correct) {
        previous[questionId] = selected
      }
    })
  })
  return previous
}

export default function WrongQuestions() {
  const [sessionAnswers, setSessionAnswers] = useState({})
  const [consecutiveCorrect, setConsecutiveCorrect] = useState({})
  const [current, setCurrent] = useState(0)
  const [resetModal, setResetModal] = useState(false)
  const [filterWeek, setFilterWeek] = useState('all')
  const [refresh, setRefresh] = useState(0)

  const wrongMap = getWrongQuestions()
  const wrongIds = Object.keys(wrongMap)
  const mastered = getMastered()
  const history = getHistory()
  const previousWrongAnswers = useMemo(() => getPreviousWrongAnswers(history), [history])
  const wrongQuestions = wrongIds.map(id => qMap[id]).filter(Boolean)
  const nonMastered = wrongQuestions.filter(q => !mastered[q.id])
  const filteredQuestions = filterWeek === 'all'
    ? nonMastered
    : nonMastered.filter(q => q.week === filterWeek)
  const chapterOptions = CHAPTERS.filter(ch => nonMastered.some(q => q.week === ch.week))
  const masteredCount = wrongQuestions.filter(q => mastered[q.id]).length
  const reviewedThisSession = Object.keys(sessionAnswers).length
  const q = filteredQuestions[current]
  const isMasteredNow = q && consecutiveCorrect[q.id] >= 2

  useEffect(() => {
    trackEvent('review_wrong_questions', {
      mode: 'wrong_questions',
      total_questions: nonMastered.length,
    })
  }, [])

  useEffect(() => {
    setCurrent(0)
  }, [filterWeek])

  useEffect(() => {
    if (current > 0 && current >= filteredQuestions.length) {
      setCurrent(Math.max(filteredQuestions.length - 1, 0))
    }
  }, [current, filteredQuestions.length])

  function handleSelect(key) {
    if (!q || sessionAnswers[q.id]) return
    const isCorrect = key === q.answer
    const newConsec = { ...consecutiveCorrect, [q.id]: isCorrect ? (consecutiveCorrect[q.id] || 0) + 1 : 0 }
    setConsecutiveCorrect(newConsec)
    setSessionAnswers(prev => ({ ...prev, [q.id]: key }))
    recordAnswer(q.id, isCorrect)
    updateAccuracy({ [q.id]: isCorrect }, qMap)
    trackEvent('answer_question', {
      mode: 'wrong_questions',
      chapter: q.week,
      clo: q.clo.join(','),
      correct_count: isCorrect ? 1 : 0,
      wrong_count: isCorrect ? 0 : 1,
    })
    setRefresh(r => r + 1)
  }

  function handleNext() {
    setCurrent(c => Math.min(c + 1, filteredQuestions.length - 1))
  }

  function handlePrev() {
    setCurrent(c => Math.max(c - 1, 0))
  }

  function jumpToQuestion(questionId) {
    const index = filteredQuestions.findIndex(item => item.id === questionId)
    if (index >= 0) setCurrent(index)
  }

  function handleResetMastered() {
    resetMastered()
    setResetModal(false)
    setCurrent(0)
    setSessionAnswers({})
    setConsecutiveCorrect({})
    setRefresh(r => r + 1)
  }

  if (wrongQuestions.length === 0) {
    return (
      <div>
        <div className="page-header">
          <h1>Ôn câu sai</h1>
          <p>Các câu trả lời sai sẽ tự xuất hiện ở đây sau khi bạn làm bài.</p>
        </div>
        <div className="empty-state">
          <h3>Không có câu nào cần ôn.</h3>
          <p>Bạn chưa làm bài hoặc đã trả lời đúng tất cả câu hỏi.</p>
        </div>
      </div>
    )
  }

  if (nonMastered.length === 0) {
    return (
      <div>
        <div className="page-header">
          <h1>Ôn câu sai</h1>
          <p>Tất cả câu sai hiện tại đã được đánh dấu thuần thục.</p>
        </div>
        <div className="card wrong-summary-card">
          <div>
            <span className="eyebrow">Tổng kết</span>
            <h2>{masteredCount} câu đã thuần thục</h2>
            <p>Bạn có thể đặt lại trạng thái thuần thục nếu muốn ôn lại toàn bộ danh sách.</p>
          </div>
          <button className="btn btn-secondary" onClick={() => setResetModal(true)}>Đặt lại thuần thục</button>
        </div>
        {resetModal && (
          <div className="modal-backdrop" onClick={() => setResetModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h2>Đặt lại?</h2>
              <p>Trạng thái thuần thục sẽ bị xóa. Bạn sẽ cần ôn lại tất cả câu sai.</p>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setResetModal(false)}>Hủy</button>
                <button className="btn btn-danger" onClick={handleResetMastered}>Đặt lại</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="page-header history-header">
        <div>
          <h1>Ôn câu sai</h1>
          <p>Ôn lại những câu từng trả lời sai cho đến khi đúng 2 lần liên tiếp.</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setResetModal(true)}>Đặt lại thuần thục</button>
      </div>

      <div className="wrong-summary-grid">
        <div className="stat-card stat-card-compact">
          <div className="stat-value">{wrongQuestions.length}</div>
          <div className="stat-label">Tổng câu sai</div>
        </div>
        <div className="stat-card stat-card-compact">
          <div className="stat-value">{reviewedThisSession}</div>
          <div className="stat-label">Đã ôn phiên này</div>
        </div>
        <div className="stat-card stat-card-compact">
          <div className="stat-value">{nonMastered.length}</div>
          <div className="stat-label">Còn cần ôn</div>
        </div>
        <div className="stat-card stat-card-compact">
          <div className="stat-value">{masteredCount}</div>
          <div className="stat-label">Đã thuần thục</div>
        </div>
      </div>

      <div className="filter-bar">
        <label htmlFor="wrong-week-filter">Lọc theo chương:</label>
        <select id="wrong-week-filter" value={filterWeek} onChange={e => setFilterWeek(e.target.value)}>
          <option value="all">Tất cả</option>
          {chapterOptions.map(ch => (
            <option key={ch.week} value={ch.week}>{ch.week} - {ch.name}</option>
          ))}
        </select>
      </div>

      {filteredQuestions.length === 0 ? (
        <div className="empty-state">
          <h3>Không còn câu cần ôn trong bộ lọc này.</h3>
        </div>
      ) : (
        <div className="question-container">
          <div>
            <QuestionCard
              question={q}
              questionNum={current + 1}
              userAnswer={sessionAnswers[q?.id]}
              onSelect={handleSelect}
              mode="practice"
              showResult={!!sessionAnswers[q?.id]}
            />
            {q && previousWrongAnswers[q.id] && (
              <div className="previous-answer-note">
                Lần trước bạn chọn: <strong>{previousWrongAnswers[q.id]}</strong> - {q.options[previousWrongAnswers[q.id]]}
              </div>
            )}
            {isMasteredNow && (
              <div className="mastered-badge">
                Thuần thục. Câu này sẽ được loại khỏi danh sách ôn tập.
              </div>
            )}
            <div className="question-controls flex gap-2 mt-4">
              <button className="btn btn-secondary" onClick={handlePrev} disabled={current === 0}>Trước</button>
              <button className="btn btn-primary" onClick={handleNext} disabled={current >= filteredQuestions.length - 1}>Tiếp theo</button>
              <span className="question-count">
                {current + 1} / {filteredQuestions.length}
              </span>
            </div>

            <div className="wrong-review-list">
              {filteredQuestions.map((item, index) => {
                const previous = previousWrongAnswers[item.id]
                return (
                  <article key={item.id} className={`wrong-review-card ${item.id === q?.id ? 'active' : ''}`}>
                    <div>
                      <div className="wi-meta">
                        <span className="tag tag-week">{item.week}</span>
                        {item.clo.map(clo => <span key={clo} className="tag tag-clo">{clo}</span>)}
                      </div>
                      <h3>{item.question}</h3>
                      <p>{previous ? `Bạn từng chọn ${previous} - ${item.options[previous]}` : 'Chưa có đáp án sai gần nhất trong lịch sử.'}</p>
                      <p>Đáp án đúng: <strong>{item.answer}</strong> - {item.options[item.answer]}</p>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={() => jumpToQuestion(item.id)}>
                      {index === current ? 'Đang ôn' : 'Ôn lại'}
                    </button>
                  </article>
                )
              })}
            </div>
          </div>

          <div className="navigator-panel">
            <h3>Tiến độ</h3>
            <div className="wrong-progress-panel">
              <span>Tổng câu sai: <strong>{wrongQuestions.length}</strong></span>
              <span>Đã thuần thục: <strong>{masteredCount}</strong></span>
              <span>Cần ôn thêm: <strong>{nonMastered.length}</strong></span>
              <div className="chapter-bar">
                <div className="chapter-bar-fill" style={{ width: `${Math.round((masteredCount / wrongQuestions.length) * 100)}%`, background: 'var(--color-success)' }} />
              </div>
            </div>
            <div className="divider" />
            <h3>Câu hỏi</h3>
            <div className="nav-grid">
              {filteredQuestions.map((nq, i) => {
                let cls = 'nav-dot'
                if (i === current) cls += ' current'
                if (sessionAnswers[nq.id]) cls += sessionAnswers[nq.id] === nq.answer ? ' correct' : ' wrong'
                return <button key={nq.id} className={cls} onClick={() => setCurrent(i)} aria-label={`Câu ${i + 1}`}>{i + 1}</button>
              })}
            </div>
            <p className="navigator-hint">
              Trả lời đúng 2 lần liên tiếp để đánh dấu thuần thục.
            </p>
          </div>
        </div>
      )}

      {resetModal && (
        <div className="modal-backdrop" onClick={() => setResetModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Đặt lại thuần thục?</h2>
            <p>Trạng thái thuần thục của tất cả câu sẽ bị xóa.</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setResetModal(false)}>Hủy</button>
              <button className="btn btn-danger" onClick={handleResetMastered}>Đặt lại</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
