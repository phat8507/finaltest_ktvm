import { useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { exportProgress, importProgress, resetAllProgress } from '../utils/storage.js'
import { trackEvent } from '../utils/analytics.js'

const NAV_ITEMS = [
  { path: '/', label: 'Tổng quan' },
  { path: '/exam', label: 'Đề thi 40 câu' },
  { path: '/chapters', label: 'Ôn theo chương' },
  { path: '/wrong', label: 'Ôn câu sai' },
  { path: '/history', label: 'Lịch sử làm bài' },
]

export default function Layout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [resetModal, setResetModal] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  function goTo(path) {
    navigate(path)
    setMenuOpen(false)
  }

  function handleExport() {
    const data = exportProgress()
    trackEvent('export_progress')
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `macroeco_progress_${new Date().toISOString().slice(0,10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        importProgress(data)
        trackEvent('import_progress')
        alert('Nhập dữ liệu thành công. Tải lại trang để xem cập nhật.')
        window.location.reload()
      } catch {
        alert('File không hợp lệ.')
      }
    }
    input.click()
  }

  function handleReset() {
    resetAllProgress()
    trackEvent('reset_progress')
    setResetModal(false)
    window.location.reload()
  }

  return (
    <div className="app-shell">
      <header className="mobile-topbar">
        <button className="menu-button" onClick={() => setMenuOpen(true)} aria-label="Mở menu">Menu</button>
        <div>
          <strong>MacroEco</strong>
          <span>Ôn thi Kinh tế Vĩ mô</span>
        </div>
      </header>

      {menuOpen && <div className="sidebar-backdrop" onClick={() => setMenuOpen(false)} />}

      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <h1>MacroEco</h1>
          <p>Ôn thi Kinh tế Vĩ mô</p>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => goTo(item.path)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button onClick={handleExport}>Xuất tiến độ</button>
          <button onClick={handleImport}>Nhập tiến độ</button>
          <button onClick={() => setResetModal(true)} className="danger-link">Xóa toàn bộ</button>
        </div>
      </aside>

      <main className="main-content">{children}</main>

      {resetModal && (
        <div className="modal-backdrop" onClick={() => setResetModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Xác nhận xóa</h2>
            <p>Toàn bộ lịch sử, câu sai và tiến độ sẽ bị xóa vĩnh viễn. Bạn có chắc không?</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setResetModal(false)}>Hủy</button>
              <button className="btn btn-danger" onClick={handleReset}>Xóa tất cả</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
