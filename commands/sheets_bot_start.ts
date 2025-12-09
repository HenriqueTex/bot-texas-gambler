import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import BetImageAnalysisService from '#services/bet_image_analysis'

export default class SheetsBotStart extends BaseCommand {
  static commandName = 'sheets-bot:start'
  static description = 'Analisa um print de aposta para extrair times e odd'

  static options: CommandOptions = {
    startApp: false,
  }

  @args.string({ description: 'Caminho do print com a aposta' })
  declare imagePath: string

  async run() {
    const analyzer = new BetImageAnalysisService()
    this.logger.info(`Analisando imagem: ${this.imagePath}`)

    try {
      const result = await analyzer.analyze(this.imagePath)
      this.logger.success('Análise concluída')
      console.log(JSON.stringify(result, null, 2))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`Falha ao analisar a imagem: ${message}`)
    }
  }
}
