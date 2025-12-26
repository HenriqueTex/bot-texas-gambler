import Bet from '#models/bet'

export default class OpenBetsCommandService {
  async handle(ctx: any): Promise<void> {
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
}
