import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import Sheet from '#models/sheet'
import Market from '#models/market'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class SheetMarket extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'sheet_id' })
  declare sheetId: number

  @column({ columnName: 'market_id' })
  declare marketId: number

  @column({ columnName: 'sheet_column' })
  declare sheetColumn: string | null

  @column({ columnName: 'start_row' })
  declare startRow: number | null

  @column()
  declare active: boolean

  @column()
  declare notes: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Sheet, { foreignKey: 'sheetId' })
  declare sheet: BelongsTo<typeof Sheet>

  @belongsTo(() => Market, { foreignKey: 'marketId' })
  declare market: BelongsTo<typeof Market>
}
