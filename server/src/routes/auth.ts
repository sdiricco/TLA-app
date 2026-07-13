import { Router } from 'express'
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth'
import { signInWithPassword, signUpWithPassword } from '../lib/supabaseAuth'
import { getOrCreateProfile, listUnlinkedProfiles } from '../lib/profileRepo'
import { requireOrganization, type OrganizationRequest } from '../middleware/requireOrganization'

export const authRouter = Router()

authRouter.get('/me', requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest
  const authUser = authReq.authUser

  if (!authUser) {
    res.status(401).json({ message: 'Not authenticated' })
    return
  }

  if (authUser.id === 'guest') {
    res.json({
      user: {
        id: 'guest',
        email: 'ospite@local',
        name: 'Ospite',
        role: 'player',
      },
    })
    return
  }

  try {
    const profile = await getOrCreateProfile(authUser)
    res.json({
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name ?? undefined,
        role: profile.role,
      },
    })
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Unable to resolve profile',
    })
  }
})

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string }

  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required' })
    return
  }

  try {
    const session = await signInWithPassword(email, password)
    const profile = await getOrCreateProfile(session.user)
    res.json({
      token: session.access_token,
      user: {
        id: session.user.id,
        email: session.user.email ?? profile.email,
        name: profile.name ?? undefined,
        role: profile.role,
      },
    })
  } catch (error) {
    res.status(401).json({
      message: error instanceof Error ? error.message : 'Login failed',
    })
  }
})

authRouter.post('/register', async (req, res) => {
  const { email, password, name } = req.body as { email?: string; password?: string; name?: string }

  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required' })
    return
  }

  try {
    const session = await signUpWithPassword(email, password, name)

    if (!session.access_token) {
      res.status(200).json({
        requires_email_confirmation: true,
        email: email.trim(),
        message: 'Registrazione completata, ma serve confermare l’email prima del login.',
      })
      return
    }

    const profile = await getOrCreateProfile(session.user)
    res.status(201).json({
      token: session.access_token,
      user: {
        id: session.user.id,
        email: session.user.email ?? profile.email,
        name: profile.name ?? name ?? undefined,
        role: profile.role,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed'
    const status = message.toLowerCase().includes('rate limit') ? 429 : 400
    res.status(status).json({ message })
  }
})

authRouter.post('/logout', (_req, res) => {
  res.status(204).send()
})

authRouter.get('/profile', requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest
  const user = authReq.authUser

  if (!user) {
    res.status(401).json({ message: 'Not authenticated' })
    return
  }

  if (user.id === 'guest') {
    res.json({
      id: 'guest',
      email: 'ospite@local',
      name: 'Ospite',
      role: 'player',
    })
    return
  }

  try {
    const profile = await getOrCreateProfile(user)
    res.json({
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
    })
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Unable to resolve profile',
    })
  }
})

authRouter.get('/profiles/unlinked', requireAuth, requireOrganization, async (req, res) => {
  try {
    res.json(await listUnlinkedProfiles((req as OrganizationRequest).organization!.id))
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Unable to load profiles',
    })
  }
})
