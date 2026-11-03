/* eslint-disable react-refresh/only-export-components */
import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
import './index.css'
// Preserve the existing global cascade while loading the admin JavaScript on demand.
import './styles/admin.css'
import SurveyPage from './pages/SurveyPage.tsx'
import HomePage from './pages/HomePage.tsx'
import UpdatesPage from './pages/UpdatesPage.tsx'

const AdminPage = lazy(() => import('./pages/AdminPage.tsx'))

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
      <Suspense fallback={<main role="status" aria-live="polite">Загрузка…</main>}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/updates" element={<UpdatesPage />} />
        <Route path="/s/:slug" element={<SurveyRoute />} />
        <Route path="/admin" element={<AdminPage />} />
        {/* Обратная совместимость: старые CRM-ссылки /?t=xxx */}
        <Route path="/crm" element={<CrmSurveyRoute />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
)
