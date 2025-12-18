import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Market from '#models/market'
import MarketSynonym from '#models/market_synonym'

export default class MarketSynonymSeeder extends BaseSeeder {
  public async run() {
    const markets = await Market.all()
    for (const market of markets) {
      const normalizedValue = market.normalizedName
      const value = market.name

      await MarketSynonym.firstOrCreate(
        { normalizedValue },
        { marketId: market.id, value, normalizedValue }
      )
    }
  }
}
