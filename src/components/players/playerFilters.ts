import type { OrganizationFilter, PlayerSortField, SortOrder } from '@/types'

export interface PlayerFilters {
  club: string
  sortBy: PlayerSortField
  sortOrder: SortOrder
  organizationId: OrganizationFilter
}

export interface PlayerFilterOption<T> {
  label: string
  value: T
}
