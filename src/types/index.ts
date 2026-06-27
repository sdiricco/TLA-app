// ── Domain types ────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'player'

export interface User {
  id: string
  email: string
  name?: string
  role: UserRole
}

export interface Profile {
  id: string
  name: string | null
  role: UserRole
}

export interface Player {
  id: string
  name: string
  ranking: number
  club?: string | null
  phone?: string | null
  user_id?: string | null
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
  published: boolean
  participant_limit?: number | null
  group_count?: number | null
  qualifiers_per_group?: number | null
  created_at?: string
  updated_at?: string
}

export type TournamentCreate = Omit<Tournament, 'id' | 'created_at' | 'updated_at'>
export type TournamentUpdate = Partial<TournamentCreate>

// ── Tournament detail ────────────────────────────────────────────────────────

export interface TournamentPlayer {
  player_id: string
  seed: number | null
  enrolled_at?: string
}

export interface TournamentWithPlayers extends Tournament {
  tournament_players?: TournamentPlayer[]
  playerIds?: string[]
}

// ── Matches ──────────────────────────────────────────────────────────────────

export type MatchStatus = 'pending' | 'completed'

export interface Match {
  id: string
  tournament_id: string
  round: number
  position: number
  player1_id: string | null
  player2_id: string | null
  result: string | null
  winner_id: string | null
  status: MatchStatus
  created_at?: string
  updated_at?: string
}

export type MatchSlot = 'player1_id' | 'player2_id'

export interface MatchResultInput {
  result: string
  winner_id: string
}

export interface MatchAssignInput {
  slot: MatchSlot
  player_id: string | null
}

// ── Mock-specific types ──────────────────────────────────────────────────────

export interface MockUser extends User {
  password: string
}

export interface MockTournament extends Tournament {
  playerIds: string[]
}

// ── Service interface types ──────────────────────────────────────────────────

export interface ProfilesService {
  getMyProfile(): Promise<Profile>
  getUnlinkedProfiles(): Promise<Profile[]>
}

export interface AuthService {
  login(email: string, password: string): Promise<User>
  register(email: string, password: string, name?: string): Promise<User>
  loginAsGuest(): Promise<User>
  logout(): Promise<void>
  getCurrentUser(): Promise<User | null>
}

export interface PlayersService {
  getAll(): Promise<Player[]>
  getById(id: string): Promise<Player>
  create(data: PlayerCreate): Promise<Player>
  update(id: string, data: PlayerUpdate): Promise<Player>
  remove(id: string): Promise<null>
  getMyPlayer(): Promise<Player | null>
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
  setPublished(tournamentId: string, published: boolean): Promise<Tournament>
  enroll(tournamentId: string): Promise<null>
  withdraw(tournamentId: string): Promise<null>
}

export interface MatchesService {
  getByTournament(tournamentId: string): Promise<Match[]>
  createEmptyBracket(tournamentId: string, numPlayers: number): Promise<Match[]>
  assignPlayer(matchId: string, data: MatchAssignInput): Promise<Match>
  enterResult(matchId: string, data: MatchResultInput): Promise<Match>
  reset(tournamentId: string): Promise<void>
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface TournamentStats {
  upcoming: number
  ongoing: number
  completed: number
  totalPlayers: number
}

export interface PendingEnrollment {
  playerName: string
  tournamentName: string
  enrolledAt: string
}
