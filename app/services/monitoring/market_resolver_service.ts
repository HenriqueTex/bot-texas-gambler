import Market from '#models/market'
import MarketSynonym from '#models/market_synonym'

export type MarketResolution = {
  market: Market | null
  synonym: MarketSynonym | null
  normalizedMarket: string | null
}

export default class MarketResolverService {
  /**
   * Recebe o texto de market retornado pela análise de imagem e tenta
   * mapear para um market existente via sinônimos ou nome normalizado.
   */
  async resolveMarket(rawMarket: string | null | undefined): Promise<MarketResolution> {
    const normalized = this.normalize(rawMarket)
    if (!normalized) {
      return { market: null, synonym: null, normalizedMarket: null }
    }

    const synonym = await MarketSynonym.query()
      .where('normalizedValue', normalized)
      .preload('market')
      .first()

    if (synonym?.market) {
      return { market: synonym.market, synonym, normalizedMarket: normalized }
    }

    const createdMarket = await Market.create({
      name: rawMarket ?? normalized,
      normalizedName: normalized,
      category: null,
    })

    const createdSynonym = await MarketSynonym.firstOrCreate(
      { normalizedValue: normalized },
      { marketId: createdMarket.id, value: rawMarket ?? normalized, normalizedValue: normalized }
    )

    return { market: createdMarket, synonym: createdSynonym, normalizedMarket: normalized }
  }

  /**
   * Normaliza string para comparação (lowercase, remove acentos, trim, colapsa espaços).
   */
  private normalize(value: string | null | undefined): string | null {
    if (!value) return null
    const cleaned = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
    return cleaned.length ? cleaned : null
  }
}
