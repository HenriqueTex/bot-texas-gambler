import MessageEditHandlerService from '#services/monitoring/message_edit_handler_service'
import MessageHandlerService from '#services/monitoring/message_handler_service'
import HelpCommandService from '#services/monitoring/help_command_service'
import OpenBetsCommandService from '#services/monitoring/open_bets_command_service'
import StatsCommandService from '#services/monitoring/stats_command_service'
import { Telegraf } from 'telegraf'
import type { Telegraf as TelegrafInstance } from 'telegraf'

export default class MonitoringBotService {
  private readonly messageHandler = new MessageHandlerService()
  private readonly messageEditHandler = new MessageEditHandlerService()
  private readonly helpCommand = new HelpCommandService()
  private readonly statsCommand = new StatsCommandService()
  private readonly openBetsCommand = new OpenBetsCommandService()
  private healthCheckTimer?: NodeJS.Timeout
  private restartInProgress = false

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

    bot.command('help', async (ctx) => {
      await this.helpCommand.handle(ctx)
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

    bot.catch((error) => {
      console.error('Erro no middleware do bot:', error)
    })

    await this.launchWithRetry(bot)
    this.scheduleHealthCheck(bot)
    return bot
  }

  private async launchWithRetry(bot: TelegrafInstance, maxAttempts = 10): Promise<void> {
    const maxDelayMs = 30_000

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await bot.launch({ dropPendingUpdates: true })
        return
      } catch (error) {
        if (attempt >= maxAttempts) {
          throw new Error(
            `Bot falhou ao iniciar após ${maxAttempts} tentativas: ${String(error)}`
          )
        }
        const delay = Math.min(1000 * 2 ** Math.min(attempt, 5), maxDelayMs)
        console.error(
          `Falha ao iniciar bot (tentativa ${attempt}/${maxAttempts}). Retentando em ${delay}ms.`,
          error
        )
        await this.sleep(delay)
      }
    }
  }

  private scheduleHealthCheck(bot: TelegrafInstance): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
    }

    this.healthCheckTimer = setInterval(async () => {
      try {
        await bot.telegram.getMe()
      } catch (error) {
        console.error('Health check falhou. Reiniciando bot...', error)
        await this.restartBot(bot, 'health_check_failed')
      }
    }, 30_000)
  }

  private async restartBot(bot: TelegrafInstance, reason: string): Promise<void> {
    if (this.restartInProgress) return
    this.restartInProgress = true

    try {
      bot.stop(reason)
    } catch (error) {
      console.error('Falha ao parar o bot durante o restart:', error)
    }

    try {
      await this.launchWithRetry(bot)
    } finally {
      this.restartInProgress = false
    }

    this.scheduleHealthCheck(bot)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
