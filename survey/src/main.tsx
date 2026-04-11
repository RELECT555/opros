import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import AdminPage from './AdminPage.tsx'
import SurveyPage from './pages/SurveyPage.tsx'

const path = window.location.pathname

// /admin → админка
// /s/:slug → динамический опрос
// / → старый CRM-опрос (обратная совместимость с существующими токен-ссылками)

let element: React.ReactNode

if (path === '/admin') {
  element = <AdminPage />
} else if (path.startsWith('/s/')) {
  const slug = path.slice(3).replace(/\/$/, '') // убираем /s/ и trailing slash
  element = <SurveyPage slug={slug} />
} else {
  element = <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {element}
  </StrictMode>,
)
