export type TextAnalysisResult = {
  units: number | null
}

export default class TextMessageAnalysisService {
  /**
   * Analisa texto/caption e extrai dados estruturados.
   * Hoje retorna apenas unidades; pronto para expandir com mais campos.
   */
  async analyzeFromText(text: string): Promise<TextAnalysisResult> {
    return {
      units: this.extractUnits(text),
    }
  }

  private extractUnits(text: string): number | null {
    const patterns = [
      /(\d+(?:[.,]\d+)?)\s*u\b/i, // 2u, 1.5u, 2 u
      /(\d+(?:[.,]\d+)?)\s*unidades?\b/i, // 2 unidades
      /\bstake\s*[:\-]?\s*(\d+(?:[.,]\d+)?)/i, // stake 2, stake: 1.5
    ]

    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (!match) continue

      const numeric = Number((match[1] ?? '').replace(',', '.'))
      if (Number.isFinite(numeric) && numeric > 0 && numeric <= 100) {
        return numeric
      }
    }

    return null
  }
}
