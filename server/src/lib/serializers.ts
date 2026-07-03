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
  birthDate: Date | null
  photoUrl: string | null
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
    birth_date: toIso(player.birthDate),
    photo_url: player.photoUrl,
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
  registrationStartDate: Date | null
  registrationEndDate: Date | null
  gameFormula: string | null
  registrationFee: { toNumber(): number } | null
  startDate: Date | null
  endDate: Date | null
  format: string
  category: string
  status: string
  published: boolean
  participantLimit: number | null
  groupCount: number | null
  qualifiersPerGroup: number | null
  createdAt: Date
  updatedAt: Date
}): Tournament {
  return {
    id: tournament.id,
    name: tournament.name,
    location: tournament.location,
    registration_start_date: toIso(tournament.registrationStartDate),
    registration_end_date: toIso(tournament.registrationEndDate),
    game_formula: tournament.gameFormula,
    registration_fee: tournament.registrationFee?.toNumber() ?? null,
    start_date: toIso(tournament.startDate),
    end_date: toIso(tournament.endDate),
    format: tournament.format as Tournament['format'],
    category: tournament.category as Tournament['category'],
    status: tournament.status as Tournament['status'],
    published: tournament.published,
    participant_limit: tournament.participantLimit,
    group_count: tournament.groupCount,
    qualifiers_per_group: tournament.qualifiersPerGroup,
    created_at: tournament.createdAt.toISOString(),
    updated_at: tournament.updatedAt.toISOString(),
  }
}

export function serializeTournamentWithPlayers(tournament: {
  id: string
  name: string
  location: string | null
  registrationStartDate: Date | null
  registrationEndDate: Date | null
  gameFormula: string | null
  registrationFee: { toNumber(): number } | null
  startDate: Date | null
  endDate: Date | null
  format: string
  category: string
  status: string
  published: boolean
  participantLimit: number | null
  groupCount: number | null
  qualifiersPerGroup: number | null
  createdAt: Date
  updatedAt: Date
  players?: Array<{
    playerId: string
    seed: number | null
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
    })),
    playerIds,
  }
}

export function serializeTournamentPlayer(entry: {
  playerId: string
  seed: number | null
}): TournamentPlayer {
  return {
    player_id: entry.playerId,
    seed: entry.seed,
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
  const status: Match['status'] = match.status === 'completed'
    ? 'completed'
    : match.player1Id && match.player2Id
      ? 'ready'
      : 'waiting'
  return {
    id: match.id,
    tournament_id: match.tournamentId,
    round_index: match.round - 1,
    position: match.position,
    player1_id: match.player1Id,
    player2_id: match.player2Id,
    result: match.result,
    winner_id: match.winnerId,
    status,
    created_at: match.createdAt.toISOString(),
    updated_at: match.updatedAt.toISOString(),
  }
}
