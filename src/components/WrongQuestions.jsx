import { useState } from 'react'
import QuestionCard from './QuestionCard.jsx'
import { getWrongQuestions, getMastered, recordAnswer, resetMastered, updateAccuracy } from '../utils/storage.js'
import questions from '../data/questions.json'

const qMap = Object.fromEntries(questions.map(q => [q.id, q]))

export default function WrongQuestions() {
  const [sessionAnswers, setSessionAnswers] = useState({})
  const [consecutiveCorrect, setConsecutiveCorrect] = useState({})
  const [current, setCurrent] = useState(0)
  const [resetModal, setResetModal] = useState(false)
  const [refresh, setRefresh] = useState(0)

  const wrongIds = Object.keys(getWrongQuestions())
  const mastered = getMastered()
  const wrongQuestions = wrongIds.map(id => qMap[id]).filter(Boolean)
  const nonMastered = wrongQuestions.filter(q => !mastered[q.id])

  function handleSelect(key) {
    const q = nonMastered[current]
    if (!q || sessionAnswers[q.id]) return
    const isCorrect = key === q.answer
    const newConsec = { ...consecutiveCorrect, [q.id]: isCorrect ? (consecutiveCorrect[q.id] || 0) + 1 : 0 }
    setConsecutiveCorrect(newConsec)
    setSessionAnswers(prev => ({ ...prev, [q.id]: key }))
    recordAnswer(q.id, isCorrect)
    updateAccuracy({ [q.id]: isCorrect }, qMap)
    setRefresh(r => r + 1)
  }

  function handleNext() {
    setSessionAnswers({})
    setCurrent(c => Math.min(c + 1, nonMastered.length - 1))
  }

  function handlePrev() {
    setSessionAnswers({})
    setCurrent(c => Math.max(c - 1, 0))
  }

  function handleResetMastered() {
    resetMastered()
    setResetModal(false)
    setCurrent(0)
    setSessionAnswers({})
    setConsecutiveCorrect({})
    setRefresh(r => r + 1)
  }

  const masteredCount = Object.keys(mastered).length
  const q = nonMastered[current]
  const isMasteredNow = q && consecutiveCorrect[q.id] >= 2

  if (wrongQuestions.length === 0) {
    return (
      <div>
        <div className="page-header"><h1>Ôn câu sai</h1></div>
        <div className="empty-state">
          <div className="empty-icon">🎉</div>
          <h3>Không có câu nào cần ôn!</h3>
          <p>Bạn chưa làm bài hoặc đã trả lời đúng tất cả câu hỏi.</p>
        </div>
      </div>
    )
  }

  if (nonMastered.length === 0) {
    return (
      <div>
        <div className="page-header"><h1>Ôn câu sai</h1></div>
        <div className="alert alert-success">🏆 Bạn đã thuần thục tất cả {masteredCount} câu sai! Xuất sắc!</div>
        <button className="btn btn-secondary" onClick={() => setResetModal(true)}>🔄 Đặt lại trạng thái thuần thục</button>
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
      <div className="exam-nav-bar">
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-primary)' }}>Ôn câu sai</h1>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
            {nonMastered.length} câu cần ôn · {masteredCount} đã thuần thục
          </span>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setResetModal(true)}>🔄 Đặt lại thuần thục</button>
      </div>

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
          {isMasteredNow && (
            <div className="mastered-badge">
              🌟 Thuần thục! Câu này sẽ được loại khỏi danh sách ôn tập.
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <button className="btn btn-secondary" onClick={handlePrev} disabled={current === 0}>← Trước</button>
            <button className="btn btn-primary" onClick={handleNext} disabled={current >= nonMastered.length - 1}>Tiếp theo →</button>
            <span style={{ marginLeft: 'auto', lineHeight: '38px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
              {current + 1} / {nonMastered.length}
            </span>
          </div>
        </div>

        <div className="navigator-panel">
          <h3>Tiến độ</h3>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 6 }}>
              Tổng câu sai: <strong>{wrongQuestions.length}</strong>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-success)', marginBottom: 6 }}>
              ✅ Đã thuần thục: <strong>{masteredCount}</strong>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-warning)', marginBottom: 6 }}>
              📖 Cần ôn thêm: <strong>{nonMastered.length}</strong>
            </div>
            <div className="chapter-bar" style={{ marginTop: 8 }}>
              <div className="chapter-bar-fill" style={{ width: `${Math.round((masteredCount / wrongQuestions.length) * 100)}%`, background: 'var(--color-success)' }} />
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
              {Math.round((masteredCount / wrongQuestions.length) * 100)}% thuần thục
            </div>
          </div>
          <div className="divider" />
          <h3>Câu hỏi</h3>
          <div className="nav-grid">
            {nonMastered.map((nq, i) => {
              let cls = 'nav-dot'
              if (i === current) cls += ' current'
              return <button key={nq.id} className={cls} onClick={() => { setCurrent(i); setSessionAnswers({}) }}>{i + 1}</button>
            })}
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 8 }}>
            💡 Trả lời đúng 2 lần liên tiếp để đánh dấu thuần thục
          </p>
        </div>
      </div>

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
