import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { authService } from '../services/authApi'
import { clearGuestToken, setAuthToken } from '../services/token'
import type { User } from '../types'
import { useOrganizationsStore } from './organizations'

export const useAuthStore = defineStore('auth', () => {
  type EmailConfirmationStatus = 'idle' | 'processing' | 'success' | 'error'

  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const registrationPending = ref<{ email: string; message: string } | null>(null)
  const emailConfirmation = ref<{ status: EmailConfirmationStatus; message: string }>({
    status: 'idle',
    message: '',
  })

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin' || useOrganizationsStore().isAdmin)
  const isGuest = computed(() => user.value?.id === 'guest')

  async function init(): Promise<void> {
    const callbackHandled = consumeSupabaseConfirmationCallback()
    if (callbackHandled || emailConfirmation.value.status !== 'idle') return

    user.value = await authService.getCurrentUser()
  }

  function consumeSupabaseConfirmationCallback(): boolean {
    if (typeof window === 'undefined' || !window.location.hash) return false

    const params = new URLSearchParams(window.location.hash.slice(1))
    const callbackError = params.get('error_description') ?? params.get('error')
    const accessToken = params.get('access_token')
    const type = params.get('type')

    if (callbackError) {
      emailConfirmation.value = {
        status: 'error',
        message: callbackError.replaceAll('+', ' '),
      }
      clearCallbackFromAddressBar()
      return true
    }

    if (!accessToken || (type && type !== 'signup')) return false

    emailConfirmation.value = { status: 'processing', message: 'Stiamo confermando il tuo account…' }
    clearGuestToken()
    setAuthToken(accessToken)
    registrationPending.value = null
    clearCallbackFromAddressBar()

    return true
  }

  async function completeEmailConfirmation(): Promise<void> {
    if (emailConfirmation.value.status !== 'processing') return

    user.value = await authService.getCurrentUser()
    if (!user.value) {
      emailConfirmation.value = {
        status: 'error',
        message: 'Il link non è più valido oppure è scaduto. Accedi o richiedi una nuova email di conferma.',
      }
      return
    }

    emailConfirmation.value = {
      status: 'success',
      message: 'Il tuo indirizzo email è stato confermato. Il tuo account è pronto.',
    }
  }

  function clearCallbackFromAddressBar(): void {
    window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`)
  }

  function beginRegistration(): void {
    registrationPending.value = null
    emailConfirmation.value = { status: 'idle', message: '' }
    error.value = null
  }

  function clearRegistration(): void {
    registrationPending.value = null
    error.value = null
  }

  function clearEmailConfirmation(): void {
    emailConfirmation.value = { status: 'idle', message: '' }
  }

  async function login(email: string, password: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      user.value = await authService.login(email, password)
      if (user.value) registrationPending.value = null
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function logout(): Promise<void> {
    await authService.logout()
    user.value = null
    registrationPending.value = null
    emailConfirmation.value = { status: 'idle', message: '' }
    error.value = null
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

  async function resendConfirmation(): Promise<void> {
    if (!registrationPending.value) return

    loading.value = true
    error.value = null
    try {
      await authService.resendConfirmation(registrationPending.value.email)
      registrationPending.value = {
        ...registrationPending.value,
        message: 'Ti abbiamo inviato un nuovo link di conferma. Controlla anche la cartella spam.',
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
      registrationPending.value = null
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    loading,
    error,
    registrationPending,
    emailConfirmation,
    isAuthenticated,
    isAdmin,
    isGuest,
    init,
    completeEmailConfirmation,
    beginRegistration,
    clearRegistration,
    clearEmailConfirmation,
    login,
    register,
    resendConfirmation,
    logout,
    loginAsGuest,
  }
})
