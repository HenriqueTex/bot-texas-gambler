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
