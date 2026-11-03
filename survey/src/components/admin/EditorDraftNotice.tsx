interface Props {
  restored: boolean
  conflict: boolean
  storageError: boolean
  busy: boolean
  onReload: () => Promise<void>
  onDownload: () => void
}

export function EditorDraftNotice({ restored, conflict, storageError, busy, onReload, onDownload }: Props) {
  if (!restored && !conflict && !storageError) return null
  return (
    <div className="adm-err-banner" role={conflict || storageError ? 'alert' : 'status'}>
      <p>{conflict
        ? 'На сервере уже есть другая версия опроса. Ваш черновик сохранён локально; запись поверх новой версии заблокирована.'
        : storageError
          ? 'Не удалось прочитать или сохранить локальный черновик. Для защиты правок скачайте текущую версию перед закрытием страницы.'
          : 'Восстановлен несохранённый черновик из этой вкладки браузера.'}</p>
      <div className="adm-section-actions">
        <button type="button" className="adm-btn-ghost" onClick={onDownload}>Скачать черновик</button>
        <button type="button" className="adm-btn-ghost" disabled={busy} onClick={() => void onReload()}>
          Отбросить черновик и загрузить с сервера
        </button>
      </div>
    </div>
  )
}
