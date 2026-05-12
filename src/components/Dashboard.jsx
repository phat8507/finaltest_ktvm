import { useNavigate } from 'react-router-dom'
import { getHistory, getWrongQuestions } from '../utils/storage.js'
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

export default function Dashboard() {
  const navigate = useNavigate()
  const history = getHistory()
  const wrongQs = getWrongQuestions()
  const accuracy = getOverallAccuracy()
  const weakestChapters = getWeakestChapters(3)
  const weakestCLOs = getWeakestCLOs(3)

  const qCountByWeek = {}
  questions.forEach(q => { qCountByWeek[q.week] = (qCountByWeek[q.week] || 0) + 1 })

  return (
    <div>
      <div className="page-header">
        <h1>Tổng quan</h1>
        <p>Hệ thống ôn thi Kinh tế Vĩ mô - Final Exam</p>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{questions.length}</div>
          <div className="stat-label">Tổng câu hỏi</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{history.length}</div>
          <div className="stat-label">Lần làm bài</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{accuracy !== null ? `${accuracy}%` : '-'}</div>
          <div className="stat-label">Độ chính xác</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{Object.keys(wrongQs).length}</div>
          <div className="stat-label">Câu cần ôn</div>
        </div>
      </div>

      <div className="action-grid">
        <div className="action-card primary" onClick={() => navigate('/exam')}>
          <div className="action-title">Tạo đề thi 40 câu</div>
          <div className="action-desc">Đề thi mô phỏng theo cấu trúc CLO chuẩn</div>
        </div>
        <div className="action-card" onClick={() => navigate('/chapters')}>
          <div className="action-title">Ôn tập theo chương</div>
          <div className="action-desc">Ôn từng tuần với phản hồi tức thì</div>
        </div>
        <div className="action-card" onClick={() => navigate('/wrong')}>
          <div className="action-title">Ôn câu sai</div>
          <div className="action-desc">{Object.keys(wrongQs).length} câu đang chờ ôn tập</div>
        </div>
        <div className="action-card" onClick={() => navigate('/history')}>
          <div className="action-title">Lịch sử làm bài</div>
          <div className="action-desc">{history.length} phiên làm bài đã lưu</div>
        </div>
      </div>

      <div className="dashboard-two-col">
        <div className="card">
          <h3 className="section-title">Chương yếu nhất</h3>
          {weakestChapters.length === 0 ? (
            <p className="text-muted text-sm">Chưa có dữ liệu. Hãy làm bài để xem thống kê.</p>
          ) : weakestChapters.map(c => (
            <div key={c.week} className="metric-row">
              <span>{c.week}</span>
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
          {CHAPTER_INFO.map(ch => (
            <div key={ch.week} className="chapter-card" onClick={() => navigate('/chapters')}>
              <div className="chapter-week">{ch.week}</div>
              <div className="chapter-name">{ch.name}</div>
              <div className="chapter-meta">
                <span className="badge badge-blue" style={{ marginRight: 6 }}>{ch.clo}</span>
                <span>{qCountByWeek[ch.week] || 0} câu</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
