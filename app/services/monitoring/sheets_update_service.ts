import GoogleSheetsService from '#services/monitoring/google_sheets_service'

export default class SheetsUpdateService {
  private sheetsService?: GoogleSheetsService

  /**
   * Exemplo de escrita: atualiza a célula C26 com um timestamp de teste.
   */
  async writeTestTimestamp(): Promise<void> {
    const sheets = this.ensureSheetsService()
    await sheets.updateRange('C26', [[`Bot test ${new Date().toISOString()}`]])
  }

  private ensureSheetsService(): GoogleSheetsService {
    if (!this.sheetsService) {
      this.sheetsService = new GoogleSheetsService()
    }
    return this.sheetsService
  }
}
