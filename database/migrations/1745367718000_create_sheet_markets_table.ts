import { BaseSchema } from '@adonisjs/lucid/schema'

export default class CreateSheetMarketsTable extends BaseSchema {
  protected tableName = 'sheet_markets'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()

      table
        .integer('sheet_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('sheets')
        .onDelete('CASCADE')

      table
        .integer('market_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('markets')
        .onDelete('CASCADE')

      table.string('sheet_column').nullable()
      table.integer('start_row').unsigned().nullable()
      table.boolean('active').notNullable().defaultTo(true)
      table.text('notes').nullable()

      table.unique(['sheet_id', 'market_id'])

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
