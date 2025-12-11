import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Bet extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'home_team' })
  declare homeTeam: string | null

  @column({ columnName: 'away_team' })
  declare awayTeam: string | null

  @column()
  declare market: string | null

  @column()
  declare odd: number | null

  @column({ columnName: 'chat_id' })
  declare chatId: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
