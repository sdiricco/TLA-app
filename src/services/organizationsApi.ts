import type { Organization, OrganizationPreview, OrganizationVisibility, OrganizationsService } from '../types'
import { apiClient } from './apiClient'
import { apiRequest } from './request'

export const organizationsService: OrganizationsService = {
  getAll: () => apiRequest<Organization[]>(apiClient, { url: '/organizations', method: 'GET' }),
  discover: (query) => apiRequest<OrganizationPreview[]>(apiClient, { url: '/organizations/discover', method: 'GET', params: query ? { q: query } : undefined }),
  create: (name, visibility: OrganizationVisibility) => apiRequest<Organization>(apiClient, { url: '/organizations', method: 'POST', data: { name, visibility } }),
  join: (joinCode) => apiRequest<Organization>(apiClient, { url: '/organizations/join', method: 'POST', data: { join_code: joinCode } }),
  joinPublic: (id) => apiRequest<Organization>(apiClient, { url: '/organizations/join', method: 'POST', data: { organization_id: id } }),
}
