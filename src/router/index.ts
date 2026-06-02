import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean
    requiresAuth?: boolean
    requiresAdmin?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { public: true },
    },
    {
      path: '/',
      component: () => import('../layouts/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'home',
          redirect: () => ({ name: 'tournaments' }), // replaced by guard below
        },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('../views/HomeView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true },
        },
        {
          path: 'tournaments',
          name: 'tournaments',
          component: () => import('../views/TournamentsView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'tournaments/:id',
          name: 'tournament-detail',
          component: () => import('../views/TournamentDetailView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'players',
          name: 'players',
          component: () => import('../views/PlayersView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true },
        },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const { useAuthStore } = await import('../stores/auth')
  const auth = useAuthStore()

  if (!auth.user) await auth.init()

  // Not authenticated → login
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' }
  }

  // Authenticated on login page → redirect by role
  if (to.name === 'login' && auth.isAuthenticated) {
    return auth.isAdmin ? { name: 'dashboard' } : { name: 'tournaments' }
  }

  // Player trying to access admin-only route
  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return { name: 'tournaments' }
  }

  // Root path: redirect by role
  if (to.name === 'home') {
    return auth.isAdmin ? { name: 'dashboard' } : { name: 'tournaments' }
  }

  return true
})

export default router
