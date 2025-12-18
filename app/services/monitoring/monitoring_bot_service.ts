import type { BetImageAnalysisResult } from '#services/monitoring/bet_image_analysis_service'
import PhotoMessageAnalysisService from '#services/monitoring/photo_message_analysis_service'
import MarketResolverService from '#services/monitoring/market_resolver_service'
import SheetMapFactoryService from '#services/monitoring/sheet_map_factory_service'
import TextMessageAnalysisService from '#services/monitoring/text_message_analysis_service'
import Bet from '#models/bet'
import { Telegraf } from 'telegraf'
import type { Telegraf as TelegrafInstance } from 'telegraf'

export default class MonitoringBotService {
  private readonly photoAnalyzer = new PhotoMessageAnalysisService()
  private readonly textAnalyzer = new TextMessageAnalysisService()
  private readonly marketResolver = new MarketResolverService()
  private readonly serviceFactory = new SheetMapFactoryService()

  async run(token: string): Promise<TelegrafInstance> {
    const bot = new Telegraf(token)

    bot.on('message', async (ctx) => {
      const message: any = ctx.message
      const messageText = this.extractMessageText(message)
      let imgResult: BetImageAnalysisResult | null = null
      // console.log(message)

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
        await Bet.create({
          homeTeam: imgResult.homeTeam,
          awayTeam: imgResult.awayTeam,
          marketId: imgResult.marketId ?? null,
          odd: imgResult.odd,
          chatId: message.chat?.id?.toString() ?? 'unknown',
        })

        const sheetService = this.serviceFactory.getSheetService({
          chatId: message.chat?.id ?? null,
        })
        const status = await sheetService.handle(message, imgResult)
        console.log(`Sheet service status: ${status}`)
      }
      console.log('Aposta registrada no banco de dados.')
    })

    await bot.launch()
    return bot
  }

  private extractMessageText(message: { text?: string; caption?: string }): string {
    return (message.text ?? message.caption ?? '').toString()
  }
}
