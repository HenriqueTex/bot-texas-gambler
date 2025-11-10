import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import TelegramForwarderService from '#services/telegram_forwarder'

export default class BotStart extends BaseCommand {
  static commandName = 'bot:start'
  static description = 'Inicia o bot que encaminha mensagens entre grupos do Telegram'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    this.logger.info('Conectando ao Telegram com a sua conta para iniciar a replicação…')
    const forwarder = new TelegramForwarderService()
    await forwarder.start()
    this.logger.success('Replicação ativa! As mensagens serão espelhadas automaticamente.')
  }
}
