import type { BetImageAnalysisResult } from '#services/monitoring/bet_image_analysis_service'
import Bet from '#models/bet'
import TexasSheetService from '#services/sheet_maps/texas_sheet_service'

type ChatIdentifier = string | number | null | undefined

export type SheetMapService = {
  createLine(
    message: unknown,
    imgResult: BetImageAnalysisResult,
    bet: Bet
  ): Promise<'success' | 'skipped' | 'error'>
  updateLine(
    message: unknown,
    imgResult: BetImageAnalysisResult,
    bet: Bet
  ): Promise<'success' | 'skipped' | 'error'>
}

export default class SheetMapFactoryService {
  private sheetsCache = new Map<string, SheetMapService>()

  /**
   * Retorna a service de escrita de planilha apropriada para o chat.
   * Usa exclusivamente o chatId como chave de roteamento.
   */
  getSheetService(args: { chatId?: ChatIdentifier }): SheetMapService {
    const key = this.normalizeIdentifier(args.chatId) ?? 'default'

    switch (key) {
      // Exemplo de roteamento específico por chat:
      case '-4620692690':
        return new TexasSheetService()
      default:
        return this.getOrCreate('default', TexasSheetService)
    }
  }

  private getOrCreate(key: string, Factory: new () => SheetMapService): SheetMapService {
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
