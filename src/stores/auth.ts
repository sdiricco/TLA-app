import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { authService } from '../services/authService'
import { profilesService } from '../services/profilesService'
import type { User } from '../types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  async function init(): Promise<void> {
    const authUser = await authService.getCurrentUser()
    if (authUser) {
      try {
        const profile = await profilesService.getMyProfile()
        user.value = { ...authUser, role: profile.role }
      } catch {
        // If profile fetch fails (e.g. new user, no profile yet), default to player
        user.value = { ...authUser, role: 'player' }
      }
    }
  }

  async function login(email: string, password: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const authUser = await authService.login(email, password)
      const profile = await profilesService.getMyProfile()
      user.value = { ...authUser, role: profile.role }
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function logout(): Promise<void> {
    await authService.logout()
    user.value = null
  }

  async function register(email: string, password: string, name?: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const authUser = await authService.register(email, password, name)
      // Newly registered users are always 'player'
      user.value = { ...authUser, role: 'player' }
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  return { user, loading, error, isAuthenticated, isAdmin, init, login, register, logout }
})
