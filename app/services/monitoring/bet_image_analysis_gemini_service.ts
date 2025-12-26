import env from '#start/env'
import type { BetImageAnalysisResult } from '#services/monitoring/bet_image_analysis_service'
import fs from 'node:fs/promises'
import path from 'node:path'

type GeminiContentPart = { text?: string }
type GeminiCandidate = { content?: { parts?: GeminiContentPart[] } }
type GeminiApiResponse = {
  candidates?: GeminiCandidate[]
  error?: { message?: string }
}

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
}

export default class GeminiBetImageAnalysisService {
  private readonly apiKey: string
  private readonly model: string

  constructor(options?: { model?: string }) {
    const apiKey = env.get('GEMINI_API_KEY')
    const model = options?.model ?? env.get('GEMINI_MODEL') ?? 'gemini-flash-latest'

    if (!apiKey) {
      throw new Error('Configure a variável de ambiente GEMINI_API_KEY para usar a API do Gemini.')
    }

    this.apiKey = apiKey
    this.model = this.normalizeModelName(model)
  }

  async analyze(
    imagePath: string,
    options?: { contextText?: string }
  ): Promise<BetImageAnalysisResult> {
    const resolvedPath = path.resolve(imagePath)
    await this.ensureImageReadable(resolvedPath)

    const mimeType = this.getMimeType(resolvedPath)
    const base64Image = await this.readBase64(resolvedPath)
    const prompt = this.buildPrompt(options?.contextText)

    const rawText = await this.callGemini({ prompt, mimeType, base64Image })
    return this.parseGeminiResult(rawText)
  }

