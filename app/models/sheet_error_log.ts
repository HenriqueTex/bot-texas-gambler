import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import Bet from '#models/bet'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class SheetErrorLog extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'bet_id' })
  declare betId: number

  @column({ columnName: 'error_message' })
  declare errorMessage: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Bet, { foreignKey: 'betId' })
  declare bet: BelongsTo<typeof Bet>
}
