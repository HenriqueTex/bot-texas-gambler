import env from '#start/env'
import { google, sheets_v4 } from 'googleapis'

type SheetValue = string | number | boolean | null

export default class GoogleSheetsService {
  private readonly sheets: sheets_v4.Sheets
  private readonly defaultSpreadsheetId: string
  private readonly maxAttempts = 3
  private readonly baseDelayMs = 800
  private readonly maxDelayMs = 10_000

  constructor(options?: { spreadsheetId?: string }) {
    const clientEmail = env.get('GOOGLE_SHEETS_CLIENT_EMAIL')
    const privateKey = env.get('GOOGLE_SHEETS_PRIVATE_KEY')
    const spreadsheetId = options?.spreadsheetId ?? env.get('GOOGLE_SHEETS_SPREADSHEET_ID')

    if (!clientEmail || !privateKey) {
      throw new Error(
        'Configure GOOGLE_SHEETS_CLIENT_EMAIL e GOOGLE_SHEETS_PRIVATE_KEY para usar o Google Sheets.'
      )
    }

    if (!spreadsheetId) {
      throw new Error(
        'Configure GOOGLE_SHEETS_SPREADSHEET_ID ou informe um ID de planilha ao instanciar o serviço.'
      )
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: this.normalizePrivateKey(privateKey),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })

    this.sheets = google.sheets({ version: 'v4', auth })
    this.defaultSpreadsheetId = spreadsheetId
  }

  async updateRange(
    range: string,
    values: SheetValue[][],
    options?: { spreadsheetId?: string; valueInputOption?: 'RAW' | 'USER_ENTERED' }
  ): Promise<void> {
    const spreadsheetId = this.resolveSpreadsheetId(options?.spreadsheetId)
    const valueInputOption = options?.valueInputOption ?? 'USER_ENTERED'

    await this.withRetry(
      () =>
        this.sheets.spreadsheets.values.update({
          spreadsheetId,
          range,
          valueInputOption,
          requestBody: {
            values: this.normalizeValues(values),
          },
        }),
      'updateRange'
    )
  }

  async appendRows(
    range: string,
    values: SheetValue[][],
    options?: { spreadsheetId?: string; valueInputOption?: 'RAW' | 'USER_ENTERED' }
  ): Promise<void> {
    const spreadsheetId = this.resolveSpreadsheetId(options?.spreadsheetId)
    const valueInputOption = options?.valueInputOption ?? 'USER_ENTERED'

    await this.withRetry(
      () =>
        this.sheets.spreadsheets.values.append({
          spreadsheetId,
          range,
          valueInputOption,
          insertDataOption: 'INSERT_ROWS',
          requestBody: {
            values: this.normalizeValues(values),
          },
        }),
      'appendRows'
    )
  }

  async clear(range: string, spreadsheetId?: string): Promise<void> {
    const resolvedId = this.resolveSpreadsheetId(spreadsheetId)

    await this.withRetry(
      () =>
        this.sheets.spreadsheets.values.clear({
          spreadsheetId: resolvedId,
          range,
        }),
      'clear'
    )
  }

  private normalizePrivateKey(rawKey: string): string {
    return rawKey.replace(/\\n/g, '\n')
  }

  async getRange(
    range: string,
    options?: { spreadsheetId?: string }
  ): Promise<string[][]> {
    const spreadsheetId = this.resolveSpreadsheetId(options?.spreadsheetId)

    const res = await this.withRetry(
      () =>
        this.sheets.spreadsheets.values.get({
          spreadsheetId,
          range,
        }),
      'getRange'
    )

    return (res.data.values as string[][]) ?? []
  }

  private resolveSpreadsheetId(spreadsheetId?: string): string {
    const id = spreadsheetId ?? this.defaultSpreadsheetId
    if (!id) {
      throw new Error('Nenhum ID de planilha foi informado.')
    }
    return id
  }

  private normalizeValues(values: SheetValue[][]): (string | number | boolean)[][] {
    return values.map((row) =>
      row.map((value) => {
        if (value === null || typeof value === 'undefined') {
          return ''
        }
        return value
      })
    )
  }

  private async withRetry<T>(operation: () => Promise<T>, label: string): Promise<T> {
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        const shouldRetry = this.shouldRetry(error)
        if (!shouldRetry || attempt === this.maxAttempts) {
          throw error
        }
        const delay = this.nextDelay(attempt)
        console.warn(`[sheets] ${label} falhou (tentativa ${attempt}). Retentando em ${delay}ms.`)
        await this.sleep(delay)
      }
    }

    throw new Error(`[sheets] ${label} falhou apos novas tentativas.`)
  }

  private shouldRetry(error: unknown): boolean {
    const anyError = error as {
      code?: number
      message?: string
      errors?: { reason?: string }[]
      response?: { status?: number; data?: { error?: { errors?: { reason?: string }[] } } }
    }

    const status = anyError?.code ?? anyError?.response?.status
    if (status && [408, 429, 500, 502, 503, 504].includes(status)) {
      return true
    }

    const reasons =
      anyError?.errors ??
      anyError?.response?.data?.error?.errors ??
      []

    if (
      reasons.some((entry) =>
        ['rateLimitExceeded', 'userRateLimitExceeded', 'quotaExceeded'].includes(
          entry?.reason ?? ''
        )
      )
    ) {
      return true
    }

    const message = (anyError?.message ?? '').toString()
    if (/(ETIMEDOUT|ECONNRESET|ENOTFOUND|EAI_AGAIN|timeout)/i.test(message)) {
      return true
    }

    return false
  }

  private nextDelay(attempt: number): number {
    const base = Math.min(this.baseDelayMs * 2 ** (attempt - 1), this.maxDelayMs)
    const jitter = Math.floor(Math.random() * 200)
    return base + jitter
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
