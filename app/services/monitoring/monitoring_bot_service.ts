import MessageEditHandlerService from '#services/monitoring/message_edit_handler_service'
import MessageHandlerService from '#services/monitoring/message_handler_service'
import OpenBetsCommandService from '#services/monitoring/open_bets_command_service'
import StatsCommandService from '#services/monitoring/stats_command_service'
import { Telegraf } from 'telegraf'
import type { Telegraf as TelegrafInstance } from 'telegraf'

export default class MonitoringBotService {
  private readonly messageHandler = new MessageHandlerService()
  private readonly messageEditHandler = new MessageEditHandlerService()
  private readonly statsCommand = new StatsCommandService()
  private readonly openBetsCommand = new OpenBetsCommandService()

  async run(token: string): Promise<TelegrafInstance> {
    const bot = new Telegraf(token)

    bot.command('dia', async (ctx) => {
      await this.statsCommand.handle(ctx, 'day')
    })

    bot.command('semana', async (ctx) => {
      await this.statsCommand.handle(ctx, 'week')
    })

    bot.command('mes', async (ctx) => {
      await this.statsCommand.handle(ctx, 'month')
    })

    bot.command('abertas', async (ctx) => {
      await this.openBetsCommand.handle(ctx)
    })

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
}
