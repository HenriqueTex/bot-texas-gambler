import type { BetImageAnalysisResult } from '#services/monitoring/bet_image_analysis_service'
import Sheet from '#models/sheet'
import { normalizeText } from '../../utils/text_normalizer.js'
import GoogleSheetsService from '#services/monitoring/google_sheets_service'

export default class TexasSheetService {
  private readonly betFirstRow = 25
  private readonly sheets = new GoogleSheetsService()

  async handle(
    message: unknown,
    imgResult: BetImageAnalysisResult
  ): Promise<'success' | 'skipped' | 'error'> {
    const chatId = this.extractChatId(message)
    if (!chatId) return 'skipped'

    const sheet = await Sheet.query().where('chatId', 1).where('active', true).first()
    if (!sheet) return 'skipped'

    const row = sheet.currentRow ?? this.betFirstRow
    const sheetName = this.escapeSheetName(sheet.sheetName || 'Sheet1')

    const forwardTitle =
      (message as any)?.forward_origin?.chat?.title ??
      (message as any)?.forward_from_chat?.title ??
      'TexasTips'

    const homeAway =
      imgResult.homeTeam && imgResult.awayTeam
        ? `${imgResult.homeTeam} - ${imgResult.awayTeam}`
        : (imgResult.homeTeam ?? imgResult.awayTeam ?? '')

    const values = [
      this.formatDate(new Date()),
      forwardTitle,
      '', // coluna C vazia
      homeAway,
      imgResult.market ?? '',
      '', // coluna F vazia
      imgResult.units ?? '',
      imgResult.odd ?? '',
    ]

    try {
      const range = `${sheetName}!A${row}:H${row}`
      await this.sheets.updateRange(range, [values], {
        spreadsheetId: sheet.spreadsheetId,
        valueInputOption: 'USER_ENTERED',
      })

      sheet.currentRow = row + 1
      await sheet.save()

      return 'success'
    } catch (error) {
      console.log('Erro ao escrever na planilha Texas:', error)
      console.error('Falha ao escrever na planilha Texas:', error)
      return 'error'
    }
  }

  private extractChatId(message: unknown): number | null {
    if (!message || typeof message !== 'object') return null
    const anyMsg = message as { chat?: { id?: number | string } }
    const rawId = anyMsg.chat?.id
    if (rawId === null || typeof rawId === 'undefined') return null
    const normalized = normalizeText(rawId.toString())
    return normalized ? Number(rawId) : null
  }

  private formatDate(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0')
    const day = pad(date.getDate())
    const month = pad(date.getMonth() + 1)
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  private escapeSheetName(name: string): string {
    const cleaned = name.replace(/'/g, "''")
    return `'${cleaned}'`
  }
}
