import type { OrganizationRequest, OrganizationRequestCreate, OrganizationRequestUpdate, RequestsService } from '../types'
import { apiClient } from './apiClient'
import { apiRequest } from './request'

export const requestsService: RequestsService = {
  getAll: (filters) => apiRequest<OrganizationRequest[]>(apiClient, {
    url: '/requests',
    method: 'GET',
    params: {
      status: filters?.status && filters.status !== 'all' ? filters.status : undefined,
      type: filters?.type && filters.type !== 'all' ? filters.type : undefined,
    },
  }),
  create: (data: OrganizationRequestCreate) => apiRequest<OrganizationRequest>(apiClient, { url: '/requests', method: 'POST', data }),
  update: (id: string, data: OrganizationRequestUpdate) => apiRequest<OrganizationRequest>(apiClient, { url: `/requests/${id}`, method: 'PATCH', data }),
}
