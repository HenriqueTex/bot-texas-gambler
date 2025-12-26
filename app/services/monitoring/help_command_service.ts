export default class HelpCommandService {
  async handle(ctx: any): Promise<void> {
    const response = [
      '🆘 Ajuda — comandos disponíveis:',
      '📊 /dia — resumo das apostas de hoje',
      '📊 /semana — resumo das apostas da semana',
      '📊 /mes — resumo das apostas do mês',
      '📌 /abertas — lista as apostas abertas',
    ].join('\n')

    await ctx.reply(response)
  }
}
