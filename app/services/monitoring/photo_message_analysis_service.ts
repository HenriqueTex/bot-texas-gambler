import GeminiBetImageAnalysisService from '#services/monitoring/bet_image_analysis_gemini_service'
import type { BetImageAnalysisResult } from '#services/monitoring/bet_image_analysis_service'
import type { Telegraf as TelegrafInstance } from 'telegraf'
import type { PhotoSize } from '@telegraf/types'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

export default class PhotoMessageAnalysisService {
  private tempDir?: string
  private readonly analyzer: GeminiBetImageAnalysisService

  constructor(analyzer = new GeminiBetImageAnalysisService()) {
    this.analyzer = analyzer
  }

  /**
   * Faz download da melhor resolução da foto recebida e envia para análise via Gemini.
   */
  async analyze(
    bot: TelegrafInstance,
    message: { photo?: PhotoSize[]; text?: string; caption?: string },
    textContext?: string
  ): Promise<BetImageAnalysisResult> {
    const photos = message.photo ?? []
    if (!photos.length) {
      throw new Error('Nenhuma foto encontrada na mensagem.')
    }

    const best = this.pickBestPhoto(photos)
    const fileUrl = await bot.telegram.getFileLink(best.file_id)
    let localPath: string | null = null

    const context = textContext && textContext.trim().length > 0 ? textContext : undefined

    try {
      localPath = await this.downloadToTemp(fileUrl.toString(), '.jpg')
      return await this.analyzer.analyze(localPath, { contextText: context })
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error(`Falha ao analisar foto: ${msg}`)
      return {
        homeTeam: null,
        awayTeam: null,
        market: null,
        odd: null,
        units: null,
        sport: null,
        notes: `Falha ao analisar foto: ${msg}`,
      }
    } finally {
      if (localPath) {
        await fs.unlink(localPath).catch(() => {
          /* ignore cleanup errors */
        })
      }
    }
  }

  private pickBestPhoto(photos: PhotoSize[]): PhotoSize {
    return photos.reduce((best, current) => {
      const bestPixels = (best.width ?? 0) * (best.height ?? 0)
      const currentPixels = (current.width ?? 0) * (current.height ?? 0)
      return currentPixels > bestPixels ? current : best
    })
  }

  private async downloadToTemp(fileUrl: string, fallbackExt: string): Promise<string> {
    const response = await fetch(fileUrl)
    if (!response.ok) {
      throw new Error(
        `Falha ao baixar a imagem do Telegram (${response.status} ${response.statusText})`
      )
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    const ext = this.extractExtensionFromUrl(fileUrl) ?? fallbackExt
    const dir = await this.ensureTempDir()
    const tempPath = path.join(dir, `${crypto.randomUUID()}${ext}`)
    await fs.writeFile(tempPath, buffer)
    return tempPath
  }

  private extractExtensionFromUrl(fileUrl: string): string | null {
    const { pathname } = new URL(fileUrl)
    const ext = path.extname(pathname)
    return ext || null
  }

  private async ensureTempDir(): Promise<string> {
    if (this.tempDir) {
      return this.tempDir
    }
    const dir = path.join(os.tmpdir(), 'bot-texas-gambler')
    await fs.mkdir(dir, { recursive: true })
    this.tempDir = dir
    return dir
  }
}
