import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { authService } from '../services/authApi'
import type { User } from '../types'
import { useOrganizationsStore } from './organizations'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const registrationPending = ref<{ email: string; message: string } | null>(null)

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => useOrganizationsStore().isAdmin)
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
    useOrganizationsStore().clear()
  }

  async function register(email: string, password: string, name?: string): Promise<void> {
    loading.value = true
    error.value = null
    registrationPending.value = null
    try {
      const result = await authService.register(email, password, name)
      if (result.requiresEmailConfirmation) {
        user.value = null
        registrationPending.value = {
          email: result.email ?? email,
          message: result.message ?? 'Controlla la tua email per confermare l’account.',
        }
      } else {
        user.value = result.user ?? null
      }
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

  return { user, loading, error, registrationPending, isAuthenticated, isAdmin, isGuest, init, login, register, logout, loginAsGuest }
})
