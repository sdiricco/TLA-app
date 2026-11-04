import { ref } from 'vue'
import { defineStore } from 'pinia'
import { notificationsService } from '@/services/notificationsApi'
import type { AppNotification, NotificationStatus } from '@/types'

export const useNotificationsStore = defineStore('notifications', () => {
  const items = ref<AppNotification[]>([])
  const unreadCount = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadUnreadCount(): Promise<void> {
    try {
      unreadCount.value = (await notificationsService.getUnreadCount()).count
    } catch {
      unreadCount.value = 0
    }
  }

  async function load(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      items.value = await notificationsService.getAll()
      const unread = items.value.filter((item) => item.status === 'pending' && !item.read_at)
      await Promise.all(unread.map((item) => notificationsService.markRead(item.id)))
      const readAt = new Date().toISOString()
      items.value = items.value.map((item) => unread.some(({ id }) => id === item.id) ? { ...item, read_at: readAt } : item)
      unreadCount.value = 0
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Impossibile caricare le notifiche'
    } finally {
      loading.value = false
    }
  }

  async function respond(id: string, decision: Extract<NotificationStatus, 'accepted' | 'declined'>): Promise<string> {
    const response = await notificationsService.respond(id, decision)
    items.value = items.value.map((item) => item.id === id ? { ...item, status: decision, read_at: item.read_at ?? new Date().toISOString() } : item)
    return response.organization_id
  }

  return { items, unreadCount, loading, error, load, loadUnreadCount, respond }
})
