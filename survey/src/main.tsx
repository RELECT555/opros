/* eslint-disable react-refresh/only-export-components */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
import './index.css'
import AdminPage from './pages/AdminPage.tsx'
import SurveyPage from './pages/SurveyPage.tsx'
import HomePage from './pages/HomePage.tsx'
import UpdatesPage from './pages/UpdatesPage.tsx'

function SurveyRoute() {
  const { slug } = useParams<{ slug: string }>()
  return <SurveyPage slug={slug!} />
}

/** Тот же конструктор, что /s/crm — без старой растянутой вёрстки /crm (SurveyForm). */
function CrmSurveyRoute() {
  return <SurveyPage slug="crm" />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/updates" element={<UpdatesPage />} />
        <Route path="/s/:slug" element={<SurveyRoute />} />
        <Route path="/admin" element={<AdminPage />} />
        {/* Обратная совместимость: старые CRM-ссылки /?t=xxx */}
        <Route path="/crm" element={<CrmSurveyRoute />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
