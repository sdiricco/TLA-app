import type { Organization, OrganizationSearchResponse, OrganizationUpdate, OrganizationVisibility, OrganizationsService } from '../types'
import { apiClient } from './apiClient'
import { apiRequest } from './request'

export const organizationsService: OrganizationsService = {
  getAll: () => apiRequest<Organization[]>(apiClient, { url: '/organizations', method: 'GET' }),
  discover: (query, page = 1, perPage = 12) => apiRequest<OrganizationSearchResponse>(apiClient, { url: '/organizations/discover', method: 'GET', params: { q: query || undefined, page, per_page: perPage } }),
  create: (name, visibility: OrganizationVisibility) => apiRequest<Organization>(apiClient, { url: '/organizations', method: 'POST', data: { name, visibility } }),
  join: (joinCode) => apiRequest<Organization>(apiClient, { url: '/organizations/join', method: 'POST', data: { join_code: joinCode } }),
  joinPublic: (id) => apiRequest<Organization>(apiClient, { url: '/organizations/join', method: 'POST', data: { organization_id: id } }),
  update: (id, data: OrganizationUpdate) => apiRequest<Organization>(apiClient, { url: `/organizations/${id}`, method: 'PATCH', data: { ...data, regenerate_code: data.regenerateCode } }),
}
