import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearHistory, getHistory } from '../utils/storage.js'
import { trackEvent } from '../utils/analytics.js'

const FILTERS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'exam', label: 'Đề thi 40 câu' },
  { value: 'chapter-practice', label: 'Ôn theo chương' },
  { value: 'wrong-practice', label: 'Ôn câu sai' },
]

const MODE_LABELS = {
  exam: 'Đề thi 40 câu',
  'chapter-practice': 'Ôn theo chương',
  'wrong-practice': 'Ôn câu sai',
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatTime(secs) {
  if (!secs) return null
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}p${s < 10 ? '0' + s : s}s`
}

function toBreakdownArray(value, keyName) {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object') return []
  return Object.entries(value).map(([key, stats]) => ({ [keyName]: key, ...stats }))
}

function percent(correct = 0, total = 0) {
  return total > 0 ? Math.round((correct / total) * 100) : 0
}

export default function History() {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(null)
  const [clearModal, setClearModal] = useState(false)
  const [filter, setFilter] = useState('all')
  const history = getHistory()

  const filteredHistory = useMemo(() => (
    filter === 'all' ? history : history.filter(session => session.mode === filter)
  ), [filter, history])

  function handleClear() {
    clearHistory()
    setClearModal(false)
    window.location.reload()
  }

  function handleFilterChange(value) {
    setFilter(value)
    setExpanded(null)
    trackEvent('view_history_filter', {
      mode: value,
    })
  }

  if (history.length === 0) {
    return (
      <div>
        <div className="page-header"><h1>Lịch sử làm bài</h1></div>
        <div className="empty-state">
          <h3>Chưa có lịch sử làm bài.</h3>
          <p>Hãy bắt đầu một đề thi hoặc ôn tập theo chương.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/exam')}>Bắt đầu làm bài</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header history-header">
        <div>
          <h1>Lịch sử làm bài</h1>
          <p>{history.length} phiên làm bài đã lưu</p>
        </div>
        <button className="btn btn-danger btn-sm" onClick={() => setClearModal(true)}>Xóa lịch sử</button>
      </div>

      <div className="history-filters" role="group" aria-label="Lọc lịch sử">
        {FILTERS.map(item => (
          <button
            key={item.value}
            className={`history-filter-btn ${filter === item.value ? 'active' : ''}`}
            onClick={() => handleFilterChange(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {filteredHistory.length === 0 ? (
        <div className="empty-state">
          <h3>Không có phiên phù hợp với bộ lọc này.</h3>
        </div>
      ) : filteredHistory.map((session, idx) => {
        const pct = session.accuracy || 0
        const isOpen = expanded === idx
        const wrongIds = session.wrongIds || session.answers?.filter(answer => !answer.isCorrect).map(answer => answer.questionId) || []
        const chapterRows = toBreakdownArray(session.chapterBreakdown || session.byChapter, 'week')
        const cloRows = toBreakdownArray(session.cloBreakdown || session.byCLO, 'clo')

        return (
          <article key={session.id || idx} className="history-item history-card report-card">
            <div className="history-card-main">
              <div className="hist-score-block">
                <div className="hist-score" style={{ color: pct >= 75 ? 'var(--color-success)' : pct >= 50 ? 'var(--color-warning)' : 'var(--color-danger)' }}>
                  {pct}%
                </div>
                <div className="hist-count">{session.correctCount}/{session.answeredCount || session.totalQuestions}</div>
              </div>
              <div className="hist-meta">
                <div className="hist-mode">{MODE_LABELS[session.mode] || session.mode}</div>
                <div className="hist-detail">{formatDate(session.completedAt || session.date)}</div>
                {session.week && <div className="hist-detail">{session.week}{session.chapterName ? ` - ${session.chapterName}` : ''}</div>}
                <div className="history-kpis">
                  <span>Đúng: <strong>{session.correctCount}</strong></span>
                  <span>Sai: <strong>{session.wrongCount}</strong></span>
                  <span>Tổng: <strong>{session.totalQuestions}</strong></span>
                  {session.timeUsed && <span>Thời gian: <strong>{formatTime(session.timeUsed)}</strong></span>}
                </div>
              </div>
              <div className="history-actions">
                {wrongIds.length > 0 && (
                  <button className="btn btn-secondary btn-sm" onClick={() => navigate('/wrong')}>Ôn lại câu sai từ lần này</button>
                )}
                <button className="btn btn-secondary btn-sm" onClick={() => setExpanded(isOpen ? null : idx)}>
                  {isOpen ? 'Thu gọn' : 'Xem chi tiết'}
                </button>
              </div>
            </div>

            {isOpen && (
              <div className="history-detail-panel">
                <div className="summary-grid">
                  <span>Đúng: <strong>{session.correctCount}</strong></span>
                  <span>Sai: <strong>{session.wrongCount}</strong></span>
                  <span>Tổng câu: <strong>{session.totalQuestions}</strong></span>
                  <span>Độ chính xác: <strong>{session.accuracy}%</strong></span>
                </div>

                {(chapterRows.length > 0 || cloRows.length > 0) && (
                  <div className="history-breakdowns">
                    {chapterRows.length > 0 && (
                      <div>
                        <h4>Theo chương</h4>
                        <div className="breakdown-list">
                          {chapterRows.map(row => {
                            const total = row.total || 0
                            const correct = row.correct || 0
                            const p = percent(correct, total)
                            return (
                              <div className="breakdown-row" key={row.week}>
                                <span>{row.week}</span>
                                <span>{correct}/{total}</span>
                                <span className={`accuracy-pill ${p < 50 ? 'low' : p < 75 ? 'mid' : 'high'}`}>{p}%</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    {cloRows.length > 0 && (
                      <div>
                        <h4>Theo CLO</h4>
                        <div className="breakdown-list">
                          {cloRows.map(row => {
                            const total = row.total || 0
                            const correct = row.correct || 0
                            const p = percent(correct, total)
                            return (
                              <div className="breakdown-row" key={row.clo}>
                                <span className="badge badge-blue">{row.clo}</span>
                                <span>{correct}/{total}</span>
                                <span className={`accuracy-pill ${p < 50 ? 'low' : p < 75 ? 'mid' : 'high'}`}>{p}%</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </article>
        )
      })}

      {clearModal && (
        <div className="modal-backdrop" onClick={() => setClearModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Xóa toàn bộ lịch sử?</h2>
            <p>Hành động này không thể hoàn tác. Tất cả {history.length} phiên làm bài sẽ bị xóa.</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setClearModal(false)}>Hủy</button>
              <button className="btn btn-danger" onClick={handleClear}>Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
