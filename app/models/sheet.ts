import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import Chat from '#models/chat'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export type SheetColumnMap = Record<string, string>

export default class Sheet extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'chat_id' })
  declare chatId: number

  @column({ columnName: 'spreadsheet_id' })
  declare spreadsheetId: string

  @column({ columnName: 'sheet_name' })
  declare sheetName: string

  @column({ columnName: 'column_map' })
  declare columnMap: SheetColumnMap

  @column({ columnName: 'start_row' })
  declare startRow: number

  @column()
  declare active: boolean

  @column()
  declare notes: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Chat, { foreignKey: 'chatId' })
  declare chat: BelongsTo<typeof Chat>
}
