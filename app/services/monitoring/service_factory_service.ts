import SheetsUpdateService from '#services/monitoring/sheets_update_service'

type ChatIdentifier = string | number | null | undefined

export default class MonitoringServiceFactory {
  private sheetsCache = new Map<string, SheetsUpdateService>()

  /**
   * Retorna a service de escrita de planilha apropriada para o chat.
   * Usa exclusivamente o chatId como chave de roteamento.
   */
  getSheetsUpdater(args: { chatId?: ChatIdentifier }): SheetsUpdateService {
    const key = this.normalizeIdentifier(args.chatId) ?? 'default'

    switch (key) {
      // Exemplo de roteamento específico por chat:
      case '-4620692690':
        return this.getOrCreate('vip-room', SheetsUpdateService)
      default:
        return this.getOrCreate('default', SheetsUpdateService)
    }
  }

  private getOrCreate(key: string, Factory: new () => SheetsUpdateService): SheetsUpdateService {
    const existing = this.sheetsCache.get(key)
    if (existing) return existing

    const instance = new Factory()
    this.sheetsCache.set(key, instance)
    return instance
  }

  private normalizeIdentifier(identifier: ChatIdentifier): string | null {
    if (identifier === null || typeof identifier === 'undefined') return null
    const str = identifier.toString().trim()
    return str.length ? str : null
  }
}
