import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import WizardPage from './pages/WizardPage'
import HistoryPage from './pages/HistoryPage'
import PlatingRulesPage from './pages/PlatingRulesPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<WizardPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/plating-rules" element={<PlatingRulesPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
