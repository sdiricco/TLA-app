import type { OrganizerProfile, OrganizerSummary, OrganizersService, OrganizationFilter } from '@/types'
import { apiClient } from './apiClient'
import { apiRequest } from './request'

export const organizersService: OrganizersService = {
  getAll: (query?: { organizationId?: OrganizationFilter }) =>
    apiRequest<OrganizerSummary[]>(apiClient, {
      url: '/organizers',
      method: 'GET',
      params: query,
    }),
  getById: (id, query) =>
    apiRequest<OrganizerProfile>(apiClient, {
      url: `/organizers/${id}`,
      method: 'GET',
      params: query,
    }),
}
