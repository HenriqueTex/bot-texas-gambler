import type { HttpContext } from '@adonisjs/core/http'
import Chat from '#models/chat'

export default class ChatController {
  async index() {
    return Chat.all()
  }

  async store({ request, response }: HttpContext) {
    const name = String(request.input('name', '')).trim()
    if (!name) {
      return response.badRequest({ error: 'O campo name é obrigatório.' })
    }

    const telegramChatId = this.prepareTelegramId(request.input('telegram_chat_id'))
    const chat = await Chat.create({ name, telegramChatId })
    return response.created(chat)
  }

  async show({ params }: HttpContext) {
    const chat = await Chat.findOrFail(params.id)
    return chat
  }

  async update({ params, request }: HttpContext) {
    const chat = await Chat.findOrFail(params.id)
    const payload = this.extractPartialPayload(request)

    chat.merge(payload)
    await chat.save()
    return chat
  }

  async destroy({ params, response }: HttpContext) {
    const chat = await Chat.findOrFail(params.id)
    await chat.delete()
    return response.noContent()
  }

  private extractPartialPayload(request: HttpContext['request']) {
    const updates: Partial<{ name: string; telegramChatId: string | null }> = {}

    const name = request.input('name')
    if (typeof name !== 'undefined') {
      const trimmed = String(name).trim()
      if (trimmed) updates.name = trimmed
    }

    const telegramIdProvided = request.input('telegram_chat_id')
    if (typeof telegramIdProvided !== 'undefined') {
      updates.telegramChatId = this.prepareTelegramId(telegramIdProvided)
    }

    return updates
  }

  private prepareTelegramId(value: unknown): string | null {
    if (value === null || typeof value === 'undefined') return null
    const str = String(value).trim()
    return str.length ? str : null
  }
}
