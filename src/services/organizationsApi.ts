import type { Organization, OrganizationsService } from '../types'
import { apiClient } from './apiClient'
import { apiRequest } from './request'

export const organizationsService: OrganizationsService = {
  getAll: () => apiRequest<Organization[]>(apiClient, { url: '/organizations', method: 'GET' }),
  create: (name) => apiRequest<Organization>(apiClient, { url: '/organizations', method: 'POST', data: { name } }),
  join: (joinCode) => apiRequest<Organization>(apiClient, { url: '/organizations/join', method: 'POST', data: { join_code: joinCode } }),
}
