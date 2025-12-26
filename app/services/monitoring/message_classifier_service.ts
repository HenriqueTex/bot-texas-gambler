type Classification = {
  isBet: boolean
  confidence: number
  reasons: string[]
}

export default class MessageClassifierService {
  classify(message: any, text?: string): Classification {
    const content = (text ?? message?.text ?? message?.caption ?? '').toString()
    const hasPhoto = Array.isArray(message?.photo) && message.photo.length > 0

    let score = 0
    const reasons: string[] = []

    if (hasPhoto) {
      score += 2
      reasons.push('foto')
    }

    if (this.hasUnits(content)) {
      score += 2
      reasons.push('unidades')
    }

    if (this.hasOdd(content)) {
      score += 2
      reasons.push('odd')
    }

    if (this.hasMarketKeywords(content)) {
      score += 1
      reasons.push('mercado')
    }

    if (this.hasBetKeywords(content)) {
      score += 1
      reasons.push('aposta')
    }

    if (this.hasTeamSeparator(content)) {
      score += 1
      reasons.push('times')
    }

    if (this.hasPromotionKeywords(content)) {
      score -= 2
      reasons.push('promocional')
    }

    const threshold = hasPhoto ? 2 : 3
    const isBet = score >= threshold
    const confidence = this.clamp(score / 8, 0, 1)

    if (!isBet && reasons.length === 0) {
      reasons.push('sem_indicadores')
    }

    return { isBet, confidence, reasons }
  }

  private hasUnits(text: string): boolean {
    return /(\d+(?:[.,]\d+)?)\s*u\b/i.test(text) || /stake\s*[:\-]?\s*\d+/i.test(text)
  }

  private hasOdd(text: string): boolean {
    return /@\s*\d+(?:[.,]\d+)?/i.test(text) ||
      /odds?\s*[:\-]?\s*\d+(?:[.,]\d+)?/i.test(text) ||
      /cota(?:cao)?\s*[:\-]?\s*\d+(?:[.,]\d+)?/i.test(text)
  }

  private hasMarketKeywords(text: string): boolean {
    return /\b(moneyline|ml|handicap|over|under|total|maps?|kills?|gols?|escanteios?|first\s*blood)\b/i.test(
      text
    )
  }

  private hasBetKeywords(text: string): boolean {
    return /\b(aposta|bet|pick|tip)\b/i.test(text)
  }

  private hasTeamSeparator(text: string): boolean {
    return /\bvs\b|\bx\b|\s-\s/i.test(text)
  }

  private hasPromotionKeywords(text: string): boolean {
    return /\b(bonus|cadastro|cupom|sorteio|promo)\b/i.test(text)
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value))
  }
}
