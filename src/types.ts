type PlayerMapOdds = {
  played: number
  won: number
}

type MapOdds = {
    name: string
    rank: number
    played: number
    won: number
    winPct: number
}

type MatchOdds = {
  team1: MapOdds[];
  team2: MapOdds[];
}

type PlayerStatsData = {
  lifetime: object
  segments: object[]
}

type PlayerData = {
  id: string
  nickname: string
  avatar: string
  gameId: string
  gameName: string
  memberships: string[]
  elo: number
  gameSkillLevel: number
  acReq: boolean
  partyId: string
  stats: PlayerStatsData
}

type FactionData = {
  id: string
  name: string
  avatar: string
  leader: string
  roster: PlayerData[]
  stats: {
    winProbability: number,
    skillLevel: object
    rating: number
  }
}

type MatchData = {
  id: string
  anticheatRequired: boolean
  anticheatMode: string
  state: string
  status: string
  states: string[]
  teams: {
    faction1: FactionData
    faction2: FactionData
  }
}