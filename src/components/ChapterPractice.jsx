import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import QuestionCard from './QuestionCard.jsx'
import { getAccuracyByChapter, recordAnswer, saveSession, updateAccuracy } from '../utils/storage.js'
import { trackEvent } from '../utils/analytics.js'
import questions from '../data/questions.json'

const COLORS = ['#2563eb','#7c3aed','#db2777','#059669','#d97706','#dc2626','#0891b2','#65a30d']
const qMap = Object.fromEntries(questions.map(q => [q.id, q]))
const CHAPTERS = Object.values(questions.reduce((acc, q) => {
  if (!acc[q.week]) {
    acc[q.week] = {
      week: q.week,
      name: q.chapterName || q.week,
      clo: q.clo?.[0] || '',
      chapter: q.chapter,
    }
  }
  return acc
}, {})).sort((a, b) => (a.chapter || 0) - (b.chapter || 0))

function shuffleArray(items) {
  const shuffled = [...items]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function getChapterNumber(week) {
  return CHAPTERS.find(ch => ch.week === week)?.chapter || null
}

function getChapterStatus(acc) {
  if (!acc?.total) return { label: 'Chưa bắt đầu', cls: 'badge-gray' }
  const pct = Math.round((acc.correct / acc.total) * 100)
  if (pct < 60) return { label: 'Cần ôn lại', cls: 'badge-red' }
  if (pct >= 75) return { label: 'Tốt', cls: 'badge-green' }
  return { label: 'Đang học', cls: 'badge-orange' }
}

export default function ChapterPractice() {
  const location = useLocation()
  const [selectedWeek, setSelectedWeek] = useState(null)
  const [answers, setAnswers] = useState({})
  const [current, setCurrent] = useState(0)
  const [filterCLO, setFilterCLO] = useState('all')
  const [filterSource, setFilterSource] = useState('all')
  const [questionOrder, setQuestionOrder] = useState([])
  const [sessionStartedAt, setSessionStartedAt] = useState(null)
  const [summary, setSummary] = useState(null)
  const savedSessionRef = useRef(false)
  const latestSessionRef = useRef(null)
  const consumedRequestedWeekRef = useRef(null)

  const accByChapter = getAccuracyByChapter()
  const requestedWeek = location.state?.week

  const chapterPool = useMemo(() => {
    if (!selectedWeek) return []
    return questions.filter(q => q.week === selectedWeek)
  }, [selectedWeek])

  const chapterQuestions = useMemo(() => {
    let pool = chapterPool
    if (filterCLO !== 'all') pool = pool.filter(q => q.clo.includes(filterCLO))
    if (filterSource !== 'all') pool = pool.filter(q => q.source === filterSource)

    if (!questionOrder.length) return pool
    const orderIndex = new Map(questionOrder.map((id, index) => [id, index]))
    return [...pool].sort((a, b) => (orderIndex.get(a.id) ?? 99999) - (orderIndex.get(b.id) ?? 99999))
  }, [chapterPool, filterCLO, filterSource, questionOrder])

  const allCLOs = useMemo(() => {
    const set = new Set()
    chapterPool.forEach(q => q.clo.forEach(c => set.add(c)))
    return [...set].sort()
  }, [chapterPool])

  const allSources = useMemo(() => {
    const set = new Set()
    chapterPool.forEach(q => set.add(q.source))
    return [...set]
  }, [chapterPool])

  const answeredEntries = Object.entries(answers)
  const correctCount = answeredEntries.filter(([id, ans]) => ans === qMap[id]?.answer).length
  const wrongCount = answeredEntries.length - correctCount

  const buildSession = useCallback((completedAt = new Date().toISOString()) => {
    if (!selectedWeek || answeredEntries.length === 0) return null
    const chapterInfo = CHAPTERS.find(ch => ch.week === selectedWeek)
    const accuracy = answeredEntries.length > 0 ? Math.round((correctCount / answeredEntries.length) * 100) : 0
    const totalQuestions = Math.max(chapterQuestions.length, answeredEntries.length)

    return {
      mode: 'chapter-practice',
      title: 'Ôn tập theo chương',
      chapter: getChapterNumber(selectedWeek),
      week: selectedWeek,
      chapterName: chapterInfo?.name || selectedWeek,
      startedAt: sessionStartedAt || completedAt,
      completedAt,
      totalQuestions,
      answeredCount: answeredEntries.length,
      correctCount,
      wrongCount,
      accuracy,
      answers: answeredEntries.map(([questionId, selectedAnswer]) => ({
        questionId,
        selectedAnswer,
        correctAnswer: qMap[questionId]?.answer || null,
        isCorrect: selectedAnswer === qMap[questionId]?.answer,
      })),
      chapterBreakdown: {
        [selectedWeek]: {
          correct: correctCount,
          total: answeredEntries.length,
        },
      },
      cloBreakdown: answeredEntries.reduce((acc, [questionId, selectedAnswer]) => {
        const question = qMap[questionId]
        if (!question) return acc
        question.clo.forEach(clo => {
          if (!acc[clo]) acc[clo] = { correct: 0, total: 0 }
          acc[clo].total += 1
          if (selectedAnswer === question.answer) acc[clo].correct += 1
        })
        return acc
      }, {}),
    }
  }, [answeredEntries, chapterQuestions.length, correctCount, selectedWeek, sessionStartedAt, wrongCount])

  const saveCurrentSession = useCallback(() => {
    if (savedSessionRef.current) return null
    const session = buildSession()
    if (!session) return null
    saveSession(session)
    savedSessionRef.current = true
    setSummary(session)
    trackEvent('complete_chapter_practice', {
      mode: 'chapter_practice',
      chapter: session.chapter,
      week: session.week,
      chapterName: session.chapterName,
      answeredCount: session.answeredCount,
      correctCount: session.correctCount,
      wrongCount: session.wrongCount,
      accuracy: session.accuracy,
    })
    return session
  }, [buildSession])

  useEffect(() => {
    if (requestedWeek && !selectedWeek && consumedRequestedWeekRef.current !== requestedWeek) {
      consumedRequestedWeekRef.current = requestedWeek
      openChapter(requestedWeek)
    }
  }, [requestedWeek, selectedWeek])

  useEffect(() => {
    if (selectedWeek && chapterQuestions.length > 0 && Object.keys(answers).length === chapterQuestions.length) {
      saveCurrentSession()
    }
  }, [answers, chapterQuestions.length, saveCurrentSession, selectedWeek])

  useEffect(() => {
    latestSessionRef.current = buildSession
  }, [buildSession])

  useEffect(() => () => {
    const session = latestSessionRef.current?.()
    if (session && !savedSessionRef.current) {
      saveSession(session)
    }
  }, [])

  function resetSessionState(week, shuffled = false) {
    const pool = questions.filter(q => q.week === week)
    const order = shuffled ? shuffleArray(pool.map(q => q.id)) : pool.map(q => q.id)
    setAnswers({})
    setCurrent(0)
    setFilterCLO('all')
    setFilterSource('all')
    setQuestionOrder(order)
    setSessionStartedAt(new Date().toISOString())
    setSummary(null)
    savedSessionRef.current = false
  }

  function openChapter(week, shuffled = false) {
    resetSessionState(week, shuffled)
    setSelectedWeek(week)
    const chapter = CHAPTERS.find(ch => ch.week === week)
    trackEvent('start_chapter_practice', {
      mode: 'chapter_practice',
      chapter: getChapterNumber(week),
      week,
      chapterName: chapter?.name,
      total_questions: questions.filter(q => q.week === week).length,
    })
  }

  function handleSelect(key) {
    const q = chapterQuestions[current]
    if (!q || answers[q.id]) return

    const nextAnswers = { ...answers, [q.id]: key }
    const isCorrect = key === q.answer
    setAnswers(nextAnswers)
    recordAnswer(q.id, isCorrect)
    updateAccuracy({ [q.id]: isCorrect }, qMap)
    trackEvent('answer_question', {
      mode: 'chapter_practice',
      chapter: getChapterNumber(q.week),
      week: q.week,
      chapterName: CHAPTERS.find(ch => ch.week === q.week)?.name,
      clo: q.clo.join(','),
      correct_count: isCorrect ? 1 : 0,
      wrong_count: isCorrect ? 0 : 1,
    })
  }

  function handleShuffle() {
    if (chapterQuestions.length === 0) return
    if (Object.keys(answers).length > 0) {
      const confirmed = window.confirm('Bạn đã trả lời một số câu. Xáo câu hỏi sẽ đặt lại thứ tự câu hỏi hiện tại. Bạn có muốn tiếp tục không?')
      if (!confirmed) return
      setAnswers({})
      setSummary(null)
      savedSessionRef.current = false
      setSessionStartedAt(new Date().toISOString())
    }

    const shuffledIds = shuffleArray(chapterQuestions.map(q => q.id))
    const remainingIds = questionOrder.filter(id => !shuffledIds.includes(id))
    setQuestionOrder([...shuffledIds, ...remainingIds])
    setCurrent(0)
    trackEvent('shuffle_chapter_questions', {
      mode: 'chapter_practice',
      chapter: getChapterNumber(selectedWeek),
      week: selectedWeek,
      chapterName: CHAPTERS.find(ch => ch.week === selectedWeek)?.name,
      answeredCount: Object.keys(answers).length,
    })
  }

  function handleRestartChapter() {
    if (Object.keys(answers).length > 0) {
      const confirmed = window.confirm('Làm lại chương này sẽ đặt lại câu trả lời trong phiên hiện tại. Bạn có muốn tiếp tục không?')
      if (!confirmed) return
    }
    resetSessionState(selectedWeek)
  }

  function handleEndSession() {
    saveCurrentSession()
  }

  function handleLeaveChapter() {
    saveCurrentSession()
    setSelectedWeek(null)
  }

  if (!selectedWeek) {
    return (
      <div>
        <div className="page-header">
          <h1>Ôn tập theo chương</h1>
          <p>Chọn tuần để bắt đầu ôn tập với phản hồi tức thì</p>
        </div>
        <div className="chapter-grid chapter-progress-grid">
          {CHAPTERS.map((ch, i) => {
            const acc = accByChapter[ch.week]
            const pct = acc?.total ? Math.round((acc.correct / acc.total) * 100) : 0
            const count = questions.filter(q => q.week === ch.week).length
            const status = getChapterStatus(acc)
            return (
              <article key={ch.week} className="chapter-card chapter-progress-card" style={{ borderLeftColor: COLORS[i] }}>
                <div className="chapter-card-header">
                  <div>
                    <div className="chapter-week" style={{ color: COLORS[i] }}>{ch.week}</div>
                    <div className="chapter-name">{ch.name}</div>
                  </div>
                  <span className={`badge ${status.cls}`}>{status.label}</span>
                </div>

                <div className="chapter-meta-grid">
                  <span><strong>{count}</strong> câu hỏi</span>
                  <span><strong>{acc?.total || 0}</strong> đã trả lời</span>
                  <span><strong>{acc?.total ? `${pct}%` : '-'}</strong> chính xác</span>
                </div>

                <div className="chapter-bar">
                  <div className="chapter-bar-fill" style={{ width: `${pct}%`, background: COLORS[i] }} />
                </div>

                <div className="chapter-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => openChapter(ch.week)}>Tiếp tục</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => openChapter(ch.week)}>Làm lại chương</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => openChapter(ch.week, true)}>Xáo câu hỏi</button>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    )
  }

  const q = chapterQuestions[current]
  const chInfo = CHAPTERS.find(c => c.week === selectedWeek)

  return (
    <div>
      <div className="exam-nav-bar chapter-practice-header">
        <div>
          <h2>{selectedWeek} - {chInfo?.name}</h2>
          <span className="progress-text">
            {correctCount} đúng / {Object.keys(answers).length} đã trả lời / {chapterQuestions.length} câu
          </span>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary btn-sm" onClick={handleEndSession} disabled={Object.keys(answers).length === 0 || savedSessionRef.current}>Kết thúc ôn tập</button>
          <button className="btn btn-secondary btn-sm" onClick={handleLeaveChapter}>Chọn chương khác</button>
        </div>
      </div>

      {summary && (
        <div className="card session-summary">
          <h3>Tóm tắt phiên ôn tập</h3>
          <div className="summary-grid">
            <span>Đã trả lời: <strong>{summary.answeredCount}</strong></span>
            <span>Đúng: <strong>{summary.correctCount}</strong></span>
            <span>Sai: <strong>{summary.wrongCount}</strong></span>
            <span>Độ chính xác: <strong>{summary.accuracy}%</strong></span>
          </div>
        </div>
      )}

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
        <button className="btn btn-secondary btn-sm filter-action" onClick={handleShuffle}>Xáo câu hỏi</button>
        <button className="btn btn-secondary btn-sm filter-action" onClick={handleRestartChapter}>Làm lại chương này</button>
      </div>

      {chapterQuestions.length === 0 ? (
        <div className="empty-state"><h3>Không có câu hỏi phù hợp</h3></div>
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
            <div className="question-controls flex gap-2 mt-4">
              <button className="btn btn-secondary" onClick={() => setCurrent(c => c - 1)} disabled={current === 0}>Trước</button>
              <button className="btn btn-primary" onClick={() => setCurrent(c => c + 1)} disabled={current >= chapterQuestions.length - 1}>Tiếp theo</button>
              <span className="question-count">
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
            <div className="navigator-legend">
              <span>Đúng: {correctCount}</span>
              <span>Sai: {wrongCount}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
