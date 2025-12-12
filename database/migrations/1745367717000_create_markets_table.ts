import { BaseSchema } from '@adonisjs/lucid/schema'

export default class CreateMarketsTable extends BaseSchema {
  protected tableName = 'markets'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('name').notNullable()
      table.string('normalized_name').notNullable().unique()
      table.string('category').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
