import type { BetImageAnalysisResult } from '#services/monitoring/bet_image_analysis'
import PhotoMessageAnalysisService from '#services/monitoring/photo_message_analysis_service'
import SheetsUpdateService from '#services/monitoring/sheets_update_service'
import TextMessageAnalysisService from '#services/monitoring/text_message_analysis_service'
import { Telegraf } from 'telegraf'
import type { Telegraf as TelegrafInstance } from 'telegraf'

export default class MonitoringBotService {
  private readonly photoAnalyzer = new PhotoMessageAnalysisService()
  private readonly textAnalyzer = new TextMessageAnalysisService()
  private readonly sheetsUpdater = new SheetsUpdateService()

  async run(token: string): Promise<TelegrafInstance> {
    const bot = new Telegraf(token)

    bot.on('message', async (ctx) => {
      const message: any = ctx.message
      const messageText = this.extractMessageText(message)
      let imgResult: BetImageAnalysisResult | null = null
      let units: number | null = null
      console.log(message)
      if (messageText) {
        const textAnalysis = await this.textAnalyzer.analyzeFromText(messageText)
        units = textAnalysis.units
        if (units !== null) console.log(`Unidades detectadas: ${units}`)
      }

      if (message.photo) {
        try {
          imgResult = await this.photoAnalyzer.analyze(bot, message, messageText)
          console.log('Resultado Gemini:', imgResult)
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error)
          console.error(`Falha ao analisar foto: ${msg}`)
        }
      }

      try {
        await this.sheetsUpdater.writeTestTimestamp()
        console.log('Planilha atualizada na célula C26.')
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        console.error(`Falha ao escrever na planilha: ${msg}`)
      }
    })

    await bot.launch()
    return bot
  }

  private extractMessageText(message: { text?: string; caption?: string }): string {
    return (message.text ?? message.caption ?? '').toString()
  }
}
