import env from '#start/env'
import Market from '#models/market'
import MarketSynonym from '#models/market_synonym'
import { normalizeText } from '../../utils/text_normalizer.js'

export type MarketResolution = {
  market: Market | null
  synonym: MarketSynonym | null
  normalizedMarket: string | null
}

export default class MarketResolverService {
  private readonly apiKey: string | null
  private readonly model: string

  constructor(options?: { model?: string }) {
    this.apiKey = env.get('GEMINI_API_KEY') ?? null
    this.model = options?.model ?? env.get('GEMINI_MODEL') ?? 'gemini-flash-latest'
  }

  /**
   * Recebe o texto de market retornado pela análise de imagem e tenta
   * mapear para um market existente via sinônimos ou nome normalizado.
   */
  async resolveMarket(rawMarket: string | null | undefined): Promise<MarketResolution> {
    const normalized = normalizeText(rawMarket)
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

    const markets = await Market.query()
    const decision = await this.classifyWithGemini(normalized, markets)

    const targetMarket =
      this.findByNormalized(markets, normalizeText(decision?.marketName ?? '')) ??
      this.findByNormalized(markets, normalized)

    if (decision?.match && targetMarket) {
      const createdSynonym = await MarketSynonym.firstOrCreate(
        { normalizedValue: normalized },
        { marketId: targetMarket.id, value: rawMarket ?? normalized, normalizedValue: normalized }
      )
      return { market: targetMarket, synonym: createdSynonym, normalizedMarket: normalized }
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

  private async classifyWithGemini(
    normalizedMarket: string,
    markets: Market[]
  ): Promise<{ match: boolean; marketName: string | null } | null> {
    if (!this.apiKey) return null
    if (!markets.length) return null

    const prompt = [
      'Act like um classificador/normalizador de mercados de apostas com foco em equivalência semântica (sinônimos), variações de ordem e pequenas diferenças de redação.',
      '',
      'Objetivo: Dado um “Termo candidato” e uma lista de “Mercados existentes”, decidir se o candidato é sinônimo de exatamente UM mercado existente. Você NÃO pode criar mercados novos.',
      '',
      'Entrada:',
      '- Mercados existentes: uma lista de strings com nomes oficiais.',
      '- Termo candidato: uma string já “normalizedMarket”.',
      '',
      'Saída: responda SOMENTE um JSON válido, exatamente:',
      '{ "match": boolean, "marketName": string|null }',
      '',
      'Processo obrigatório (faça mentalmente, não exponha):',
      '1) Pré-normalização textual:',
      '   - Ignore maiúsculas/minúsculas, acentos, pontuação, hífens, barras e múltiplos espaços.',
      '   - Considere equivalentes: “total” ~ “totais” ~ “total de”; “kills” ~ “abates”; “under” ~ “abaixo de” ~ “menos de”; “over” ~ “acima de” ~ “mais de”.',
      '   - Trate variações de ordem como equivalentes: “Under kills” == “Total kills under” == “Under total kills” == “Kills under”.',
      '2) Regra crítica: o marketName deve ser genérico (sem números/linhas/limites/tempo específico).',
      '   - Se o termo candidato incluir números (ex.: “Under 25 kills”, “Over 23:59”), ignore os números e foque no tipo base (“Under kills”, “Over time”), desde que isso não crie ambiguidade com mais de um mercado existente.',
      '3) Mapeamento semântico:',
      '   - Identifique o “alvo” principal (ex.: kills, maps, time, escanteios, handicap).',
      '   - Identifique a direção/operador (over/under/handicap/moneyline etc.).',
      '   - Se o candidato expressar o mesmo alvo + mesmo operador de um mercado existente, considere sinônimo mesmo que a redação seja diferente.',
      '4) Desambiguação:',
      '   - Se o candidato casar com mais de um mercado existente, retorne match=false e marketName=null.',
      '   - Se não houver correspondência clara e única, retorne match=false e marketName=null.',
      '5) Seleção:',
      '   - Quando match=true, marketName deve ser o texto EXATO de um item em “Mercados existentes”.',
      '',
      'Regras de decisão (exemplos que você DEVE reconhecer):',
      '- “Under kills” ≡ “Total kills under” ≡ “Under total kills” ≡ “Kills under”.',
      '- “Over maps” ≡ “Total maps over”.',
      '- “Handicap de kills” ≡ “Kills handicap”.',
      '',
      'Restrições finais:',
      '- Não invente nem edite nomes. Apenas escolha 1 dos existentes ou null.',
      '- Não inclua explicações, comentários, markdown, ou qualquer texto fora do JSON.',
      '- Autochecagem: JSON válido, aspas duplas, sem trailing commas, e marketName exatamente igual ao existente.',
      '',
      `Agora execute a classificação para:\nMercados existentes: ${markets.map((m) => `"${m.name}"`).join(', ')}\nTermo candidato: "${normalizedMarket}"`,
      '',
      'Take a deep breath and work on this problem step-by-step.',
    ].join('\n')

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`
    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1 },
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const raw = await response.text()
    if (!response.ok) {
      console.error(`Gemini market classify falhou: ${response.status} ${raw}`)
      return null
    }

    try {
      const parsed = JSON.parse(raw) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[]
        error?: { message?: string }
      }
      if (parsed.error?.message) {
        console.error(`Gemini market classify erro: ${parsed.error.message}`)
        return null
      }

      const text =
        parsed.candidates?.[0]?.content?.parts
          ?.map((p) => p.text ?? '')
          .join('')
          .trim() ?? ''
      if (!text) return null
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
      const payload = JSON.parse(jsonMatch ? jsonMatch[1] : text) as {
        match?: boolean
        marketName?: string | null
      }
      return { match: !!payload.match, marketName: payload.marketName ?? null }
    } catch (error) {
      console.error(`Falha ao interpretar resposta do Gemini market classify: ${String(error)}`)
      return null
    }
  }

  private findByNormalized(markets: Market[], normalizedName: string | null) {
    if (!normalizedName) return null

    return markets.find((m) => m.normalizedName === normalizedName) ?? null
  }
}
