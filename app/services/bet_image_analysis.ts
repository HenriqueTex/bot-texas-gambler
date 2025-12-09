import fs from 'node:fs/promises'
import path from 'node:path'
import Tesseract from 'tesseract.js'

export type BetImageAnalysisResult = {
  homeTeam: string | null
  awayTeam: string | null
  market: string | null
  odd: number | null
  notes?: string
}

type OcrLine = { text: string; confidence: number }

export default class BetImageAnalysisService {
  async analyze(imagePath: string): Promise<BetImageAnalysisResult> {
    const resolvedPath = path.resolve(imagePath)
    await this.ensureImageReadable(resolvedPath)

    const lines = await this.runOcr(resolvedPath)
    console.log(lines)
    const parsed = this.parseLines(lines)

    return {
      homeTeam: parsed.homeTeam,
      awayTeam: parsed.awayTeam,
      market: parsed.market,
      odd: parsed.odd,
      notes: parsed.notes,
    }
  }

  private async runOcr(resolvedPath: string): Promise<OcrLine[]> {
    const { data } = await Tesseract.recognize(resolvedPath, 'eng', {
      logger: () => {
        /* mute */
      },
    })

    if (!data?.lines) return []

    return data.lines
      .map((line) => ({ text: line.text.trim(), confidence: line.confidence ?? 0 }))
      .filter((l) => l.text.length > 0)
  }

  private parseLines(lines: OcrLine[]): BetImageAnalysisResult {
    if (!lines.length) {
      return {
        homeTeam: null,
        awayTeam: null,
        market: null,
        odd: null,
        notes: 'OCR não encontrou texto na imagem.',
      }
    }

    const text = lines.map((l) => l.text).join('\n')

    // Odd: primeiro decimal com 2 casas entre 1 e 500
    const oddMatch =
      [...text.matchAll(/(\d+(?:[.,]\d{2}))/g)]
        .map((m) => m[1].replace(',', '.'))
        .map(Number)
        .find((n) => Number.isFinite(n) && n >= 1 && n <= 500) ?? null

    // Times: pegue linhas com palavras (mínimo 2 caracteres) e sem prefixos de moeda.
    const candidateLines = lines
      .filter((l) => /^[A-Za-z0-9 .,'-]+$/.test(l.text))
      .map((l) => l.text)
      .filter((t) => !t.toLowerCase().startsWith('r$') && !t.match(/^\d/))

    let homeTeam: string | null = null
    let awayTeam: string | null = null

    // Heurística: prioriza linhas com separador "vs", "-", "@" entre times.
    const pairSeparator = /(?:\s+vs\.?\s+|\s+v\s+|[-–@])/i
    const pairLine = candidateLines.find((t) => pairSeparator.test(t))
    if (pairLine) {
      const parts = pairLine
        .split(/(?:\s+vs\.?\s+|\s+v\s+|[-–@])/i)
        .map((p) => p.trim())
        .filter(Boolean)
      homeTeam = parts[0] ?? null
      awayTeam = parts[1] ?? null
    } else {
      homeTeam = candidateLines[0] ?? null
      awayTeam = candidateLines[1] ?? null
    }

    const market =
      candidateLines.find((t) => /vencer|win|winner|moneyline|ml/i.test(t)) ??
      candidateLines[1] ??
      null

    return {
      homeTeam,
      awayTeam,
      market,
      odd: oddMatch,
      notes: 'Resultado baseado em OCR local (tesseract.js). Ajuste regras conforme necessário.',
    }
  }

  private async ensureImageReadable(resolvedPath: string) {
    const stat = await fs.stat(resolvedPath)
    if (!stat.isFile()) {
      throw new Error(`O caminho informado não é um arquivo: ${resolvedPath}`)
    }

    const allowed = new Set(['.png', '.jpg', '.jpeg', '.webp'])
    const ext = path.extname(resolvedPath).toLowerCase()
    if (!allowed.has(ext)) {
      throw new Error(
        `Formato de imagem não suportado (${ext || 'sem extensão'}). Use png, jpg ou webp.`
      )
    }
  }
}
