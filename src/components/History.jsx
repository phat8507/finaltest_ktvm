import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getHistory, clearHistory } from '../utils/storage.js'

const MODE_LABELS = { exam: '📝 Đề thi 40 câu', chapter: '📚 Ôn theo chương', wrong: '❌ Ôn câu sai' }

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatTime(secs) {
  if (!secs) return '—'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}p${s < 10 ? '0' + s : s}s`
}

export default function History() {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(null)
  const [clearModal, setClearModal] = useState(false)
  const history = getHistory()

  function handleClear() {
    clearHistory()
    setClearModal(false)
    window.location.reload()
  }

  if (history.length === 0) {
    return (
      <div>
        <div className="page-header"><h1>Lịch sử làm bài</h1></div>
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>Chưa có lịch sử</h3>
          <p>Làm bài xong sẽ xuất hiện tại đây.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/exam')}>Bắt đầu làm bài</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Lịch sử làm bài</h1>
          <p>{history.length} phiên làm bài đã lưu</p>
        </div>
        <button className="btn btn-danger btn-sm" onClick={() => setClearModal(true)}>🗑️ Xóa lịch sử</button>
      </div>

      {history.map((session, idx) => {
        const pct = session.accuracy
        const isOpen = expanded === idx
        return (
          <div key={session.id || idx} className="history-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ textAlign: 'center', minWidth: 64 }}>
                <div className="hist-score" style={{ color: pct >= 75 ? 'var(--color-success)' : pct >= 50 ? 'var(--color-warning)' : 'var(--color-danger)' }}>
                  {pct}%
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                  {session.correctCount}/{session.totalQuestions}
                </div>
              </div>
              <div className="hist-meta" style={{ flex: 1 }}>
                <div className="hist-mode">{MODE_LABELS[session.mode] || session.mode}</div>
                <div className="hist-detail">
                  {formatDate(session.date)}
                  {session.timeUsed ? ` · ⏱ ${formatTime(session.timeUsed)}` : ''}
                  {session.wrongIds?.length ? ` · ❌ ${session.wrongIds.length} câu sai` : ''}
                </div>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setExpanded(isOpen ? null : idx)}
              >
                {isOpen ? 'Thu gọn ↑' : 'Chi tiết ↓'}
              </button>
            </div>

            {isOpen && (
              <div style={{ marginTop: 16, borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {session.byChapter?.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 8 }}>Theo chương</h4>
                      <table className="breakdown-table">
                        <thead><tr><th>Tuần</th><th>Đúng/Tổng</th><th>%</th></tr></thead>
                        <tbody>
                          {session.byChapter.map(c => {
                            const p = Math.round((c.correct / c.total) * 100)
                            return (
                              <tr key={c.week}>
                                <td>{c.week}</td>
                                <td>{c.correct}/{c.total}</td>
                                <td><span className={`accuracy-pill ${p < 50 ? 'low' : p < 75 ? 'mid' : 'high'}`}>{p}%</span></td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {session.byCLO?.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 8 }}>Theo CLO</h4>
                      <table className="breakdown-table">
                        <thead><tr><th>CLO</th><th>Đúng/Tổng</th><th>%</th></tr></thead>
                        <tbody>
                          {session.byCLO.map(c => {
                            const p = Math.round((c.correct / c.total) * 100)
                            return (
                              <tr key={c.clo}>
                                <td><span className="badge badge-blue">{c.clo}</span></td>
                                <td>{c.correct}/{c.total}</td>
                                <td><span className={`accuracy-pill ${p < 50 ? 'low' : p < 75 ? 'mid' : 'high'}`}>{p}%</span></td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
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
