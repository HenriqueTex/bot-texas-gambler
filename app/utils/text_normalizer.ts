export function normalizeText(value: string | null | undefined): string | null {
  if (!value) return null
  const cleaned = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/ /g, '_')
  return cleaned.length ? cleaned : null
}

export function normalizeBetText(value: string | null | undefined): string | null {
  if (!value) return null
  const cleaned = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[–—]/g, '-')
    .replace(/(\d)\s*,\s*(\d)/g, '$1.$2')
    .replace(/@(?=\d)/g, '@ ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned.length ? cleaned : null
}
