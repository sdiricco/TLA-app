import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean
    requiresAuth?: boolean
    requiresAdmin?: boolean
    organizationSetup?: boolean
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
      path: '/register',
      name: 'register',
      component: RegisterView,
      meta: { public: true },
    },
    {
      path: '/',
      component: () => import('../layouts/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: 'organizations',
          name: 'organizations',
          component: () => import('../views/OrganizationsView.vue'),
          meta: { requiresAuth: true, organizationSetup: true },
        },
        {
          path: 'organizations/explore',
          name: 'organizations-explore',
          component: () => import('../views/OrganizationExplorerView.vue'),
          meta: { requiresAuth: true, organizationSetup: true },
        },
        {
          path: 'organizations/new',
          name: 'organization-create',
          component: () => import('../views/OrganizationCreateView.vue'),
          meta: { requiresAuth: true, organizationSetup: true },
        },
        {
          path: 'organizations/edit',
          name: 'organization-edit',
          component: () => import('../views/OrganizationEditView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true },
        },
        {
          path: 'changelog',
          name: 'changelog',
          component: () => import('../views/ChangelogView.vue'),
          meta: { requiresAuth: true, organizationSetup: true },
        },
        {
          path: 'requests',
          name: 'requests',
          component: () => import('../views/RequestsView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'requests/:id',
          name: 'request-detail',
          component: () => import('../views/RequestDetailView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: '',
          name: 'home',
          redirect: () => ({ name: 'tournaments' }),
        },
        {
          path: 'tournaments',
          name: 'tournaments',
          component: () => import('../views/TournamentsView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'tournaments/new',
          name: 'tournament-create',
          component: () => import('../views/TournamentFormView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true },
        },
        {
          path: 'tournaments/:id/edit',
          name: 'tournament-edit',
          component: () => import('../views/TournamentFormView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true },
        },
        {
          path: 'tournaments/:id',
          name: 'tournament-detail',
          component: () => import('../views/TournamentDetailView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'tournaments/:id/matches/:matchId',
          name: 'match-detail',
          component: () => import('../views/MatchDetailView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'players',
          name: 'players',
          component: () => import('../views/PlayersView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'players/new',
          name: 'player-create',
          component: () => import('../views/PlayerFormView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true },
        },
        {
          path: 'players/:id/edit',
          name: 'player-edit',
          component: () => import('../views/PlayerFormView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true },
        },
        {
          path: 'players/:id',
          name: 'player-detail',
          component: () => import('../views/PlayerProfileView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'profile',
          name: 'profile',
          component: () => import('../views/ProfileView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('../views/SettingsView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'admin/feature-flags',
          name: 'admin-feature-flags',
          redirect: () => ({ name: 'settings' }),
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

  if (to.meta.requiresAuth && auth.isAuthenticated) {
    const { useOrganizationsStore } = await import('../stores/organizations')
    const organizations = useOrganizationsStore()
    if (!organizations.initialized) {
      try {
        await organizations.load()
      } catch {
        // Keep the authenticated user inside the app so the organizations page
        // can show the real loading error instead of failing navigation.
      }
    }
    if (auth.isGuest && to.name === 'profile') {
      return { name: organizations.activeOrganization ? 'tournaments' : 'organizations' }
    }
  }

  // Authenticated on login page → redirect by role
  if ((to.name === 'login' || to.name === 'register') && auth.isAuthenticated) {
    return { name: 'home' }
  }

  // Player trying to access admin-only route
  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return { name: 'tournaments' }
  }

  return true
})

export default router
