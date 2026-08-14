import { Router } from 'express'
import { prisma } from '../db/prisma'
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth'
import { resendSignupConfirmation, signInWithPassword, signUpWithPassword } from '../lib/supabaseAuth'
import { getOrCreateProfile, listUnlinkedProfiles, type StoredProfile } from '../lib/profileRepo'
import { requireOrganization, requireSelectedOrganization, type OrganizationRequest } from '../middleware/requireOrganization'

export const authRouter = Router()

function serializeUser(profile: StoredProfile, email = profile.email) {
  return {
    id: profile.id,
    email,
    name: profile.name ?? undefined,
    role: profile.role,
    onboardingCompleted: Boolean(profile.onboardingCompletedAt),
    onboardingIntent: profile.onboardingIntent ?? undefined,
  }
}

function emailConfirmationRedirect(origin?: string): string | undefined {
  if (!origin) return undefined

  try {
    const url = new URL(origin)
    const isLocalDevelopment = url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
    if (url.protocol !== 'https:' && !isLocalDevelopment) return undefined

    // Keep the callback on the application root so static SPA hosting does not
    // need a dedicated rewrite rule for links opened directly from an email.
    url.pathname = '/'
    url.search = ''
    url.hash = ''
    return url.toString()
  } catch {
    return undefined
  }
}

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
        onboardingCompleted: true,
        onboardingIntent: 'explore',
      },
    })
    return
  }

  try {
    const profile = await getOrCreateProfile(authUser)
    res.json({
      user: serializeUser(profile),
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
      user: serializeUser(profile, session.user.email ?? profile.email),
    })
  } catch (error) {
    res.status(401).json({
      message: error instanceof Error ? error.message : 'Login failed',
    })
  }
})

authRouter.post('/register', async (req, res) => {
  const { email, password, name } = req.body as { email?: string; password?: string; name?: string }
  const redirectTo = emailConfirmationRedirect(req.get('origin'))

  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required' })
    return
  }

  try {
    const session = await signUpWithPassword(email, password, name, redirectTo)

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
      user: serializeUser(profile, session.user.email ?? profile.email),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed'

    if (message.toLowerCase().includes('already registered')) {
      try {
        await resendSignupConfirmation(email.trim(), redirectTo)
        res.status(200).json({
          requires_email_confirmation: true,
          email: email.trim(),
          message: 'Questo account esiste già ma potrebbe non essere confermato. Ti abbiamo inviato un nuovo link di conferma.',
        })
        return
      } catch (resendError) {
        const resendMessage = resendError instanceof Error ? resendError.message : ''
        if (resendMessage.toLowerCase().includes('already confirmed')) {
          res.status(409).json({ message: 'Esiste già un account con questa email. Accedi con le tue credenziali.' })
          return
        }
      }
    }

    const status = message.toLowerCase().includes('rate limit') ? 429 : 400
    res.status(status).json({ message })
  }
})

authRouter.post('/resend-confirmation', async (req, res) => {
  const { email } = req.body as { email?: string }
  const redirectTo = emailConfirmationRedirect(req.get('origin'))

  if (!email?.trim()) {
    res.status(400).json({ message: 'Email is required' })
    return
  }

  try {
    await resendSignupConfirmation(email.trim(), redirectTo)
    res.status(204).send()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to resend confirmation email'
    const status = message.toLowerCase().includes('rate limit') ? 429 : 400
    res.status(status).json({ message })
  }
})

authRouter.post('/logout', (_req, res) => {
  res.status(204).send()
})

authRouter.post('/onboarding', requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest
  const authUser = authReq.authUser
  const intent = req.body?.intent

  if (!authUser || authUser.id === 'guest') {
    res.status(403).json({ message: 'Accedi con un account per completare la configurazione' })
    return
  }
  if (intent !== 'player' && intent !== 'explore') {
    res.status(400).json({ message: 'Scegli come vuoi utilizzare TLA' })
    return
  }

  try {
    const profile = await getOrCreateProfile(authUser)
    if (!profile.onboardingCompletedAt) {
      await prisma.$transaction(async (tx) => {
        const claimed = await tx.profile.updateMany({
          where: { id: profile.id, onboardingCompletedAt: null },
          data: { onboardingIntent: intent, onboardingCompletedAt: new Date() },
        })
        if (claimed.count === 0 || intent !== 'player') return

        const existingPlayer = await tx.player.findFirst({
          where: { userId: profile.id, organizationId: null },
          select: { id: true },
        })
        if (existingPlayer) return

        const requestedName = typeof req.body?.player?.name === 'string' ? req.body.player.name.trim() : ''
        const name = requestedName || profile.name?.trim() || profile.email
        if (name.length < 2 || name.length > 80) throw new Error('Il nome giocatore deve contenere da 2 a 80 caratteri')

        const birthDateValue = req.body?.player?.birth_date
        const birthDate = birthDateValue ? new Date(String(birthDateValue)) : null
        if (birthDate && Number.isNaN(birthDate.getTime())) throw new Error('La data di nascita non è valida')

        await tx.player.create({
          data: {
            userId: profile.id,
            organizationId: null,
            name,
            ranking: 0,
            birthDate,
            club: typeof req.body?.player?.club === 'string' ? req.body.player.club.trim() || null : null,
            phone: typeof req.body?.player?.phone === 'string' ? req.body.player.phone.trim() || null : null,
          },
        })
      })
    }

    const updated = await getOrCreateProfile(authUser)
    res.json({ user: serializeUser(updated) })
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Configurazione non riuscita' })
  }
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
      onboardingCompleted: true,
      onboardingIntent: 'explore',
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
      onboardingCompleted: Boolean(profile.onboardingCompletedAt),
      onboardingIntent: profile.onboardingIntent,
    })
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Unable to resolve profile',
    })
  }
})

authRouter.patch('/profile', requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest
  const user = authReq.authUser
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''

  if (!user || user.id === 'guest') {
    res.status(403).json({ message: 'Accedi con un account per modificare il profilo' })
    return
  }
  if (name.length < 2 || name.length > 80) {
    res.status(400).json({ message: 'Il nome deve contenere da 2 a 80 caratteri' })
    return
  }

  const profile = await getOrCreateProfile(user)
  const updated = await prisma.profile.update({ where: { id: profile.id }, data: { name } })
  res.json({ id: updated.id, name: updated.name, role: updated.role })
})

authRouter.get('/profiles/unlinked', requireAuth, requireOrganization, requireSelectedOrganization, async (req, res) => {
  try {
    res.json(await listUnlinkedProfiles((req as OrganizationRequest).organization!.id))
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Unable to load profiles',
    })
  }
})
