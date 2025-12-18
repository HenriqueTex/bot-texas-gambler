import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AlterSheetsCurrentRowNullable extends BaseSchema {
  protected tableName = 'sheets'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('current_row').unsigned().nullable().alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('current_row').unsigned().notNullable().defaultTo(2).alter()
    })
  }
}
