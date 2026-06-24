import type { Match, Player, Tournament, TournamentPlayer, TournamentWithPlayers } from '../../../src/types'

function toIso(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined
  if (value instanceof Date) return value.toISOString()
  return value
}

export function serializePlayer(player: {
  id: string
  name: string
  ranking: number
  club: string | null
  phone: string | null
  userId: string | null
  createdAt: Date
  updatedAt: Date
}): Player {
  return {
    id: player.id,
    name: player.name,
    ranking: player.ranking,
    club: player.club,
    phone: player.phone,
    user_id: player.userId,
    created_at: player.createdAt.toISOString(),
    updated_at: player.updatedAt.toISOString(),
  }
}

export function serializeTournament(tournament: {
  id: string
  name: string
  location: string | null
  startDate: Date | null
  endDate: Date | null
  format: string
  category: string
  status: string
  published: boolean
  createdAt: Date
  updatedAt: Date
}): Tournament {
  return {
    id: tournament.id,
    name: tournament.name,
    location: tournament.location,
    start_date: toIso(tournament.startDate),
    end_date: toIso(tournament.endDate),
    format: tournament.format as Tournament['format'],
    category: tournament.category as Tournament['category'],
    status: tournament.status as Tournament['status'],
    published: tournament.published,
    created_at: tournament.createdAt.toISOString(),
    updated_at: tournament.updatedAt.toISOString(),
  }
}

export function serializeTournamentWithPlayers(tournament: {
  id: string
  name: string
  location: string | null
  startDate: Date | null
  endDate: Date | null
  format: string
  category: string
  status: string
  published: boolean
  createdAt: Date
  updatedAt: Date
  players?: Array<{
    playerId: string
    seed: number | null
    enrolledAt: Date
  }>
}): TournamentWithPlayers {
  const base = serializeTournament(tournament)
  const playerIds = (tournament.players ?? [])
    .slice()
    .sort((a, b) => (a.seed ?? Number.MAX_SAFE_INTEGER) - (b.seed ?? Number.MAX_SAFE_INTEGER))
    .map((entry) => entry.playerId)

  return {
    ...base,
    tournament_players: (tournament.players ?? []).map((entry) => ({
      player_id: entry.playerId,
      seed: entry.seed,
      enrolled_at: entry.enrolledAt.toISOString(),
    })),
    playerIds,
  }
}

export function serializeTournamentPlayer(entry: {
  playerId: string
  seed: number | null
  enrolledAt: Date
}): TournamentPlayer {
  return {
    player_id: entry.playerId,
    seed: entry.seed,
    enrolled_at: entry.enrolledAt.toISOString(),
  }
}

export function serializeMatch(match: {
  id: string
  tournamentId: string
  round: number
  position: number
  player1Id: string | null
  player2Id: string | null
  result: string | null
  winnerId: string | null
  status: string
  createdAt: Date
  updatedAt: Date
}): Match {
  return {
    id: match.id,
    tournament_id: match.tournamentId,
    round: match.round,
    position: match.position,
    player1_id: match.player1Id,
    player2_id: match.player2Id,
    result: match.result,
    winner_id: match.winnerId,
    status: match.status as Match['status'],
    created_at: match.createdAt.toISOString(),
    updated_at: match.updatedAt.toISOString(),
  }
}
