import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import Market from '#models/market'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class Bet extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'home_team' })
  declare homeTeam: string | null

  @column({ columnName: 'away_team' })
  declare awayTeam: string | null

  @column({ columnName: 'market_id' })
  declare marketId: number | null

  @column()
  declare odd: number | null

  @column({ columnName: 'chat_id' })
  declare chatId: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Market, { foreignKey: 'marketId' })
  declare market: BelongsTo<typeof Market>
}
