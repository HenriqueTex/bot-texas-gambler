import { BaseSchema } from '@adonisjs/lucid/schema'

// current_row already exists in create_sheets_table migration — this is intentionally a no-op
export default class AlterSheetsAddCurrentRow extends BaseSchema {
  async up() {}
  async down() {}
}
