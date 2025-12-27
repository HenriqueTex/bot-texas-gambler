import type { BetImageAnalysisResult } from '#services/monitoring/bet_image_analysis_service'
import GeminiBetImageAnalysisService from '#services/monitoring/bet_image_analysis_gemini_service'
import PhotoMessageAnalysisService from '#services/monitoring/photo_message_analysis_service'
import MarketResolverService from '#services/monitoring/market_resolver_service'
import SheetMapFactoryService from '#services/monitoring/sheet_map_factory_service'
import MessageReplyHandlerService from '#services/monitoring/message_reply_handler_service'
import MessageClassifierService from '#services/monitoring/message_classifier_service'
import Bet from '#models/bet'
import type { Telegraf as TelegrafInstance } from 'telegraf'
import { formatOdd } from '../../utils/odd_formatter.js'

type HandleArgs = {
  bot: TelegrafInstance
  ctx: any
  message: any
}

export default class MessageHandlerService {
  private readonly photoAnalyzer = new PhotoMessageAnalysisService()
  private readonly geminiAnalyzer = new GeminiBetImageAnalysisService()
  private readonly marketResolver = new MarketResolverService()
  private readonly sheetFactory = new SheetMapFactoryService()
  private readonly replyHandler = new MessageReplyHandlerService()
  private readonly classifier = new MessageClassifierService()

  async handle({ bot, ctx, message }: HandleArgs): Promise<void> {
    if (this.isCommandMessage(message)) {
      return
    }

    if (message?.reply_to_message?.message_id) {
      await this.replyHandler.handle({ message })
      return
    }

    const messageText = this.extractMessageText(message)

    let imgResult: BetImageAnalysisResult | null = null

    console.log(message)

    if (!message.photo && !messageText) {
      console.log('Mensagem ignorada: sem foto ou texto.')
      return
    }

    const classification = this.classifier.classify(message, messageText)

    if (!classification.isBet) {
      console.log(
        `Mensagem ignorada: não identificada como aposta (conf=${classification.confidence.toFixed(
          2
        )}, reasons=${classification.reasons.join(',')})`
      )
      return
    }

    if (message?.photo?.length) {
      imgResult = await this.photoAnalyzer.analyze(bot, message, messageText)
    }

    if (!message?.photo?.length) {
      try {
        imgResult = await this.geminiAnalyzer.analyzeText(messageText)
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        console.error(`Falha ao analisar texto com Gemini: ${msg}`)
        imgResult = {
          homeTeam: null,
          awayTeam: null,
          market: null,
          odd: null,
          units: null,
          sport: null,
          notes: `Falha ao analisar texto com Gemini: ${msg}`,
        }
      }
    }

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
        odd: formatOdd(imgResult.odd),
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

  private isCommandMessage(message: { text?: string; photo?: unknown }): boolean {
    if (!message || !message.text || message.photo) {
      return false
    }
    return message.text.trim().startsWith('/')
  }
}
