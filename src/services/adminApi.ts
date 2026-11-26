import type { AxiosError, AxiosRequestConfig } from 'axios'
import type { AdminUser, AdminUserCreate, UserRole } from '../types'
import { apiClient } from './apiClient'
import { apiRequest } from './request'

// Surfaces the server's explanation (e.g. "Deve restare almeno un
// amministratore") instead of the generic Axios status message.
async function adminRequest<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    return await apiRequest<T>(apiClient, config)
  } catch (error) {
    const message = (error as AxiosError<{ message?: string }>).response?.data?.message
    throw new Error(message ?? (error as Error).message)
  }
}

// Platform-admin endpoints. The server rejects them for any other role and
// while an impersonation is active.
export const adminService = {
  listUsers: () => adminRequest<AdminUser[]>({ url: '/admin/users', method: 'GET' }),
  createUser: (data: AdminUserCreate) => adminRequest<AdminUser>({ url: '/admin/users', method: 'POST', data }),
  updateRole: (id: string, role: UserRole) =>
    adminRequest<AdminUser>({ url: `/admin/users/${encodeURIComponent(id)}/role`, method: 'PATCH', data: { role } }),
  deleteUser: (id: string) => adminRequest<void>({ url: `/admin/users/${encodeURIComponent(id)}`, method: 'DELETE' }),
  startImpersonation: (id: string) =>
    adminRequest<AdminUser>({ url: `/admin/impersonate/${encodeURIComponent(id)}`, method: 'POST' }),
}
