import { useState, useMemo } from 'react'
import QuestionCard from './QuestionCard.jsx'
import { recordAnswer, updateAccuracy } from '../utils/storage.js'
import { getAccuracyByChapter } from '../utils/storage.js'
import questions from '../data/questions.json'

const CHAPTERS = [
  { week: 'Tuần 1', name: 'Giới thiệu Kinh tế học vĩ mô', clo: 'CLO1', icon: '🌐' },
  { week: 'Tuần 2', name: 'Chỉ số kinh tế vĩ mô', clo: 'CLO2', icon: '📊' },
  { week: 'Tuần 3', name: 'Hệ thống tiền tệ', clo: 'CLO4', icon: '🏦' },
  { week: 'Tuần 4', name: 'Chính sách tài khóa', clo: 'CLO6', icon: '🏛️' },
  { week: 'Tuần 5', name: 'Nền kinh tế mở', clo: 'CLO8', icon: '🌏' },
  { week: 'Tuần 6', name: 'Mô hình AS-AD', clo: 'CLO5', icon: '📈' },
  { week: 'Tuần 7', name: 'Thất nghiệp và Lạm phát', clo: 'CLO7', icon: '📉' },
  { week: 'Tuần 8', name: 'Tăng trưởng kinh tế', clo: 'CLO3', icon: '🚀' },
]

const COLORS = ['#2563eb','#7c3aed','#db2777','#059669','#d97706','#dc2626','#0891b2','#65a30d']

const qMap = Object.fromEntries(questions.map(q => [q.id, q]))

export default function ChapterPractice() {
  const [selectedWeek, setSelectedWeek] = useState(null)
  const [answers, setAnswers] = useState({})
  const [current, setCurrent] = useState(0)
  const [filterCLO, setFilterCLO] = useState('all')
  const [filterWrong, setFilterWrong] = useState(false)
  const [filterSource, setFilterSource] = useState('all')

  const accByChapter = getAccuracyByChapter()

  const chapterQuestions = useMemo(() => {
    if (!selectedWeek) return []
    let pool = questions.filter(q => q.week === selectedWeek)
    if (filterCLO !== 'all') pool = pool.filter(q => q.clo.includes(filterCLO))
    if (filterSource !== 'all') pool = pool.filter(q => q.source === filterSource)
    return pool
  }, [selectedWeek, filterCLO, filterSource])

  const allCLOs = useMemo(() => {
    if (!selectedWeek) return []
    const set = new Set()
    questions.filter(q => q.week === selectedWeek).forEach(q => q.clo.forEach(c => set.add(c)))
    return [...set].sort()
  }, [selectedWeek])

  const allSources = useMemo(() => {
    if (!selectedWeek) return []
    const set = new Set()
    questions.filter(q => q.week === selectedWeek).forEach(q => set.add(q.source))
    return [...set]
  }, [selectedWeek])

  function openChapter(week) {
    setSelectedWeek(week)
    setAnswers({})
    setCurrent(0)
    setFilterCLO('all')
    setFilterWrong(false)
    setFilterSource('all')
  }

  function handleSelect(key) {
    const q = chapterQuestions[current]
    if (answers[q.id]) return
    setAnswers(prev => ({ ...prev, [q.id]: key }))
    const isCorrect = key === q.answer
    recordAnswer(q.id, isCorrect)
    updateAccuracy({ [q.id]: isCorrect }, qMap)
  }

  if (!selectedWeek) {
    return (
      <div>
        <div className="page-header">
          <h1>Ôn tập theo chương</h1>
          <p>Chọn tuần để bắt đầu ôn tập với phản hồi tức thì</p>
        </div>
        <div className="chapter-grid">
          {CHAPTERS.map((ch, i) => {
            const acc = accByChapter[ch.week]
            const pct = acc ? Math.round((acc.correct / acc.total) * 100) : null
            const count = questions.filter(q => q.week === ch.week).length
            return (
              <div key={ch.week} className="chapter-card" style={{ borderLeftColor: COLORS[i] }} onClick={() => openChapter(ch.week)}>
                <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>{ch.icon}</div>
                <div className="chapter-week" style={{ color: COLORS[i] }}>{ch.week}</div>
                <div className="chapter-name">{ch.name}</div>
                <div className="chapter-meta">
                  <span className="badge badge-blue" style={{ marginRight: 6 }}>{ch.clo}</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{count} câu</span>
                </div>
                {pct !== null && (
                  <>
                    <div className="chapter-bar">
                      <div className="chapter-bar-fill" style={{ width: `${pct}%`, background: COLORS[i] }} />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                      Độ chính xác: <strong>{pct}%</strong> ({acc.correct}/{acc.total} câu)
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const q = chapterQuestions[current]
  const chInfo = CHAPTERS.find(c => c.week === selectedWeek)
  const correctCount = Object.entries(answers).filter(([id, ans]) => ans === qMap[id]?.answer).length

  return (
    <div>
      <div className="exam-nav-bar">
        <div>
          <h2>{chInfo?.icon} {selectedWeek} – {chInfo?.name}</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
            {correctCount} đúng / {Object.keys(answers).length} đã trả lời / {chapterQuestions.length} câu
          </span>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setSelectedWeek(null)}>← Chọn chương khác</button>
      </div>

      <div className="filter-bar">
        <label>CLO:</label>
        <select value={filterCLO} onChange={e => { setFilterCLO(e.target.value); setCurrent(0) }}>
          <option value="all">Tất cả</option>
          {allCLOs.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <label>Nguồn:</label>
        <select value={filterSource} onChange={e => { setFilterSource(e.target.value); setCurrent(0) }}>
          <option value="all">Tất cả</option>
          {allSources.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {chapterQuestions.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">🔍</div><h3>Không có câu hỏi phù hợp</h3></div>
      ) : (
        <div className="question-container">
          <div>
            <QuestionCard
              question={q}
              questionNum={current + 1}
              userAnswer={answers[q?.id]}
              onSelect={handleSelect}
              mode="practice"
              showResult={!!answers[q?.id]}
            />
            <div className="flex gap-2 mt-4">
              <button className="btn btn-secondary" onClick={() => setCurrent(c => c - 1)} disabled={current === 0}>← Trước</button>
              <button className="btn btn-primary" onClick={() => setCurrent(c => c + 1)} disabled={current >= chapterQuestions.length - 1}>Tiếp theo →</button>
              <span style={{ marginLeft: 'auto', lineHeight: '38px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                {current + 1} / {chapterQuestions.length}
              </span>
            </div>
          </div>

          <div className="navigator-panel">
            <h3>Bảng câu hỏi</h3>
            <div className="nav-grid">
              {chapterQuestions.map((cq, i) => {
                let cls = 'nav-dot'
                if (i === current) cls += ' current'
                else if (answers[cq.id]) {
                  cls += answers[cq.id] === cq.answer ? ' correct' : ' wrong'
                }
                return (
                  <button key={cq.id} className={cls} onClick={() => setCurrent(i)}>{i + 1}</button>
                )
              })}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span>🟢 Đúng &nbsp; 🔴 Sai &nbsp; 🔵 Đang xem</span>
              <div className="divider" style={{ margin: '8px 0' }} />
              <span>✅ Đúng: {correctCount}</span>
              <span>❌ Sai: {Object.keys(answers).length - correctCount}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
