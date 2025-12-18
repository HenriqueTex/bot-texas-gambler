import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import MarketSynonym from '#models/market_synonym'
import type { HasMany } from '@adonisjs/lucid/types/relations'

export default class Market extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column({ columnName: 'normalized_name' })
  declare normalizedName: string

  @column()
  declare category: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @hasMany(() => MarketSynonym, { foreignKey: 'marketId' })
  declare synonyms: HasMany<typeof MarketSynonym>
}
