import type { BetImageAnalysisResult } from '#services/monitoring/bet_image_analysis_service'
import PhotoMessageAnalysisService from '#services/monitoring/photo_message_analysis_service'
import MarketResolverService from '#services/monitoring/market_resolver_service'
import SheetMapFactoryService from '#services/monitoring/sheet_map_factory_service'
import TextMessageAnalysisService from '#services/monitoring/text_message_analysis_service'
import MessageEditHandlerService from '#services/monitoring/message_edit_handler_service'
import MessageHandlerService from '#services/monitoring/message_handler_service'
import Bet from '#models/bet'
import { Telegraf } from 'telegraf'
import type { Telegraf as TelegrafInstance } from 'telegraf'

export default class MonitoringBotService {
  private readonly photoAnalyzer = new PhotoMessageAnalysisService()
  private readonly textAnalyzer = new TextMessageAnalysisService()
  private readonly marketResolver = new MarketResolverService()
  private readonly serviceFactory = new SheetMapFactoryService()
  private readonly messageHandler = new MessageHandlerService()
  private readonly messageEditHandler = new MessageEditHandlerService()

  async run(token: string): Promise<TelegrafInstance> {
    const bot = new Telegraf(token)

    bot.on('message', async (ctx) => {
      await this.messageHandler.handle({
        bot,
        ctx,
        message: ctx.message as any,
      })
    })

    bot.on('edited_message', async (ctx) => {
      const message: any = ctx.editedMessage
      console.log('Mensagem editada recebida:', message)
      await this.messageEditHandler.handle({ message })
    })

    await bot.launch()
    return bot
  }

  private extractMessageText(message: { text?: string; caption?: string }): string {
    return (message.text ?? message.caption ?? '').toString()
  }
}
