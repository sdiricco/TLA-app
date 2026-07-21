import type { OrganizationFilter, TournamentCategory, TournamentStatus } from '@/types'

export interface TournamentFilterOption<T> {
  label: string
  value: 'all' | T
  icon: string
}

export interface TournamentFilters {
  category: 'all' | TournamentCategory
  status: 'all' | TournamentStatus
  dateRange: Date[] | null
  organizationId: OrganizationFilter
}

export type TournamentFilterKey = keyof TournamentFilters
