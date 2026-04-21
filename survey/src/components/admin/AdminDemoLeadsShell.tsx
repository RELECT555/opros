import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
}

export function AdminDemoLeadsShell({ children }: Props) {
  return (
    <div className="adm-platform adm-platform--demo-leads">
      <header className="adm-platform-hero" aria-labelledby="adm-demo-leads-title">
        <span className="adm-platform-badge">Платформа Askly</span>
        <h1 id="adm-demo-leads-title" className="adm-platform-title">
          Демо-заявки
        </h1>
        <p className="adm-platform-desc">
          Отдельная зона для лидов с выставок и демо-стендов: не смешивается с опросами и воронками опросников.
        </p>
      </header>
      <div className="adm-platform-content">{children}</div>
    </div>
  )
}
