import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import WizardPage from './pages/WizardPage'
import HistoryPage from './pages/HistoryPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<WizardPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
