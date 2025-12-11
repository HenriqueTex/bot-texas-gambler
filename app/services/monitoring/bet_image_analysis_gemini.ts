import env from '#start/env'
import type { BetImageAnalysisResult } from '#services/monitoring/bet_image_analysis'
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

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const raw = await response.text()

    if (!response.ok) {
      throw new Error(`Gemini API respondeu ${response.status}: ${raw}`)
    }

    let parsed: GeminiApiResponse
    try {
      parsed = JSON.parse(raw) as GeminiApiResponse
    } catch {
      throw new Error('Não foi possível interpretar a resposta JSON do Gemini.')
    }

    if (parsed.error?.message) {
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

  private parseGeminiResult(rawText: string): BetImageAnalysisResult {
    const jsonPayload = this.extractJson(rawText)

    if (!jsonPayload) {
      return {
        homeTeam: null,
        awayTeam: null,
        market: null,
        odd: null,
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
      'Você é um assistente de apostas esportivas.',
      'Dado o print da aposta, extraia as seguintes informações e retorne SOMENTE um JSON válido:',
      '{ "homeTeam": string|null, "awayTeam": string|null, "market": string|null, "odd": number|null, "notes": string|null }',
      'Se não encontrar algum campo, use null.',
      'A odd deve ser numérica (ponto ou vírgula são aceitos).',
      'Use "notes" para explicar brevemente de onde veio o dado (ex: slip, comprovante, etc).',
      'Analise se a imagem é realmente um print de aposta e, se não for, retorne todos os campos como null com uma nota explicativa.',
      'Retorne o campo de market como um campo textual que descreva o tipo de aposta (ex: "Moneyline","Handicap Asiatico", "Escanteios", "kills", etc).',
    ]

    if (contextText && contextText.trim()) {
      parts.push(
        'Texto adicional enviado junto com a imagem (pode indicar se é aposta simples ou dupla):',
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
}
