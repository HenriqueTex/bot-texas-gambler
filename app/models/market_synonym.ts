import { DateTime } from 'luxon'
import { BaseModel, belongsTo, BelongsTo, column } from '@adonisjs/lucid/orm'
import Market from '#models/market'

export default class MarketSynonym extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'market_id' })
  declare marketId: number

  @column()
  declare value: string

  @column({ columnName: 'normalized_value' })
  declare normalizedValue: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Market, { foreignKey: 'marketId' })
  declare market: BelongsTo<typeof Market>
}
