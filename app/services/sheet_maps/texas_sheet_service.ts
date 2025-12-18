import type { BetImageAnalysisResult } from '#services/monitoring/bet_image_analysis_service'
import Sheet from '#models/sheet'
import { normalizeText } from '#utils/text_normalizer'

export default class TexasSheetService {
  async handle(
    message: unknown,
    imgResult: BetImageAnalysisResult
  ): Promise<'success' | 'skipped' | 'error'> {
    const chatId = this.extractChatId(message)
    if (!chatId) return 'skipped'

    const sheet = await Sheet.query().where('chatId', chatId).where('active', true).first()
    if (!sheet) return 'skipped'

    // TODO: implementar escrita na planilha usando sheet.spreadsheetId/sheetName/currentRow
    console.log('TexasSheetService pronto para escrever', {
      chatId,
      sheetId: sheet.id,
      spreadsheet: sheet.spreadsheetId,
      sheetName: sheet.sheetName,
      currentRow: sheet.currentRow,
      imgResult,
    })

    return 'success'
  }

  private extractChatId(message: unknown): number | null {
    if (!message || typeof message !== 'object') return null
    const anyMsg = message as { chat?: { id?: number | string } }
    const rawId = anyMsg.chat?.id
    if (rawId === null || typeof rawId === 'undefined') return null
    const normalized = normalizeText(rawId.toString())
    return normalized ? Number(rawId) : null
  }
}
