import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AlterBetsAddMarketFk extends BaseSchema {
  protected tableName = 'bets'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .foreign('market_id')
        .references('id')
        .inTable('markets')
        .onDelete('SET NULL')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign(['market_id'])
    })
  }
}
