/** Форматирует дату записи журнала обновлений (ISO YYYY-MM-DD) для отображения. */
export function formatProductUpdateDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  try {
    return new Date(y, m - 1, d).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}
