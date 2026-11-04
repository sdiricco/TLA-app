import type { AppNotification, NotificationStatus } from '@/types'
import { apiClient } from './apiClient'
import { apiRequest } from './request'

export const notificationsService = {
  getAll: () => apiRequest<AppNotification[]>(apiClient, { url: '/notifications', method: 'GET' }),
  getUnreadCount: () => apiRequest<{ count: number }>(apiClient, { url: '/notifications/unread-count', method: 'GET' }),
  markRead: (id: string) => apiRequest<null>(apiClient, { url: `/notifications/${id}/read`, method: 'PATCH' }),
  respond: (id: string, decision: Extract<NotificationStatus, 'accepted' | 'declined'>) =>
    apiRequest<{ id: string; status: NotificationStatus; organization_id: string }>(apiClient, {
      url: `/notifications/${id}/respond`,
      method: 'POST',
      data: { decision },
    }),
}
