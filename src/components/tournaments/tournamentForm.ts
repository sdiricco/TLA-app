import type { TournamentFormatDefinition } from '@/config/tournamentFormats'
import type { TournamentCategory, TournamentFormat, TournamentStatus } from '@/types'

export interface TournamentFormModel {
  name: string
  location: string
  registration_start_date: Date | null
  registration_end_date: Date | null
  game_formula: string
  registration_fee: number | null
  start_date: Date | null
  end_date: Date | null
  format: TournamentFormat
  category: TournamentCategory
  status: TournamentStatus
  participant_limit: number | null
  group_count: number | null
  qualifiers_per_group: number | null
}

export interface TournamentSelectOption<T> {
  label: string
  value: T
  disabled?: boolean
}

export interface TournamentFormatOption extends TournamentFormatDefinition {
  enabled: boolean
  selected: boolean
  locked: boolean
  selectable: boolean
}
