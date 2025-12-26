import Bet from '#models/bet'
import { DateTime } from 'luxon'

type Period = 'day' | 'week' | 'month'

export default class StatsCommandService {
  async handle(ctx: any, period: Period): Promise<void> {
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
    const units = bets.reduce((sum, bet) => sum + Number(bet.units ?? 0), 0)
    const netResult = bets.reduce((sum, bet) => sum + this.calculateNetResult(bet), 0)
    const avgOdd = this.calculateAverageOdd(bets)
    const { greenCount, redCount, voidCount } = this.countResults(bets)

    const response = [
      `📊 ${label}`,
      `🎯 Apostas: ${total}`,
      `🕓 Abertas: ${open}`,
      `💰 Unidades investidas: ${this.formatNumber(units)}u`,
      `📈 Odd média: ${this.formatNumber(avgOdd)}`,
      `✅ Greens: ${greenCount}`,
      `❌ Reds: ${redCount}`,
      `🔁 Voids: ${voidCount}`,
      `📌 Resultado: ${this.formatNumber(netResult)}u`,
    ].join('\n')

    await ctx.reply(response)
  }

  private resolvePeriod(period: Period): { start: DateTime; end: DateTime; label: string } {
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
    const units = Number(bet.units)
    const odd = Number(bet.odd)

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

  private calculateAverageOdd(bets: Pick<Bet, 'odd'>[]): number {
    const odds = bets
      .map((bet) => Number(bet.odd))
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

  private formatNumber(value: number): string {
    if (!Number.isFinite(value)) {
      return '0,00'
    }
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }
}
