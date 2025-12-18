import { BaseSchema } from '@adonisjs/lucid/schema'

export default class CreateBetsTable extends BaseSchema {
  protected tableName = 'bets'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('home_team').nullable()
      table.string('away_team').nullable()
      table.integer('market_id').unsigned().nullable()
      table.decimal('odd', 10, 2).nullable()
      table.string('chat_id').notNullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
