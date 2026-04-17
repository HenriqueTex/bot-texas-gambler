import type { BetImageAnalysisResult } from '#services/monitoring/bet_image_analysis_service'
import Sheet from '#models/sheet'
import Bet from '#models/bet'
import SheetErrorLog from '#models/sheet_error_log'
import { formatUnit } from '../../utils/odd_formatter.js'
import GoogleSheetsService from '#services/monitoring/google_sheets_service'

export default class TexasSheetService {
  private readonly betFirstRow = 25
  private readonly sheets = new GoogleSheetsService()

  // Per-sheet write queue to prevent race conditions on currentRow
  private static readonly rowLocks = new Map<number, Promise<unknown>>()

  private withSheetLock<T>(sheetId: number, fn: () => Promise<T>): Promise<T> {
    const prev = TexasSheetService.rowLocks.get(sheetId) ?? Promise.resolve()
    let release!: () => void
    const gate = new Promise<void>((r) => {
      release = r
    })
    TexasSheetService.rowLocks.set(sheetId, gate)
    return prev.then(() => fn()).finally(() => release())
  }

  async createLine(
    message: unknown,
    imgResult: BetImageAnalysisResult,
    bet: Bet
  ): Promise<'success' | 'skipped' | 'error'> {
    const chatId = this.extractChatId(message)
    if (!chatId) return 'skipped'

    const sheet = await Sheet.query()
      .whereHas('chat', (q) => q.where('telegram_chat_id', chatId.toString()))
      .where('active', true)
      .first()
    if (!sheet) return 'skipped'

    return this.withSheetLock(sheet.id, async () => {
      await sheet.refresh()
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
        bet.id,
        forwardTitle,
        '',
        homeAway,
        imgResult.market ?? '',
        '',
        this.formatUnitForSheet(imgResult.units ?? ''),
        this.formatOddForSheet(imgResult.odd ?? ''),
      ]

      try {
        const range = `${sheetName}!A${row}:I${row}`
        await this.sheets.updateRange(range, [values], {
          spreadsheetId: sheet.spreadsheetId,
          valueInputOption: 'USER_ENTERED',
        })

        sheet.currentRow = row + 1
        await sheet.save()
        bet.sheetRow = row
        await bet.save()

        return 'success'
      } catch (error) {
        await this.logSheetError(bet.id, error)
        console.error('Falha ao escrever na planilha Texas:', error)
        return 'error'
      }
    })
  }

  async updateLine(
    message: unknown,
    imgResult: BetImageAnalysisResult,
    bet: Bet
  ): Promise<'success' | 'skipped' | 'error'> {
    await bet.load('market')
    const chatId = this.extractChatId(message)
    if (!chatId) return 'skipped'

    const sheet = await Sheet.query()
      .whereHas('chat', (q) => q.where('telegram_chat_id', chatId.toString()))
      .where('active', true)
      .first()
    if (!sheet) return 'skipped'

    const targetRow = await this.resolveRow(sheet, bet)
    if (!targetRow) return 'skipped'

    const sheetName = this.escapeSheetName(sheet.sheetName || 'Sheet1')
    const forwardTitle =
      (message as any)?.forward_origin?.chat?.title ??
      (message as any)?.forward_from_chat?.title ??
      'TexasTips'

    const homeTeam = imgResult.homeTeam ?? bet.homeTeam ?? ''
    const awayTeam = imgResult.awayTeam ?? bet.awayTeam ?? ''
    const homeAway = homeTeam && awayTeam ? `${homeTeam} - ${awayTeam}` : homeTeam || awayTeam

    const resultText = this.mapResultToText(bet.result)

    const values = [
      this.formatDate(new Date()),
      bet.id,
      forwardTitle,
      '',
      homeAway,
      imgResult.market ?? bet?.market?.name ?? '',
      '',
      this.formatUnitForSheet(imgResult.units ?? bet.units ?? ''),
      this.formatOddForSheet(imgResult.odd ?? bet.odd ?? ''),
      resultText,
    ]

    try {
      const range = `${sheetName}!A${targetRow}:J${targetRow}`
      await this.sheets.updateRange(range, [values], {
        spreadsheetId: sheet.spreadsheetId,
        valueInputOption: 'USER_ENTERED',
      })
      bet.sheetRow = targetRow
      await bet.save()
      return 'success'
    } catch (error) {
      await this.logSheetError(bet.id, error)
      console.error('Falha ao atualizar linha na planilha Texas:', error)
      return 'error'
    }
  }

  private extractChatId(message: unknown): number | null {
    if (!message || typeof message !== 'object') return null
    const rawId = (message as { chat?: { id?: number | string } }).chat?.id
    if (rawId === null || typeof rawId === 'undefined') return null
    const num = Number(rawId)
    return Number.isFinite(num) ? num : null
  }

  private formatDate(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0')
    const day = pad(date.getDate())
    const month = pad(date.getMonth() + 1)
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  private formatUnitForSheet(unit: number | string | null | undefined): string {
    if (unit === null || typeof unit === 'undefined') return ''
    const str = unit.toString()
    return str.replace('.', ',')
  }

  private formatOddForSheet(odd: number | string | null | undefined): string {
    if (odd === null || typeof odd === 'undefined') return ''
    const str = odd.toString()
    return str.replace('.', ',')
  }

  private escapeSheetName(name: string): string {
    const cleaned = name.replace(/'/g, "''")
    return `'${cleaned}'`
  }

  private mapResultToText(
    result: 'green' | 'red' | 'half green' | 'half red' | 'void' | null | undefined
  ): string {
    switch (result) {
      case 'green':
        return 'Certo'
      case 'red':
        return 'Errado'
      case 'half green':
        return 'meio certo'
      case 'half red':
        return 'meio errado'
      case 'void':
        return 'void'
      default:
        return ''
    }
  }

  private async resolveRow(sheet: Sheet, bet: Bet): Promise<number | null> {
    if (bet.sheetRow) {
      const sheetName = this.escapeSheetName(sheet.sheetName || 'Sheet1')
      const range = `${sheetName}!B${bet.sheetRow}`
      const values = await this.sheets.getRange(range, { spreadsheetId: sheet.spreadsheetId })
      const cell = values?.[0]?.[0]
      if (cell && cell.toString() === bet.id.toString()) {
        return bet.sheetRow
      }
    }

    // Fallback: buscar na coluna B
    const sheetName = this.escapeSheetName(sheet.sheetName || 'Sheet1')
    const range = `${sheetName}!B:B`
    const values = await this.sheets.getRange(range, { spreadsheetId: sheet.spreadsheetId })
    for (const [i, value] of values.entries()) {
      const cell = value?.[0]
      if (cell && cell.toString() === bet.id.toString()) {
        // Linhas são 1-based
        return i + 1
      }
    }

    return null
  }

  private async logSheetError(betId: number, error: unknown): Promise<void> {
    const message = this.formatErrorMessage(error)
    try {
      await SheetErrorLog.create({ betId, errorMessage: message })
    } catch (logError) {
      console.error('Falha ao salvar log de erro da planilha:', logError)
    }
  }

  private formatErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message
    if (typeof error === 'string') return error
    try {
      return JSON.stringify(error)
    } catch {
      return String(error)
    }
  }
}
