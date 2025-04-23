import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class BotRunner extends BaseCommand {
  static commandName = 'bot:runner'
  static description = ''

  static options: CommandOptions = {}

  async run() {
    this.logger.info('Hello world from "BotRunner"')
  }
}