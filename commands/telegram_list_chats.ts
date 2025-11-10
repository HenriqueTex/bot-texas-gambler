import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import env from '#start/env'
import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions/index.js'

export default class TelegramListChats extends BaseCommand {
  static commandName = 'telegram:list-chats'
  static description = 'Lista os grupos/canais acessíveis pela sessão atual e mostra seus IDs'

  static options: CommandOptions = {}

  async run() {
    const apiId = Number(env.get('TELEGRAM_API_ID'))
    const apiHash = env.get('TELEGRAM_API_HASH')
    const sessionString = env.get('TELEGRAM_SESSION')

    if (!sessionString) {
      this.logger.error(
        'Configure TELEGRAM_SESSION primeiro (rode "node ace telegram:session" para gerar uma).'
      )
      return
    }

    const client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, {
      connectionRetries: 5,
    })

    try {
      await client.connect()

      if (!(await client.checkAuthorization())) {
        this.logger.error('Sessão inválida ou expirada. Gere uma nova TELEGRAM_SESSION.')
        return
      }

      this.logger.info('Buscando seus chats disponíveis...')
      const dialogs = await client.getDialogs({})

      if (!dialogs.length) {
        this.logger.info('Nenhum chat encontrado para esta sessão.')
        return
      }

      dialogs.forEach((dialog) => {
        const title = dialog.name || 'Sem título'
        const entityId =
          dialog.entity && 'id' in dialog.entity ? dialog.entity.id?.toString() : undefined
        const fallbackId = dialog.id?.toString()
        const type = dialog.isChannel
          ? 'Canal'
          : dialog.isGroup
            ? 'Grupo'
            : dialog.isUser
              ? 'Contato'
              : 'Outro'

        const baseId = entityId || fallbackId || 'desconhecido'
        const formattedId = dialog.isChannel || dialog.isGroup ? `-100${baseId}` : baseId

        this.logger.info(`[${type}] ${title}`)
        this.logger.info(`    Chat ID sugerido: ${formattedId}`)
      })
    } finally {
      await client.disconnect()
    }
  }
}
