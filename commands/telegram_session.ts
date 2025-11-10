import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import env from '#start/env'
import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions/index.js'

export default class TelegramSession extends BaseCommand {
  static commandName = 'telegram:session'
  static description =
    'Gera uma string de sessão (userbot) para replicar mensagens usando a sua própria conta do Telegram'

  static options: CommandOptions = {}

  async run() {
    const apiId = Number(env.get('TELEGRAM_API_ID'))
    const apiHash = env.get('TELEGRAM_API_HASH')

    const phoneNumber = (
      await this.prompt.ask('Número do Telegram (inclua o DDI, ex: +551199999999)', {
        validate: (value) => value.trim() !== '' || 'Informe um número de telefone válido',
      })
    ).trim()

    const client = new TelegramClient(new StringSession(''), apiId, apiHash, {
      connectionRetries: 5,
    })

    try {
      await client.start({
        phoneNumber: async () => phoneNumber,
        phoneCode: async () =>
          (
            await this.prompt.ask('Código recebido no Telegram:', {
              validate: (value) => value.trim() !== '' || 'Informe o código enviado pelo Telegram',
            })
          ).trim(),
        password: async () =>
          (
            await this.prompt.secure(
              'Senha 2FA (pressione ENTER se o Telegram solicitar e você tiver senha)'
            )
          ).trim(),
        onError: (error) => {
          const message = error instanceof Error ? error.message : String(error)
          this.logger.error(`Erro ao autenticar no Telegram: ${message}`)
        },
      })

      const session = client.session.save()
      this.logger.success('Sessão criada com sucesso!')
      this.logger.info('Cole o valor abaixo na variável TELEGRAM_SESSION do seu arquivo .env:')
      console.log(session)
    } finally {
      await client.disconnect()
    }
  }
}
