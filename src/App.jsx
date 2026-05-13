import { useEffect, useRef } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Dashboard from './components/Dashboard.jsx'
import ExamGenerator from './components/ExamGenerator.jsx'
import ChapterPractice from './components/ChapterPractice.jsx'
import WrongQuestions from './components/WrongQuestions.jsx'
import History from './components/History.jsx'
import { getCurrentPagePath, trackEvent, trackPageView } from './utils/analytics.js'

export default function App() {
  const location = useLocation()
  const didTrackInitialPage = useRef(false)

  useEffect(() => {
    trackPageView(getCurrentPagePath())
    trackEvent('app_loaded', {
      app: 'macro_quiz',
    })
  }, [])

  useEffect(() => {
    if (!didTrackInitialPage.current) {
      didTrackInitialPage.current = true
      return
    }
    trackPageView(getCurrentPagePath())
  }, [location.pathname, location.search, location.hash])

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/exam" element={<ExamGenerator />} />
        <Route path="/chapters" element={<ChapterPractice />} />
        <Route path="/wrong" element={<WrongQuestions />} />
        <Route path="/history" element={<History />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
