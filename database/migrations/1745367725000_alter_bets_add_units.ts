import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AlterBetsAddUnits extends BaseSchema {
  protected tableName = 'bets'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.decimal('units', 10, 2).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('units')
    })
  }
}
