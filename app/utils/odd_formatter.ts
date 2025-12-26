export function formatOdd(odd: number | string | null | undefined): number | null {
  if (odd === null || typeof odd === 'undefined') return null
  const asString = odd.toString().replace('.', ',')
  return Number(asString.replace(',', '.'))
}

export function formatUnit(unit: number | string | null | undefined): number | null {
  if (unit === null || typeof unit === 'undefined') return null
  const asString = unit.toString().replace('.', ',')
  return Number(asString.replace(',', '.'))
}
