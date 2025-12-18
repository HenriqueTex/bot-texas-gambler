import Market from '#models/market'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

const MARKETS: Array<{ name: string; normalizedName: string; category: string | null }> = [
  { name: 'Moneyline', normalizedName: 'moneyline', category: 'result' },
  { name: 'Match Winner', normalizedName: 'match_winner', category: 'result' },
  { name: 'Double Chance', normalizedName: 'double_chance', category: 'result' },
  { name: 'Map Handicap', normalizedName: 'map_handicap', category: 'handicap' },
  { name: 'Correct Map Score', normalizedName: 'correct_map_score', category: 'result' },
  { name: 'Correct Series Score', normalizedName: 'correct_series_score', category: 'result' },

  { name: 'Total Kills Over', normalizedName: 'total_kills_over', category: 'totals' },
  { name: 'Total Kills Under', normalizedName: 'total_kills_under', category: 'totals' },
  { name: 'Total Time Over', normalizedName: 'total_time_over', category: 'totals' },
  { name: 'Total Time Under', normalizedName: 'total_time_under', category: 'totals' },
  { name: 'Total Maps Over', normalizedName: 'total_maps_over', category: 'totals' },
  { name: 'Total Maps Under', normalizedName: 'total_maps_under', category: 'totals' },

  { name: 'Kill Handicap', normalizedName: 'kill_handicap', category: 'handicap' },
  { name: 'Time Handicap', normalizedName: 'time_handicap', category: 'handicap' },
  { name: 'Gold Handicap', normalizedName: 'gold_handicap', category: 'handicap' },
  { name: 'Tower Handicap', normalizedName: 'tower_handicap', category: 'handicap' },

  { name: 'First Blood', normalizedName: 'first_blood', category: 'first' },
  { name: 'First Tower', normalizedName: 'first_tower', category: 'first' },
  { name: 'First Epic Objective', normalizedName: 'first_epic_objective', category: 'first' },

  { name: 'Race to Kills', normalizedName: 'race_to_kills', category: 'race' },
  { name: 'Race to Towers', normalizedName: 'race_to_towers', category: 'race' },
  { name: 'Race to Epic Objectives', normalizedName: 'race_to_epic_objectives', category: 'race' },

  { name: 'Most Kills', normalizedName: 'most_kills', category: 'team_props' },
  { name: 'Most Towers', normalizedName: 'most_towers', category: 'team_props' },
  { name: 'Most Epic Objectives', normalizedName: 'most_epic_objectives', category: 'team_props' },

  { name: 'Player Kills Over', normalizedName: 'player_kills_over', category: 'player_props' },
  { name: 'Player Kills Under', normalizedName: 'player_kills_under', category: 'player_props' },
  { name: 'Player Assists Over', normalizedName: 'player_assists_over', category: 'player_props' },
  {
    name: 'Player Assists Under',
    normalizedName: 'player_assists_under',
    category: 'player_props',
  },
  { name: 'Player Deaths Over', normalizedName: 'player_deaths_over', category: 'player_props' },
  { name: 'Player Deaths Under', normalizedName: 'player_deaths_under', category: 'player_props' },
  { name: 'Player KDA Over', normalizedName: 'player_kda_over', category: 'player_props' },
  { name: 'Player KDA Under', normalizedName: 'player_kda_under', category: 'player_props' },
  { name: 'Top Kills', normalizedName: 'top_kills', category: 'player_props' },

  { name: 'Total Dragons Over', normalizedName: 'total_dragons_over', category: 'objectives' },
  { name: 'Total Dragons Under', normalizedName: 'total_dragons_under', category: 'objectives' },
  { name: 'Total Barons Over', normalizedName: 'total_barons_over', category: 'objectives' },
  { name: 'Total Barons Under', normalizedName: 'total_barons_under', category: 'objectives' },
  { name: 'Total Heralds Over', normalizedName: 'total_heralds_over', category: 'objectives' },
  { name: 'Total Heralds Under', normalizedName: 'total_heralds_under', category: 'objectives' },
  { name: 'First Dragon', normalizedName: 'first_dragon', category: 'objectives' },
  { name: 'First Baron', normalizedName: 'first_baron', category: 'objectives' },

  { name: 'Total Roshan Over', normalizedName: 'total_roshan_over', category: 'objectives' },
  { name: 'Total Roshan Under', normalizedName: 'total_roshan_under', category: 'objectives' },
  { name: 'First Roshan', normalizedName: 'first_roshan', category: 'objectives' },
  { name: 'Total Barracks Over', normalizedName: 'total_barracks_over', category: 'objectives' },
  { name: 'Total Barracks Under', normalizedName: 'total_barracks_under', category: 'objectives' },
]

export default class MarketSeeder extends BaseSeeder {
  public async run() {
    for (const entry of MARKETS) {
      await Market.firstOrCreate(
        { normalizedName: entry.normalizedName },
        { name: entry.name, normalizedName: entry.normalizedName, category: entry.category }
      )
    }
  }
}
