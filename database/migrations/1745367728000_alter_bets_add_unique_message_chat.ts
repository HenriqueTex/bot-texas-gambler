import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AlterBetsAddUniqueMessageChat extends BaseSchema {
  async up() {
    await this.schema.raw(`
      CREATE UNIQUE INDEX IF NOT EXISTS bets_message_id_chat_id_unique
      ON bets (message_id, chat_id)
      WHERE message_id IS NOT NULL
    `)
  }

  async down() {
    await this.schema.raw('DROP INDEX IF EXISTS bets_message_id_chat_id_unique')
  }
}
