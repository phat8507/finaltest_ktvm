import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import QuestionCard from './QuestionCard.jsx'
import { generateExam40 } from '../utils/examGenerator.js'
import { saveSession, recordBatchAnswers, updateAccuracy } from '../utils/storage.js'
import { computeSessionStats } from '../utils/stats.js'
import { trackEvent } from '../utils/analytics.js'
import { prepareQuestionsWithShuffledOptions } from '../utils/shuffleOptions.js'
import questions from '../data/questions.json'

const EXAM_DURATION = 60 * 60
const qMap = Object.fromEntries(questions.map(q => [q.id, q]))

export default function ExamGenerator() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState('idle')
  const [examQuestions, setExamQuestions] = useState([])
  const [warnings, setWarnings] = useState([])
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState({})
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION)
  const [submitted, setSubmitted] = useState(false)
  const [results, setResults] = useState(null)
  const [showSubmitModal, setShowSubmitModal] = useState(false)

  useEffect(() => {
    if (phase !== 'exam' || submitted) return
    if (timeLeft <= 0) { handleSubmit(); return }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000)
    return () => clearInterval(timer)
  }, [phase, timeLeft, submitted])

  const formatTime = useCallback((secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }, [])

  function startExam() {
    const { selected, warnings: w } = generateExam40(questions)
    const shuffledSelected = prepareQuestionsWithShuffledOptions(selected)
    setExamQuestions(shuffledSelected)
    setWarnings(w)
    setAnswers({})
    setCurrent(0)
    setTimeLeft(EXAM_DURATION)
    setSubmitted(false)
    setResults(null)
    setPhase('exam')
    trackEvent('start_40_question_exam', {
      mode: 'exam',
      total_questions: shuffledSelected.length,
    })
  }

  function handleSelect(key) {
    const q = examQuestions[current]
    setAnswers(prev => ({ ...prev, [q.id]: key }))
    trackEvent('answer_question', {
      mode: 'exam',
      chapter: q.week,
      clo: q.clo.join(','),
    })
  }

  function handleSubmit() {
    setShowSubmitModal(false)
    const stats = computeSessionStats(examQuestions, answers)
    const sessionQuestionMap = Object.fromEntries(examQuestions.map(q => [q.id, q]))
    const answerMap = Object.fromEntries(
      Object.entries(answers).map(([id, ans]) => [id, ans === sessionQuestionMap[id]?.answer])
    )
    recordBatchAnswers(answerMap)
    updateAccuracy(answerMap, qMap)
    saveSession({
      mode: 'exam',
      title: 'Tạo đề thi 40 câu',
      startedAt: new Date(Date.now() - (EXAM_DURATION - timeLeft) * 1000).toISOString(),
      completedAt: new Date().toISOString(),
      totalQuestions: examQuestions.length,
      answeredCount: Object.keys(answers).length,
      correctCount: stats.correct,
      wrongCount: stats.total - stats.correct,
      accuracy: stats.accuracy,
      byChapter: stats.byChapter,
      byCLO: stats.byCLO,
      chapterBreakdown: stats.byChapter,
      cloBreakdown: stats.byCLO,
      wrongIds: stats.wrongList.map(w => w.question.id),
      answers: examQuestions.map(q => {
        const selectedAnswer = answers[q.id] || null
        return {
          questionId: q.id,
          selectedAnswer,
          correctAnswer: q.answer,
          originalAnswer: q.originalAnswer || qMap[q.id]?.answer || q.answer,
          displayedOptions: q.options,
          optionShuffleMap: q.optionShuffleMap,
          isCorrect: selectedAnswer === q.answer,
        }
      }),
      timeUsed: EXAM_DURATION - timeLeft,
    })
    trackEvent('submit_40_question_exam', {
      mode: 'exam',
      score: stats.correct,
      total_questions: examQuestions.length,
      accuracy: stats.accuracy,
      correct_count: stats.correct,
      wrong_count: stats.total - stats.correct,
    })
    setResults(stats)
    setSubmitted(true)
    setPhase('result')
  }

  const timerClass = timeLeft < 300 ? 'exam-status-value danger' : timeLeft < 600 ? 'exam-status-value warning' : 'exam-status-value'
  const answeredCount = Object.keys(answers).length
  const q = examQuestions[current]

  if (phase === 'idle') {
    return (
      <div>
        <div className="page-header">
          <h1>Đề thi thử 40 câu</h1>
          <p>Đề thi mô phỏng cấu trúc CLO chính thức trong 60 phút</p>
        </div>
        <div className="exam-start-card card">
          <span className="eyebrow">Chế độ thi</span>
          <h2>Sẵn sàng làm bài?</h2>
          <p>
            Đề thi gồm <strong>40 câu</strong> trắc nghiệm phân bổ theo cấu trúc CLO từ Tuần 1-8.
            Kết quả sẽ được lưu sau khi nộp bài.
          </p>
          <div className="exam-rules-grid">
            <span>Thời gian: <strong>60 phút</strong></span>
            <span>Điều hướng tự do giữa các câu</span>
            <span>Có báo cáo theo chương và CLO</span>
          </div>
          <button className="btn btn-primary btn-lg" onClick={startExam}>Bắt đầu làm bài</button>
        </div>
      </div>
    )
  }

  if (phase === 'result' && results) {
    const { correct, total, accuracy, byChapter, byCLO, wrongList } = results
    return (
      <div>
        <div className="result-hero">
          <div className="score-big">{accuracy}%</div>
          <div className="score-label">Điểm số</div>
          <div className="result-meta">
            <div className="result-meta-item"><div className="val">{correct}</div><div className="lbl">Đúng</div></div>
            <div className="result-meta-item"><div className="val">{total - correct}</div><div className="lbl">Sai</div></div>
            <div className="result-meta-item"><div className="val">{total}</div><div className="lbl">Tổng câu</div></div>
            <div className="result-meta-item"><div className="val">{formatTime(EXAM_DURATION - timeLeft)}</div><div className="lbl">Thời gian</div></div>
          </div>
        </div>

        {warnings.length > 0 && warnings.map((w, i) => (
          <div key={i} className="alert alert-warning">{w}</div>
        ))}

        <div className="result-grid">
          <div className="card result-detail-card">
            <h3 className="mb-4">Kết quả theo chương</h3>
            <table className="breakdown-table">
              <thead><tr><th>Tuần</th><th>Đúng/Tổng</th><th>%</th></tr></thead>
              <tbody>
                {byChapter.map(c => {
                  const pct = Math.round((c.correct / c.total) * 100)
                  return (
                    <tr key={c.week}>
                      <td>{c.week}</td>
                      <td>{c.correct}/{c.total}</td>
                      <td><span className={`accuracy-pill ${pct < 50 ? 'low' : pct < 75 ? 'mid' : 'high'}`}>{pct}%</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="card result-detail-card">
            <h3 className="mb-4">Kết quả theo CLO</h3>
            <table className="breakdown-table">
              <thead><tr><th>CLO</th><th>Đúng/Tổng</th><th>%</th></tr></thead>
              <tbody>
                {byCLO.map(c => {
                  const pct = Math.round((c.correct / c.total) * 100)
                  return (
                    <tr key={c.clo}>
                      <td><span className="badge badge-blue">{c.clo}</span></td>
                      <td>{c.correct}/{c.total}</td>
                      <td><span className={`accuracy-pill ${pct < 50 ? 'low' : pct < 75 ? 'mid' : 'high'}`}>{pct}%</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {wrongList.length > 0 && (
          <div className="card result-detail-card">
            <h3 className="mb-4">Câu trả lời sai ({wrongList.length} câu)</h3>
            {wrongList.map(({ question: wrongQuestion, userAnswer }, idx) => (
              <div key={wrongQuestion.id} className="wrong-item">
                <div className="wi-meta">
                  <span className="tag tag-week">{wrongQuestion.week}</span>
                  {wrongQuestion.clo.map(c => <span key={c} className="tag tag-clo">{c}</span>)}
                </div>
                <div className="wi-question"><strong>Câu {idx + 1}:</strong> {wrongQuestion.question}</div>
                <div className="wrong-answer-row">
                  <span>Bạn chọn: <strong>{userAnswer || 'Chưa trả lời'}</strong>{userAnswer && ` - ${wrongQuestion.options[userAnswer] || ''}`}</span>
                  <span>Đáp án: <strong>{wrongQuestion.answer}</strong> - {wrongQuestion.options[wrongQuestion.answer]}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 mt-6 result-actions">
          <button className="btn btn-primary" onClick={startExam}>Làm lại đề mới</button>
          <button className="btn btn-secondary" onClick={() => setPhase('idle')}>Về trang đề thi</button>
          <button className="btn btn-secondary" onClick={() => navigate('/')}>Tổng quan</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="exam-status-bar">
        <div className="exam-status-title">
          <h2>Đề thi 40 câu</h2>
          <span>Câu {current + 1}/{examQuestions.length}</span>
        </div>
        <div className="exam-status-metrics">
          <div>
            <span>Đã trả lời</span>
            <strong>{answeredCount}/{examQuestions.length}</strong>
          </div>
          <div>
            <span>Thời gian còn lại</span>
            <strong className={timerClass}>{formatTime(timeLeft)}</strong>
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowSubmitModal(true)}>Nộp bài</button>
      </div>

      {warnings.length > 0 && warnings.map((w, i) => (
        <div key={i} className="alert alert-warning">{w}</div>
      ))}

      <div className="question-container exam-question-container">
        <div>
          <QuestionCard
            question={q}
            questionNum={current + 1}
            userAnswer={answers[q?.id]}
            onSelect={handleSelect}
            mode="exam"
          />
          <div className="question-controls flex gap-2 mt-4">
            <button className="btn btn-secondary" onClick={() => setCurrent(c => c - 1)} disabled={current === 0}>Trước</button>
            {current < examQuestions.length - 1
              ? <button className="btn btn-primary" onClick={() => setCurrent(c => c + 1)}>Tiếp theo</button>
              : <button className="btn btn-success" onClick={() => setShowSubmitModal(true)}>Nộp bài</button>
            }
          </div>
        </div>

        <div className="navigator-panel exam-navigator">
          <h3>Bảng câu hỏi</h3>
          <div className="nav-grid">
            {examQuestions.map((eq, i) => (
              <button
                key={eq.id}
                className={`nav-dot ${i === current ? 'current' : answers[eq.id] ? 'answered' : ''}`}
                onClick={() => setCurrent(i)}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className="navigator-legend">
            <span>Đã trả lời</span>
            <span>Chưa trả lời</span>
          </div>
        </div>
      </div>

      {showSubmitModal && (
        <div className="modal-backdrop" onClick={() => setShowSubmitModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Nộp bài?</h2>
            <p>Bạn đã trả lời <strong>{answeredCount}/{examQuestions.length}</strong> câu.{answeredCount < examQuestions.length ? ` Còn ${examQuestions.length - answeredCount} câu chưa trả lời.` : ' Bạn đã trả lời đủ số câu.'}</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowSubmitModal(false)}>Tiếp tục làm</button>
              <button className="btn btn-primary" onClick={handleSubmit}>Nộp bài</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
