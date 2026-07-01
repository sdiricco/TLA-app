import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { authService } from '../services/authApi'
import type { User } from '../types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isGuest = computed(() => user.value?.id === 'guest')

  async function init(): Promise<void> {
    user.value = await authService.getCurrentUser()
  }

  async function login(email: string, password: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      user.value = await authService.login(email, password)
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
      user.value = await authService.register(email, password, name)
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function loginAsGuest(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      user.value = await authService.loginAsGuest()
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  return { user, loading, error, isAuthenticated, isAdmin, isGuest, init, login, register, logout, loginAsGuest }
})
