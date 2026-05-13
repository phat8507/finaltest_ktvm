import { useNavigate } from 'react-router-dom'
import { getAccuracyByChapter, getHistory, getWrongQuestions } from '../utils/storage.js'
import { getOverallAccuracy, getWeakestChapters, getWeakestCLOs } from '../utils/stats.js'
import questions from '../data/questions.json'

const CHAPTER_INFO = Object.values(questions.reduce((acc, q) => {
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

const chapterByWeek = Object.fromEntries(CHAPTER_INFO.map(ch => [ch.week, ch]))

function getAnsweredQuestionCount(history) {
  const answeredIds = new Set()
  history.forEach(session => {
    if (Array.isArray(session.answers)) {
      session.answers.forEach(answer => {
        if (answer.questionId) answeredIds.add(answer.questionId)
      })
    }
  })
  return answeredIds.size
}

export default function Dashboard() {
  const navigate = useNavigate()
  const history = getHistory()
  const wrongQs = getWrongQuestions()
  const accByChapter = getAccuracyByChapter()
  const accuracy = getOverallAccuracy()
  const weakestChapters = getWeakestChapters(3)
  const weakestCLOs = getWeakestCLOs(3)
  const weakestChapter = weakestChapters[0]
  const wrongCount = Object.keys(wrongQs).length
  const answeredCount = getAnsweredQuestionCount(history)
  const answeredPct = Math.round((answeredCount / questions.length) * 100)

  const qCountByWeek = {}
  questions.forEach(q => { qCountByWeek[q.week] = (qCountByWeek[q.week] || 0) + 1 })

  const recommended = weakestChapter
    ? {
        title: 'Tiếp tục ôn chương yếu nhất',
        detail: `${weakestChapter.week} - ${chapterByWeek[weakestChapter.week]?.name || 'Chương cần ôn'} (${weakestChapter.accuracy}%)`,
        path: '/chapters',
        state: { week: weakestChapter.week },
      }
    : wrongCount > 0
      ? {
          title: 'Ôn lại câu sai',
          detail: `${wrongCount} câu đang cần củng cố`,
          path: '/wrong',
        }
      : {
          title: 'Tạo đề thi 40 câu',
          detail: 'Bắt đầu một phiên luyện thi đầy đủ',
          path: '/exam',
        }

  function navigateWithState(path, state) {
    navigate(path, state ? { state } : undefined)
  }

  return (
    <div>
      <div className="page-header dashboard-header">
        <div>
          <h1>Tổng quan</h1>
          <p>Bảng điều khiển ôn thi Kinh tế Vĩ mô</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigateWithState(recommended.path, recommended.state)}>
          {recommended.title}
        </button>
      </div>

      <div className="dashboard-command-grid">
        <section className="dashboard-summary glass-card">
          <div>
            <span className="eyebrow">Khuyến nghị hôm nay</span>
            <h2>{recommended.title}</h2>
            <p>{recommended.detail}</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigateWithState(recommended.path, recommended.state)}>
            Bắt đầu
          </button>
        </section>

        <div className="stat-card stat-card-compact">
          <div className="stat-value">{questions.length}</div>
          <div className="stat-label">Tổng câu hỏi</div>
        </div>
        <div className="stat-card stat-card-compact">
          <div className="stat-value">{answeredCount}</div>
          <div className="stat-label">Câu đã trả lời</div>
        </div>
        <div className="stat-card stat-card-compact">
          <div className="stat-value">{accuracy !== null ? `${accuracy}%` : '-'}</div>
          <div className="stat-label">Độ chính xác</div>
        </div>
        <div className="stat-card stat-card-compact">
          <div className="stat-value">{wrongCount}</div>
          <div className="stat-label">Câu sai cần ôn</div>
        </div>
      </div>

      <div className="dashboard-two-col">
        <div className="card">
          <h3 className="section-title">Chương yếu nhất</h3>
          {weakestChapter ? (
            <div className="weak-chapter-panel">
              <div>
                <strong>{weakestChapter.week}</strong>
                <span>{chapterByWeek[weakestChapter.week]?.name || 'Chương cần ôn'}</span>
              </div>
              <span className={`accuracy-pill ${weakestChapter.accuracy < 50 ? 'low' : weakestChapter.accuracy < 75 ? 'mid' : 'high'}`}>
                {weakestChapter.accuracy}%
              </span>
            </div>
          ) : (
            <p className="text-muted text-sm">Chưa có dữ liệu. Hãy bắt đầu một đề thi hoặc ôn theo chương.</p>
          )}
        </div>

        <div className="card">
          <h3 className="section-title">Tiến độ học tập</h3>
          <div className="study-progress-line">
            <span>{answeredCount}/{questions.length} câu đã từng trả lời</span>
            <strong>{answeredPct}%</strong>
          </div>
          <div className="chapter-bar">
            <div className="chapter-bar-fill" style={{ width: `${answeredPct}%` }} />
          </div>
        </div>
      </div>

      <div className="action-grid">
        <div className="action-card primary" onClick={() => navigateWithState('/chapters', weakestChapter ? { week: weakestChapter.week } : undefined)}>
          <div className="action-title">Tiếp tục ôn chương yếu nhất</div>
          <div className="action-desc">{weakestChapter ? `${weakestChapter.week} cần củng cố thêm` : 'Sẵn sàng sau khi có dữ liệu học tập'}</div>
        </div>
        <div className="action-card" onClick={() => navigate('/exam')}>
          <div className="action-title">Tạo đề thi 40 câu</div>
          <div className="action-desc">Luyện như phiên thi thật trong 60 phút</div>
        </div>
        <div className="action-card" onClick={() => navigate('/wrong')}>
          <div className="action-title">Ôn câu sai</div>
          <div className="action-desc">{wrongCount} câu đang chờ ôn tập</div>
        </div>
        <div className="action-card" onClick={() => navigate('/history')}>
          <div className="action-title">Xem lịch sử làm bài</div>
          <div className="action-desc">{history.length} phiên làm bài đã lưu</div>
        </div>
      </div>

      <div className="dashboard-two-col">
        <div className="card">
          <h3 className="section-title">Chương cần chú ý</h3>
          {weakestChapters.length === 0 ? (
            <p className="text-muted text-sm">Chưa có dữ liệu. Hãy làm bài để xem thống kê.</p>
          ) : weakestChapters.map(c => (
            <div key={c.week} className="metric-row">
              <span>{c.week} - {chapterByWeek[c.week]?.name || 'Chương'}</span>
              <span className={`accuracy-pill ${c.accuracy < 50 ? 'low' : c.accuracy < 75 ? 'mid' : 'high'}`}>{c.accuracy}%</span>
            </div>
          ))}
        </div>

        <div className="card">
          <h3 className="section-title">CLO yếu nhất</h3>
          {weakestCLOs.length === 0 ? (
            <p className="text-muted text-sm">Chưa có dữ liệu. Hãy làm bài để xem thống kê.</p>
          ) : weakestCLOs.map(c => (
            <div key={c.clo} className="metric-row">
              <span className="badge badge-blue">{c.clo}</span>
              <span className="text-muted text-sm">{c.total} câu</span>
              <span className={`accuracy-pill ${c.accuracy < 50 ? 'low' : c.accuracy < 75 ? 'mid' : 'high'}`}>{c.accuracy}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="section-title">Ngân hàng câu hỏi theo chương</h3>
        <div className="chapter-grid">
          {CHAPTER_INFO.map(ch => {
            const acc = accByChapter[ch.week]
            const pct = acc?.total ? Math.round((acc.correct / acc.total) * 100) : 0
            return (
              <div key={ch.week} className="chapter-card dashboard-chapter-card" onClick={() => navigate('/chapters', { state: { week: ch.week } })}>
                <div className="chapter-week">{ch.week}</div>
                <div className="chapter-name">{ch.name}</div>
                <div className="chapter-meta">
                  <span className="badge badge-blue" style={{ marginRight: 6 }}>{ch.clo}</span>
                  <span>{qCountByWeek[ch.week] || 0} câu</span>
                </div>
                <div className="chapter-bar">
                  <div className="chapter-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="chapter-progress-text">
                  {acc?.total ? `Độ chính xác ${pct}% (${acc.correct}/${acc.total})` : 'Chưa bắt đầu'}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
