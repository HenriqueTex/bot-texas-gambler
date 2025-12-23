import type { BetImageAnalysisResult } from '#services/monitoring/bet_image_analysis_service'
import PhotoMessageAnalysisService from '#services/monitoring/photo_message_analysis_service'
import MarketResolverService from '#services/monitoring/market_resolver_service'
import SheetMapFactoryService from '#services/monitoring/sheet_map_factory_service'
import TextMessageAnalysisService from '#services/monitoring/text_message_analysis_service'
import Bet from '#models/bet'
import type { Telegraf as TelegrafInstance } from 'telegraf'

type HandleArgs = {
  bot: TelegrafInstance
  ctx: any
  message: any
}

export default class MessageHandlerService {
  private readonly photoAnalyzer = new PhotoMessageAnalysisService()
  private readonly textAnalyzer = new TextMessageAnalysisService()
  private readonly marketResolver = new MarketResolverService()
  private readonly sheetFactory = new SheetMapFactoryService()

  async handle({ bot, ctx, message }: HandleArgs): Promise<void> {
    const messageText = this.extractMessageText(message)
    let imgResult: BetImageAnalysisResult | null = null
    console.log(message)

    if (!message.photo && !messageText) {
      console.log('Mensagem ignorada: sem foto ou texto.')
      return
    }

    imgResult = await this.photoAnalyzer.analyze(bot, message, messageText)

    if (!imgResult) {
      console.log('Nenhuma análise de imagem realizada ou reconhecida.')
      return
    }
    console.log('Análise de imagem concluída.')
    console.log('Resultado Gemini:', imgResult)

    if (imgResult.market) {
      const resolved = await this.marketResolver.resolveMarket(imgResult.market)

      const resolvedName = resolved.market?.name ?? imgResult.market
      imgResult = { ...imgResult, market: resolvedName, marketId: resolved.market?.id ?? null }
    }

    console.log('Mercado resolvido:', imgResult)
    if (imgResult) {
      const bet = await Bet.create({
        homeTeam: imgResult.homeTeam,
        awayTeam: imgResult.awayTeam,
        marketId: imgResult.marketId ?? null,
        odd: imgResult.odd,
        units: imgResult.units ?? null,
        messageId: message.message_id?.toString() ?? null,
        chatId: message.chat?.id?.toString() ?? 'unknown',
      })

      const sheetService = this.sheetFactory.getSheetService({
        chatId: message.chat?.id ?? null,
      })
      const status = await sheetService.createLine(message, imgResult, bet)
      console.log(`Sheet service status: ${status}`)
    }
    console.log('Aposta registrada no banco de dados.')
  }

  private extractMessageText(message: { text?: string; caption?: string }): string {
    return (message.text ?? message.caption ?? '').toString()
  }
}
