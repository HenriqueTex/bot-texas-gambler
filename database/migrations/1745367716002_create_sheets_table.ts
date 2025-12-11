import { BaseSchema } from '@adonisjs/lucid/schema'

export default class CreateSheetsTable extends BaseSchema {
  protected tableName = 'sheets'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()

      table
        .integer('chat_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('chats')
        .onDelete('CASCADE')

      table.string('spreadsheet_id').notNullable()
      table.string('sheet_name').notNullable().defaultTo('Sheet1')
      table.jsonb('column_map').notNullable()
      table.integer('start_row').unsigned().notNullable().defaultTo(2)
      table.boolean('active').notNullable().defaultTo(true)
      table.text('notes').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