  private async callGemini(args: {
    prompt: string
    mimeType: string
    base64Image: string
  }): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`
    const body = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: args.prompt },
            { inlineData: { mimeType: args.mimeType, data: args.base64Image } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
      },
    }

    const maxAttempts = 3
    const baseDelayMs = 750

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const raw = await response.text()

      if (!response.ok) {
        const shouldRetry = this.isTransientStatus(response.status) && attempt < maxAttempts
        if (shouldRetry) {
          await this.sleep(baseDelayMs * attempt)
          continue
        }
        throw new Error(`Gemini API respondeu ${response.status}: ${raw}`)
      }

      let parsed: GeminiApiResponse
      try {
        parsed = JSON.parse(raw) as GeminiApiResponse
      } catch {
        throw new Error('Não foi possível interpretar a resposta JSON do Gemini.')
      }

      if (parsed.error?.message) {
        const shouldRetry = this.isTransientStatus(503) && attempt < maxAttempts
        if (shouldRetry) {
          await this.sleep(baseDelayMs * attempt)
          continue
        }
        throw new Error(`Gemini API retornou erro: ${parsed.error.message}`)
      }

      const text =
        parsed.candidates?.[0]?.content?.parts
          ?.map((part) => part.text ?? '')
          .join('')
          .trim() ?? ''

      if (!text) {
        throw new Error('Gemini não retornou conteúdo textual para a análise.')
      }

      return text
    }

    throw new Error('Falha ao obter resposta do Gemini após novas tentativas.')
  }

  private parseGeminiResult(rawText: string): BetImageAnalysisResult {
    const jsonPayload = this.extractJson(rawText)

    if (!jsonPayload) {
      return {
        homeTeam: null,
        awayTeam: null,
        market: null,
        odd: null,
        units: null,
        sport: null,
        notes: `Gemini retornou uma resposta não estruturada: ${rawText.slice(0, 500)}`,
      }
    }

    const normalizeString = (value: unknown): string | null => {
      if (typeof value === 'string') {
        const trimmed = value.trim()
        return trimmed.length ? trimmed : null
      }
      return null
    }

    const normalizeOdd = (value: unknown): number | null => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value
      }
      if (typeof value === 'string') {
        const numeric = Number(value.replace(',', '.'))
        return Number.isFinite(numeric) ? numeric : null
      }
      return null
    }

    return {
      homeTeam: normalizeString(jsonPayload.homeTeam),
      awayTeam: normalizeString(jsonPayload.awayTeam),
      market: normalizeString(jsonPayload.market),
      odd: normalizeOdd(jsonPayload.odd),
      units: normalizeOdd(jsonPayload.units),
      sport: normalizeString(jsonPayload.sport),
      notes:
        normalizeString(jsonPayload.notes) ??
        'Resultado fornecido pela API Gemini com prompt dirigido a apostas esportivas.',
    }
  }

  private extractJson(text: string): Record<string, unknown> | null {
    const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
    const candidate = fencedMatch ? fencedMatch[1] : text

    try {
      return JSON.parse(candidate)
    } catch {
      return null
    }
  }

  private normalizeModelName(model: string): string {
    const trimmed = model.trim()
    const withoutProjects = trimmed.replace(
      /^projects\/[^/]+\/locations\/[^/]+\/publishers\/google\/models\//i,
      ''
    )
    const withoutPrefix = withoutProjects.replace(/^models\//i, '')
    const withoutSuffix = withoutPrefix.replace(/:generateContent$/i, '')
    return withoutSuffix
  }

  private async readBase64(resolvedPath: string): Promise<string> {
    const buffer = await fs.readFile(resolvedPath)
    return buffer.toString('base64')
  }

  private getMimeType(resolvedPath: string): string {
    const ext = path.extname(resolvedPath).toLowerCase()
    const mimeType = MIME_TYPES[ext]
    if (!mimeType) {
      throw new Error(
        `Formato de imagem não suportado (${ext || 'sem extensão'}). Use png, jpg ou webp.`
      )
    }
    return mimeType
  }

  private buildPrompt(contextText?: string): string {
    const parts = [
      'Act like um assistente especialista em apostas esportivas e extração estruturada a partir de imagens (prints).',
      '',
      'Objetivo: Dado UM print (imagem) de uma aposta, extrair os dados e devolver SOMENTE um JSON válido, exatamente com este schema (sem chaves extras):',
      '{ "homeTeam": string|null, "awayTeam": string|null, "market": string|null, "odd": number|null, "units": number|null, "sport": string|null, "notes": string|null }',
      '',
      'Tarefa (siga em passos):',
      '1) Valide o conteúdo: determine se a imagem é realmente um print/comprovante/slip de aposta (casa de apostas, odds, seleção, stake, cupom). Se NÃO for, retorne todos os campos como null e em "notes" explique o motivo.',
      '2) Se for aposta simples, identifique homeTeam e awayTeam (times/jogadores/equipes). Se não aparecerem claramente, use null.',
      '3) Se for aposta múltipla/accumulator, use literalmente o valor "multipla" para homeTeam, awayTeam e market.',
      '4) Extraia "odd" como número. Aceite vírgula ou ponto na leitura, mas no JSON devolva como number (use virgula como separador decimal). Se não houver odd, null.',
      '5) Extraia "units" como número (unidades apostado), priorize os valores na legenda. Ignore moeda/símbolos; se não houver, utilize 1.',
      '6) "sport": use APENAS o texto adicional fora do slip (ex.: legenda do print, texto da conversa). Não deduza pelo slip. Se não existir texto adicional com o esporte, retorne null.',
      '7) "notes": descreva brevemente de onde veio cada dado (ex.: “slip”, “comprovante”, “interface do app”) e se houve ambiguidade.',
      '',
      'Regras para "market" (normalização obrigatória):',
      '- Deve ser genérico e categorizável (sem números, linhas, tempo exato ou placar).',
      '- Deve estar em inglês (ex.: use "Over kills", não "Mais de abates").',
      '- Exemplos corretos: Over kills, Under kills, Over time, Over maps, Under maps, Handicap de kills.',
      '- Exemplos incorretos: Over 25 kills, Over 23:59 minutes.',

      '',
      'Saída:',
      '- Retorne apenas o JSON (sem markdown, sem texto extra).',
      '- Use null quando não encontrar um campo; nunca “chute”.',
      '- Autochecagem final: JSON válido, aspas duplas, sem trailing commas, sem campos extras.',
    ]

    if (contextText && contextText.trim()) {
      parts.push(
        'Texto adicional enviado junto com a imagem (pode indicar se é aposta simples ou dupla e o esporte):',
        contextText.trim()
      )
    }

    return parts.join('\n')
  }

  private async ensureImageReadable(resolvedPath: string) {
    const stat = await fs.stat(resolvedPath)
    if (!stat.isFile()) {
      throw new Error(`O caminho informado não é um arquivo: ${resolvedPath}`)
    }

    if (!MIME_TYPES[path.extname(resolvedPath).toLowerCase()]) {
      throw new Error(
        'Formato de imagem não suportado. Utilize png, jpg, jpeg ou webp para análise com Gemini.'
      )
    }
  }

  private isTransientStatus(status: number): boolean {
    return [429, 500, 502, 503, 504].includes(status)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
