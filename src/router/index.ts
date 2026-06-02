import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'

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
          component: () => import('../views/HomeView.vue'),
        },
        {
          path: 'tournaments',
          name: 'tournaments',
          component: () => import('../views/TournamentsView.vue'),
        },
        {
          path: 'tournaments/:id',
          name: 'tournament-detail',
          component: () => import('../views/TournamentDetailView.vue'),
        },
        {
          path: 'players',
          name: 'players',
          component: () => import('../views/PlayersView.vue'),
        },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const { useAuthStore } = await import('../stores/auth')
  const auth = useAuthStore()

  if (!auth.user) await auth.init()

  if (to.meta['requiresAuth'] && !auth.isAuthenticated) {
    return { name: 'login' }
  }

  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'home' }
  }

  return true
})

export default router
