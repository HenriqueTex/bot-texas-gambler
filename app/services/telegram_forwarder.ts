import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import { TelegramClient } from 'telegram'
import { NewMessage } from 'telegram/events/NewMessage.js'
import { EditedMessage } from 'telegram/events/EditedMessage.js'
import type { NewMessageEvent } from 'telegram/events/NewMessage.js'
import type { EditedMessageEvent } from 'telegram/events/EditedMessage.js'
import { StringSession } from 'telegram/sessions/index.js'
import type { EntityLike } from 'telegram/define.js'
import bigInt from 'big-integer'

export default class TelegramForwarderService {
  private readonly client: TelegramClient
  private readonly sourceChatId: string
  private readonly targetChatId: string
  private sourcePeer?: EntityLike
  private targetPeer?: EntityLike
  private sourceFilterId?: string
  private readonly numericChatRegex = /^-?\d+$/

  constructor() {
    const apiId = Number(env.get('TELEGRAM_API_ID'))
    const apiHash = env.get('TELEGRAM_API_HASH')
    const sessionString = env.get('TELEGRAM_SESSION')

    if (!sessionString) {
      throw new Error(
        'TELEGRAM_SESSION não configurada. Execute "node ace telegram:session" e informe a string gerada no seu .env.'
      )
    }

    this.client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, {
      connectionRetries: 5,
    })

    this.sourceChatId = env.get('SOURCE_CHAT_ID')
    this.targetChatId = env.get('TARGET_CHAT_ID')

    if (this.sourceChatId === this.targetChatId) {
      logger.warn('SOURCE_CHAT_ID e TARGET_CHAT_ID são iguais; as mensagens serão replicadas no mesmo chat.')
    }
  }

  private toEntityLike(identifier: string): EntityLike {
    if (this.numericChatRegex.test(identifier)) {
      return bigInt(identifier)
    }

    return identifier
  }

  private buildChatCandidates(chatId: string): string[] {
    const trimmed = chatId.trim()
    const candidates: string[] = []

    const addCandidate = (value?: string) => {
      if (!value) {
        return
      }
      if (!candidates.includes(value)) {
        candidates.push(value)
      }
    }

    addCandidate(trimmed)

    const linkMatch = trimmed.match(/t\.me\/c\/(-?\d+)/i)
    if (linkMatch) {
      const digits = linkMatch[1].replace(/^-/, '')
      addCandidate(`-100${digits}`)
    }

    if (this.numericChatRegex.test(trimmed)) {
      const digits = trimmed.replace(/^-/, '')

      if (!trimmed.startsWith('-')) {
        addCandidate(`-${digits}`)
      }

      if (!trimmed.startsWith('-100')) {
        addCandidate(`-100${digits}`)
      }
    }

    if (trimmed.startsWith('@')) {
      addCandidate(trimmed.slice(1))
    }

    return candidates
  }

  private async resolvePeer(chatId: string, label: 'SOURCE_CHAT_ID' | 'TARGET_CHAT_ID') {
    const candidates = this.buildChatCandidates(chatId)

    for (const candidate of candidates) {
      try {
        const peer = await this.client.getEntity(this.toEntityLike(candidate))
        if (label === 'SOURCE_CHAT_ID') {
          this.sourceFilterId = candidate
        }
        return peer
      } catch {
        continue
      }
    }

    throw new Error(
      `Não foi possível acessar o ${label} (${chatId}). Verifique se a sua conta está no chat e se o ID está correto (use "node ace telegram:list-chats").`
    )
  }

  private async resolvePeers() {
    this.sourcePeer = await this.resolvePeer(this.sourceChatId, 'SOURCE_CHAT_ID')
    this.targetPeer = await this.resolvePeer(this.targetChatId, 'TARGET_CHAT_ID')
  }

  private registerHandlers() {
    const sourceIdentifier = this.sourceFilterId ?? this.sourceChatId

    this.client.addEventHandler(
      (event) => this.relay(event),
      new NewMessage({ chats: [sourceIdentifier] })
    )

    this.client.addEventHandler(
      (event) => this.relay(event),
      new EditedMessage({ chats: [sourceIdentifier] })
    )
  }

  private async relay(event: NewMessageEvent | EditedMessageEvent) {
    if (!event.message || !this.targetPeer || !this.sourcePeer) {
      return
    }

    try {
      await this.client.forwardMessages(this.targetPeer, {
        messages: event.message.id,
        fromPeer: this.sourcePeer,
      })
    } catch (error) {
      logger.error({ err: error }, 'Falha ao replicar mensagem usando a conta pessoal do Telegram')
    }
  }

  async start() {
    await this.client.connect()

    if (!(await this.client.checkAuthorization())) {
      throw new Error('Sessão do Telegram inválida ou expirada. Gere uma nova TELEGRAM_SESSION.')
    }

    await this.resolvePeers()
    this.registerHandlers()

    logger.info('Cliente Telegram autenticado. Replicação de mensagens habilitada.')

    process.once('SIGINT', () => this.shutdown('SIGINT'))
    process.once('SIGTERM', () => this.shutdown('SIGTERM'))
  }

  async shutdown(signal: string) {
    logger.info({ signal }, 'Encerrando cliente Telegram')
    await this.client.disconnect()
  }
}
