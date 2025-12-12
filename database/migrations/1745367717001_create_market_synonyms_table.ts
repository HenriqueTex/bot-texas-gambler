import { BaseSchema } from '@adonisjs/lucid/schema'

export default class CreateMarketSynonymsTable extends BaseSchema {
  protected tableName = 'market_synonyms'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()

      table
        .integer('market_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('markets')
        .onDelete('CASCADE')

      table.string('value').notNullable()
      table.string('normalized_value').notNullable().unique()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
