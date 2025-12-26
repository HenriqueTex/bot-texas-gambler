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
import { DateTime } from 'luxon'

export default class MonitoringBotService {
  private readonly photoAnalyzer = new PhotoMessageAnalysisService()
  private readonly textAnalyzer = new TextMessageAnalysisService()
  private readonly marketResolver = new MarketResolverService()
  private readonly serviceFactory = new SheetMapFactoryService()
  private readonly messageHandler = new MessageHandlerService()
  private readonly messageEditHandler = new MessageEditHandlerService()

  async run(token: string): Promise<TelegrafInstance> {
    const bot = new Telegraf(token)

    bot.command('dia', async (ctx) => {
      await this.handleStatsCommand(ctx, 'day')
    })

    bot.command('semana', async (ctx) => {
      await this.handleStatsCommand(ctx, 'week')
    })

    bot.command('mes', async (ctx) => {
      await this.handleStatsCommand(ctx, 'month')
    })

    bot.command('abertas', async (ctx) => {
      await this.handleOpenBetsCommand(ctx)
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

  private extractMessageText(message: { text?: string; caption?: string }): string {
    return (message.text ?? message.caption ?? '').toString()
  }

  private async handleStatsCommand(ctx: any, period: 'day' | 'week' | 'month'): Promise<void> {
    const chatId = ctx?.message?.chat?.id ?? ctx?.chat?.id

    if (!chatId) {
      await ctx.reply('Não consegui identificar o chat para consultar as apostas.')
      return
    }

    const { start, end, label } = this.resolvePeriod(period)

    const bets = await Bet.query()
      .where('chat_id', chatId.toString())
      .whereBetween('created_at', [start.toJSDate(), end.toJSDate()])
      .select(['units', 'odd', 'result'])
    const total = bets.length
    const open = bets.filter((bet) => !bet.result).length
    const units = bets.reduce((sum, bet) => sum + this.safeNumber(bet.units), 0)
    const netResult = bets.reduce((sum, bet) => sum + this.calculateNetResult(bet), 0)
    const avgOdd = this.calculateAverageOdd(bets)
    const { greenCount, redCount, voidCount } = this.countResults(bets)

    const response = [
      `📊 ${label}`,
      `Apostas: ${total}`,
      `Abertas: ${open}`,
      `Unidades investidas: ${this.formatNumber(units)}u`,
      `Odd média: ${this.formatNumber(avgOdd)}`,
      `Greens: ${greenCount}`,
      `Reds: ${redCount}`,
      `Voids: ${voidCount}`,
      `Resultado: ${this.formatNumber(netResult)}u`,
    ].join('\n')

    await ctx.reply(response)
  }

  private async handleOpenBetsCommand(ctx: any): Promise<void> {
    const chatId = ctx?.message?.chat?.id ?? ctx?.chat?.id

    if (!chatId) {
      await ctx.reply('Não consegui identificar o chat para consultar as apostas.')
      return
    }

    const bets = await Bet.query()
      .where('chat_id', chatId.toString())
      .whereNull('result')
      .preload('market')
      .orderBy('created_at', 'asc')

    if (!bets.length) {
      await ctx.reply('Nenhuma aposta aberta no momento.')
      return
    }

    const header = `📌 Apostas abertas (${bets.length})`
    const lines = bets.map((bet) => this.formatOpenBetLine(bet))
    const messages = this.chunkLines([header, ...lines], 3800)

    for (const text of messages) {
      await ctx.reply(text)
    }
  }

  private resolvePeriod(period: 'day' | 'week' | 'month'): {
    start: DateTime
    end: DateTime
    label: string
  } {
    const now = DateTime.local()

    switch (period) {
      case 'week':
        return { start: now.startOf('week'), end: now.endOf('week'), label: 'Esta semana' }
      case 'month':
        return { start: now.startOf('month'), end: now.endOf('month'), label: 'Este mês' }
      default:
        return { start: now.startOf('day'), end: now.endOf('day'), label: 'Hoje' }
    }
  }

  private calculateNetResult(bet: Bet): number {
    const units = this.safeNumber(bet.units)
    const odd = this.safeNumber(bet.odd)

    if (!Number.isFinite(units) || units === 0) return 0

    switch (bet.result) {
      case 'green':
        return odd ? (odd - 1) * units : 0
      case 'red':
        return -units
      case 'half green':
        return odd ? ((odd - 1) * units) / 2 : 0
      case 'half red':
        return -units / 2
      case 'void':
      default:
        return 0
    }
  }

  private formatNumber(value: number): string {
    if (!Number.isFinite(value)) {
      return '0,00'
    }
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  private safeNumber(value: number | null | undefined): number {
    return Number.isFinite(value) ? (value as number) : 0
  }

  private formatOpenBetLine(bet: Bet): string {
    const date = bet.createdAt ? bet.createdAt.toFormat('dd/MM') : ''
    const home = bet.homeTeam ?? ''
    const away = bet.awayTeam ?? ''
    const homeAway = this.formatTeams(home, away)
    const market = bet.market?.name ?? ''
    const odd = Number(bet.odd)
    const units = Number(bet.units)
    const parts = [
      date ? `📅 ${date}` : '',
      homeAway ? `- ${homeAway}` : '',
      market ? `- ${market}` : '',
      odd ? `🎯 @${odd}` : '',
      units ? `${units}u` : '',
    ].filter((value) => value && value.length > 0)

    return parts.join(' ')
  }

  private formatTeams(home: string, away: string): string {
    const maxLength = 18
    const cleanHome = this.truncateText(home, maxLength)
    const cleanAway = this.truncateText(away, maxLength)

    if (cleanHome && cleanAway) {
      return `${cleanHome} x ${cleanAway}`
    }

    return cleanHome || cleanAway || ''
  }

  private truncateText(value: string, maxLength: number): string {
    const trimmed = value.trim()
    if (!trimmed) return ''
    if (trimmed.length <= maxLength) return trimmed
    return `${trimmed.slice(0, maxLength - 1)}…`
  }

  private chunkLines(lines: string[], maxLength: number): string[] {
    const chunks: string[] = []
    let current = ''

    for (const line of lines) {
      if (!current) {
        current = line
        continue
      }

      if (current.length + 1 + line.length > maxLength) {
        chunks.push(current)
        current = line
        continue
      }

      current = `${current}\n${line}`
    }

    if (current) {
      chunks.push(current)
    }

    return chunks
  }

  private calculateAverageOdd(bets: Pick<Bet, 'odd'>[]): number {
    const odds = bets
      .map((bet) => this.safeNumber(bet.odd))
      .filter((value) => Number.isFinite(value) && value > 0)

    if (!odds.length) {
      return 0
    }

    const total = odds.reduce((sum, value) => sum + value, 0)
    return total / odds.length
  }

  private countResults(bets: Pick<Bet, 'result'>[]): {
    greenCount: number
    redCount: number
    voidCount: number
  } {
    return bets.reduce(
      (acc, bet) => {
        if (bet.result === 'green') acc.greenCount += 1
        if (bet.result === 'red') acc.redCount += 1
        if (bet.result === 'void') acc.voidCount += 1
        return acc
      },
      { greenCount: 0, redCount: 0, voidCount: 0 }
    )
  }
}
