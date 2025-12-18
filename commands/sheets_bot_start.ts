import env from '#start/env'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import MonitoringBotService from '#services/monitoring/monitoring_bot_service'

export default class SheetsBotStart extends BaseCommand {
  static commandName = 'sheets-bot:start'
  static description =
    'Inicia um bot do Telegram que captura mensagens e analisa prints de apostas enviados ao bot'

  static options: CommandOptions = {
    startApp: true,
    staysAlive: true,
  }

  async run() {
    const token = env.get('TELEGRAM_BOT_TOKEN')

    if (!token) {
      this.logger.error('Configure TELEGRAM_BOT_TOKEN no .env para iniciar o bot.')
      return
    }

    const service = new MonitoringBotService()
    this.logger.info('Iniciando bot de monitoramento...')
    const bot = await service.run(token)
    this.logger.success('Bot do Telegram iniciado e aguardando mensagens.')
    this.logger.info('Pressione CTRL+C para encerrar.')

    await new Promise<void>((resolve) => {
      process.once('SIGINT', () => {
        bot.stop('SIGINT')
        resolve()
      })
      process.once('SIGTERM', () => {
        bot.stop('SIGTERM')
        resolve()
      })
    })
  }
}
