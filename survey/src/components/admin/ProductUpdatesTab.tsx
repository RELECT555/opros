import { productUpdates } from '../../data/productUpdates'
import { formatProductUpdateDate } from '../../lib/formatProductUpdateDate'

export function ProductUpdatesTab() {
  return (
    <div className="adm-tab-content">
      <div className="qed-header">
        <div className="qed-header-row">
          <div className="qed-header-left">
            <div className="qed-header-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 11v4a2 2 0 002 2h2l6 3V6L7 9H5a2 2 0 00-2 2z" />
                <path d="M16 9.5a4 4 0 010 5" />
              </svg>
            </div>
            <div>
              <h2 className="qed-header-title">Обновления</h2>
              <p className="qed-header-sub">История изменений — дублирует раздел «Что нового» на лендинге</p>
            </div>
          </div>
        </div>
      </div>

      <div className="adm-updates-list">
        {productUpdates.map(u => (
          <article key={`${u.date}-${u.title}`} className="adm-card adm-product-update-card">
            <time className="adm-product-update-date" dateTime={u.date}>
              {formatProductUpdateDate(u.date)}
            </time>
            <h3 className="adm-product-update-title">{u.title}</h3>
            <ul className="adm-product-update-items">
              {u.items.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  )
}
