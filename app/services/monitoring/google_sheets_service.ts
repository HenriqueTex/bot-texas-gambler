import env from '#start/env'
import { google, sheets_v4 } from 'googleapis'

type SheetValue = string | number | boolean | null

export default class GoogleSheetsService {
  private readonly sheets: sheets_v4.Sheets
  private readonly defaultSpreadsheetId: string

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

    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption,
      requestBody: {
        values: this.normalizeValues(values),
      },
    })
  }

  async appendRows(
    range: string,
    values: SheetValue[][],
    options?: { spreadsheetId?: string; valueInputOption?: 'RAW' | 'USER_ENTERED' }
  ): Promise<void> {
    const spreadsheetId = this.resolveSpreadsheetId(options?.spreadsheetId)
    const valueInputOption = options?.valueInputOption ?? 'USER_ENTERED'

    await this.sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption,
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: this.normalizeValues(values),
      },
    })
  }

  async clear(range: string, spreadsheetId?: string): Promise<void> {
    const resolvedId = this.resolveSpreadsheetId(spreadsheetId)

    await this.sheets.spreadsheets.values.clear({
      spreadsheetId: resolvedId,
      range,
    })
  }

  private normalizePrivateKey(rawKey: string): string {
    return rawKey.replace(/\\n/g, '\n')
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
}
