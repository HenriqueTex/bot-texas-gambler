import type { BetImageAnalysisResult } from '#services/monitoring/bet_image_analysis'
import PhotoMessageAnalysisService from '#services/monitoring/photo_message_analysis_service'
import MarketResolverService from '#services/monitoring/market_resolver_service'
import MonitoringServiceFactory from '#services/monitoring/service_factory'
import TextMessageAnalysisService from '#services/monitoring/text_message_analysis_service'
import { Telegraf } from 'telegraf'
import type { Telegraf as TelegrafInstance } from 'telegraf'

export default class MonitoringBotService {
  private readonly photoAnalyzer = new PhotoMessageAnalysisService()
  private readonly textAnalyzer = new TextMessageAnalysisService()
  private readonly marketResolver = new MarketResolverService()
  private readonly serviceFactory = new MonitoringServiceFactory()

  async run(token: string): Promise<TelegrafInstance> {
    const bot = new Telegraf(token)

    bot.on('message', async (ctx) => {
      const message: any = ctx.message
      const messageText = this.extractMessageText(message)
      let imgResult: BetImageAnalysisResult | null = null
      let units: number | null = null

      if (messageText) {
        const textAnalysis = await this.textAnalyzer.analyzeFromText(messageText)
        units = textAnalysis.units
        if (units !== null) console.log(`Unidades detectadas: ${units}`)
      }

      if (message.photo) {
        imgResult = await this.photoAnalyzer.analyze(bot, message, messageText)
        if (imgResult) {
          console.log('Resultado Gemini:', imgResult)
          if (imgResult.market) {
            const resolved = await this.marketResolver.resolveMarket(imgResult.market)
            const resolvedName = resolved.market?.name ?? imgResult.market
            if (resolvedName !== imgResult.market) {
              console.log(`Mercado normalizado: ${imgResult.market} -> ${resolvedName}`)
            }
            imgResult = { ...imgResult, market: resolvedName }
          }
        }
      }

      // try {
      //   const sheetsUpdater = this.serviceFactory.getSheetsUpdater({
      //     chatId: message.chat?.id ?? null,
      //   })

      //   await sheetsUpdater.writeAnalysis({
      //     telegramChatId: message.chat?.id ?? null,
      //     imgResult,
      //     units,
      //     rawText: messageText,
      //     messageId: message.message_id,
      //     sentAt: message.date ? new Date(message.date * 1000) : null,
      //   })
      //   console.log('Planilha atualizada com análise da mensagem.')
      // } catch (error) {
      //   const msg = error instanceof Error ? error.message : String(error)
      //   console.error(`Falha ao escrever na planilha: ${msg}`)
      // }
    })

    await bot.launch()
    return bot
  }

  private extractMessageText(message: { text?: string; caption?: string }): string {
    return (message.text ?? message.caption ?? '').toString()
  }
}
