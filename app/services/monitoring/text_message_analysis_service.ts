export type TextAnalysisResult = {
  units: number | null
  odd: number | null
}

export default class TextMessageAnalysisService {
  /**
   * Analisa texto/caption e extrai dados estruturados.
   * Hoje retorna apenas unidades; pronto para expandir com mais campos.
   */
  async analyzeFromText(text: string): Promise<TextAnalysisResult> {
    const { units, odd } = this.extractUnitsAndOdd(text)
    return {
      units,
      odd,
    }
  }

  private extractUnitsAndOdd(text: string): { units: number | null; odd: number | null } {
    const patterns = [
      /(\d+(?:[.,]\d+)?)\s*u\b/i, // 2u, 1.5u, 2 u
      /(\d+(?:[.,]\d+)?)\s*unidades?\b/i, // 2 unidades
      /\bstake\s*[:\-]?\s*(\d+(?:[.,]\d+)?)/i, // stake 2, stake: 1.5
    ]

    let units: number | null = null
    let textWithoutUnits = text

    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (!match) continue

      const numeric = this.toNumber(match[1] ?? '')
      if (numeric && numeric > 0 && numeric <= 100) {
        units = numeric
        textWithoutUnits =
          text.slice(0, match.index) + text.slice((match.index ?? 0) + match[0].length)
        break
      }
    }

    const oddPattern = /(?:@|odds?\s*[:\-]?\s*|cota(?:cao)?\s*[:\-]?\s*)(\d+(?:[.,]\d+)?)/i
    const oddMatch = textWithoutUnits.match(oddPattern)
    const odd = oddMatch ? this.toNumber(oddMatch[1] ?? '') : null

    return { units, odd }
  }

  private toNumber(value: string): number | null {
    const numeric = Number(value.replace(',', '.'))
    return Number.isFinite(numeric) ? numeric : null
  }
}
