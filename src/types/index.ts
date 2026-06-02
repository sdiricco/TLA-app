// ── Domain types ────────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  name?: string
  role?: string
}

export interface Player {
  id: string
  name: string
  ranking: number
  club?: string | null
  phone?: string | null
  created_at?: string
  updated_at?: string
}

export type PlayerCreate = Omit<Player, 'id' | 'created_at' | 'updated_at'>
export type PlayerUpdate = Partial<PlayerCreate>

export type TournamentFormat =
  | 'single_elimination'
  | 'double_elimination'
  | 'round_robin'
  | 'round_robin_elimination'

export type TournamentCategory = 'singles' | 'doubles'

export type TournamentStatus = 'upcoming' | 'ongoing' | 'completed'

export interface Tournament {
  id: string
  name: string
  location?: string | null
  start_date?: string | null
  end_date?: string | null
  format: TournamentFormat
  category: TournamentCategory
  status: TournamentStatus
  created_at?: string
  updated_at?: string
}

export type TournamentCreate = Omit<Tournament, 'id' | 'created_at' | 'updated_at'>
export type TournamentUpdate = Partial<TournamentCreate>

// ── Tournament detail ────────────────────────────────────────────────────────

export interface TournamentPlayer {
  player_id: string
  seed: number | null
}

/** Returned by getById — includes enrolled player data */
export interface TournamentWithPlayers extends Tournament {
  tournament_players?: TournamentPlayer[]
  playerIds?: string[]
}

// ── Matches ──────────────────────────────────────────────────────────────────

export interface MatchSet {
  p1: number
  p2: number
}

export type MatchStatus = 'pending' | 'completed'

export interface Match {
  id: string
  tournament_id: string
  round: number
  position: number
  player1_id: string | null
  player2_id: string | null
  sets: MatchSet[]
  winner_id: string | null
  status: MatchStatus
  created_at?: string
  updated_at?: string
}

export type MatchResultInput = {
  sets: MatchSet[]
  winner_id: string
}

// ── Mock-specific types ──────────────────────────────────────────────────────

export interface MockUser extends User {
  password: string
}

export interface MockTournament extends Tournament {
  playerIds: string[]
}

// ── Service interface types ──────────────────────────────────────────────────

export interface AuthService {
  login(email: string, password: string): Promise<User>
  register(email: string, password: string, name?: string): Promise<User>
  logout(): Promise<void>
  getCurrentUser(): Promise<User | null>
}

export interface PlayersService {
  getAll(): Promise<Player[]>
  getById(id: string): Promise<Player>
  create(data: PlayerCreate): Promise<Player>
  update(id: string, data: PlayerUpdate): Promise<Player>
  remove(id: string): Promise<null>
}

export interface TournamentsService {
  getAll(): Promise<Tournament[]>
  getById(id: string): Promise<TournamentWithPlayers>
  create(data: TournamentCreate): Promise<Tournament>
  update(id: string, data: TournamentUpdate): Promise<Tournament>
  remove(id: string): Promise<null>
  addPlayer(tournamentId: string, playerId: string): Promise<null>
  removePlayer(tournamentId: string, playerId: string): Promise<null>
  updateSeeds(tournamentId: string, seededPlayerIds: string[]): Promise<void>
}

export interface MatchesService {
  getByTournament(tournamentId: string): Promise<Match[]>
  generateDraw(tournamentId: string, seededPlayerIds: string[]): Promise<Match[]>
  enterResult(matchId: string, data: MatchResultInput): Promise<Match>
  advanceWinner(tournamentId: string, round: number, position: number, winnerId: string): Promise<void>
  reset(tournamentId: string): Promise<void>
}
