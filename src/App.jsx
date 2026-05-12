import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Dashboard from './components/Dashboard.jsx'
import ExamGenerator from './components/ExamGenerator.jsx'
import ChapterPractice from './components/ChapterPractice.jsx'
import WrongQuestions from './components/WrongQuestions.jsx'
import History from './components/History.jsx'

export default function App() {
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
