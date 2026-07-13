// ── Domain types ────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'player'

export interface User {
  id: string
  email: string
  name?: string
  role: UserRole
}

export interface RegistrationResult {
  user?: User
  requiresEmailConfirmation?: boolean
  message?: string
  email?: string
}

export interface Profile {
  id: string
  name: string | null
  role: UserRole
}

export type OrganizationRole = 'owner' | 'admin' | 'member'
export type OrganizationVisibility = 'public' | 'private'

export interface Organization {
  id: string
  name: string
  slug?: string
  description?: string | null
  city?: string | null
  sport?: string | null
  visibility?: OrganizationVisibility
  member_count?: number
  join_code: string
  role: OrganizationRole
}

export type OrganizationPreview = Omit<Organization, 'join_code' | 'role'> & {
  join_code?: string
  role?: OrganizationRole
}

export interface OrganizationUpdate {
  visibility?: OrganizationVisibility
  description?: string | null
  city?: string | null
  sport?: string | null
  regenerateCode?: boolean
}

export interface OrganizationSearchResponse {
  items: OrganizationPreview[]
  page: number
  per_page: number
  total: number
  has_more: boolean
}

export interface Player {
  id: string
  name: string
  ranking: number
  birth_date?: string | null
  photo_url?: string | null
  club?: string | null
  phone?: string | null
  user_id?: string | null
  created_at?: string
  updated_at?: string
}

export type PlayerCreate = Omit<Player, 'id' | 'created_at' | 'updated_at'>
export type PlayerUpdate = Partial<PlayerCreate>
export type PlayerSortField = 'ranking' | 'name' | 'club' | 'created_at'
export type SortOrder = 'asc' | 'desc'

export interface PlayerListQuery {
  name?: string
  club?: string
  page?: number
  perPage?: number
  sortBy?: PlayerSortField
  sortOrder?: SortOrder
}

export interface PaginatedResponse<T> {
  page: number
  perPage: number
  total: number
  values: T[]
}

export type TournamentFormat =
  | 'single_elimination'
  | 'double_elimination'
  | 'round_robin'
  | 'round_robin_elimination'

export type TournamentCategory = 'maschile' | 'femminile'

export type TournamentStatus = 'upcoming' | 'ongoing' | 'completed'

export interface Tournament {
  id: string
  name: string
  location?: string | null
  registration_start_date?: string | null
  registration_end_date?: string | null
  game_formula?: string | null
  registration_fee?: number | null
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

export interface TournamentListQuery {
  name?: string
  category?: TournamentCategory
  status?: TournamentStatus
  dateFrom?: string
  dateTo?: string
  page?: number
  perPage?: number
}

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

export type MatchStatus = 'waiting' | 'ready' | 'completed'

export interface Match {
  id: string
  tournament_id: string
  round_index: number
  position: number
  player1_id: string | null
  player2_id: string | null
  result: string | null
  winner_id: string | null
  status: MatchStatus
  created_at?: string
  updated_at?: string
}

export interface PlayerRecentMatch {
  id: string
  tournament_id: string
  tournament_name: string
  opponent_id: string
  opponent_name: string
  opponent_photo_url: string | null
  result: string
  outcome: 'win' | 'loss'
  played_at: string
}

export interface PlayerMatchHistory {
  stats: {
    played: number
    wins: number
    losses: number
    win_rate: number
  }
  recent_form: Array<'win' | 'loss'>
  recent_matches: PlayerRecentMatch[]
}

export interface MatchRound {
  index: number
  name: string
  short_name: string
  matches_count: number
  completed_matches_count: number
}

export interface TournamentMatchesResponse {
  tournament: Pick<Tournament, 'id' | 'name' | 'format' | 'category' | 'status'>
  draw: {
    draw_size: number
    participants_count: number
    rounds_count: number
  }
  rounds: MatchRound[]
  matches: Match[]
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
  register(email: string, password: string, name?: string): Promise<RegistrationResult>
  loginAsGuest(): Promise<User>
  logout(): Promise<void>
  getCurrentUser(): Promise<User | null>
}

export interface OrganizationsService {
  getAll(): Promise<Organization[]>
  discover(query?: string, page?: number, perPage?: number): Promise<OrganizationSearchResponse>
  create(name: string, visibility: OrganizationVisibility): Promise<Organization>
  join(joinCode: string): Promise<Organization>
  joinPublic(id: string): Promise<Organization>
  update(id: string, data: OrganizationUpdate): Promise<Organization>
}

export interface PlayersService {
  getAll(query?: PlayerListQuery): Promise<PaginatedResponse<Player>>
  getById(id: string): Promise<Player>
  getMatchHistory(id: string): Promise<PlayerMatchHistory>
  create(data: PlayerCreate): Promise<Player>
  update(id: string, data: PlayerUpdate): Promise<Player>
  remove(id: string): Promise<null>
  getMyPlayer(): Promise<Player | null>
}

export interface TournamentsService {
  getAll(query?: TournamentListQuery): Promise<PaginatedResponse<Tournament>>
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
  getByTournament(tournamentId: string): Promise<TournamentMatchesResponse>
  downloadDrawPdf(tournamentId: string): Promise<Blob>
  createEmptyBracket(tournamentId: string, numPlayers: number): Promise<Match[]>
  assignPlayer(matchId: string, data: MatchAssignInput): Promise<Match>
  enterResult(matchId: string, data: MatchResultInput): Promise<Match>
  reset(tournamentId: string): Promise<void>
}
