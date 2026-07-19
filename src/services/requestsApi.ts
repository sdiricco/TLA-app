import type { OrganizationRequest, OrganizationRequestComment, OrganizationRequestCreate, OrganizationRequestUpdate, RequestsService } from '../types'
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
  getById: (id: string) => apiRequest<OrganizationRequest>(apiClient, { url: `/requests/${id}`, method: 'GET' }),
  getComments: (id: string) => apiRequest<OrganizationRequestComment[]>(apiClient, { url: `/requests/${id}/comments`, method: 'GET' }),
  create: (data: OrganizationRequestCreate) => apiRequest<OrganizationRequest>(apiClient, { url: '/requests', method: 'POST', data }),
  createComment: (id: string, body: string) => apiRequest<OrganizationRequestComment>(apiClient, { url: `/requests/${id}/comments`, method: 'POST', data: { body } }),
  update: (id: string, data: OrganizationRequestUpdate) => apiRequest<OrganizationRequest>(apiClient, { url: `/requests/${id}`, method: 'PATCH', data }),
  markImportant: (id: string) => apiRequest<OrganizationRequest>(apiClient, { url: `/requests/${id}/important`, method: 'POST' }),
}
