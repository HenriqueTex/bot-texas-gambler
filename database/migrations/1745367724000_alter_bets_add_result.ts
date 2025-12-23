import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AlterBetsAddResult extends BaseSchema {
  protected tableName = 'bets'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .enu('result', ['green', 'red', 'half green', 'half red', 'void'], {
          useNative: true,
          enumName: 'bet_result_enum',
          existingType: false,
        })
        .nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('result')
    })
    this.schema.raw('DROP TYPE IF EXISTS "bet_result_enum"')
  }
}
