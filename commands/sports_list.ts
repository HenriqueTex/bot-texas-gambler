import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

type Sport = {
  idSport?: string
  strSport?: string
  strFormat?: string
}

export default class SportsList extends BaseCommand {
  static commandName = 'sports:list'
  static description = 'Lista todos os esportes disponíveis via TheSportsDB'

  static options: CommandOptions = {
    startApp: false,
  }

  async run() {
    const apiKey = process.env.THESPORTSDB_API_KEY || '1' // chave demo pública
    const url = `https://www.thesportsdb.com/api/v1/json/${encodeURIComponent(apiKey)}/all_sports.php`

    this.logger.info('Consultando todos os esportes em TheSportsDB...')

    try {
      const response = await fetch(url)

      if (!response.ok) {
        this.logger.error(`Falha na requisição: ${response.status} ${response.statusText}`)
        return
      }

      const body = (await response.json()) as { sports?: Sport[] }
      const sports = body.sports ?? []

      if (!sports.length) {
        this.logger.warning('Nenhum esporte retornado.')
        return
      }

      const result = sports.map((sport) => ({
        id: sport.idSport ?? '',
        name: sport.strSport ?? '',
        format: sport.strFormat ?? '',
      }))

      this.logger.success(`Esportes encontrados (${result.length}):`)
      console.table(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`Erro ao buscar esportes: ${message}`)
    }
  }
}
