import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AlterBetsAddSheetRow extends BaseSchema {
  protected tableName = 'bets'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('sheet_row').unsigned().nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('sheet_row')
    })
  }
}
