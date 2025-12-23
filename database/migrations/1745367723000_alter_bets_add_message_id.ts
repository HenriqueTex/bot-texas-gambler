import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AlterBetsAddMessageId extends BaseSchema {
  protected tableName = 'bets'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('message_id').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('message_id')
    })
  }
}
