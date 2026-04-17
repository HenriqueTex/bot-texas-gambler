import { BaseSchema } from '@adonisjs/lucid/schema'

export default class CreateSheetErrorLogsTable extends BaseSchema {
  protected tableName = 'sheet_error_logs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('bet_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('bets')
        .onDelete('CASCADE')
      table.text('error_message').notNullable()
      table.timestamp('created_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
