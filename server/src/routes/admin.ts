import { Router, type NextFunction, type Response } from 'express'
import { prisma } from '../db/prisma'
import { AccountDeletionError, deleteUserAccount } from '../lib/accountDeletion'
import { createConfirmedSupabaseUser } from '../lib/supabaseAuth'
import { requireAuth, resolveImpersonation, type AuthenticatedRequest } from '../middleware/requireAuth'

export const adminRouter = Router()

type UserRole = 'admin' | 'player'

// -----------------------------------------------------------------------------
// Platform-admin guard
// Unlike requireAdmin, club roles never qualify, and admin tools refuse to run
// while the caller is impersonating someone else.
// -----------------------------------------------------------------------------
export async function requirePlatformAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.authUser || req.authUser.id === 'guest') {
    res.status(403).json({ message: 'Forbidden' })
    return
  }
  if (req.impersonator) {
    res.status(403).json({ message: 'Torna al tuo account per usare gli strumenti di amministrazione' })
    return
  }
  const profile = await prisma.profile.findUnique({ where: { id: req.authUser.id }, select: { role: true } })
  if (profile?.role !== 'admin') {
    res.status(403).json({ message: 'Riservato agli amministratori della piattaforma' })
    return
  }
  next()
}

adminRouter.use(requireAuth, requirePlatformAdmin)

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
interface AdminUserRow {
  id: string
  email: string
  name: string | null
  role: string
  onboarding_completed_at: Date | null
  created_at: Date
  last_sign_in_at: Date | null
  email_confirmed_at: Date | null
  player_id: string | null
  player_name: string | null
  photo_url: string | null
}

function serializeAdminUser(row: AdminUserRow) {
  return {
    id: row.id,
    email: row.email,
    name: row.name ?? row.player_name,
    role: row.role as UserRole,
    onboarding_completed: Boolean(row.onboarding_completed_at),
    created_at: row.created_at.toISOString(),
    last_sign_in_at: row.last_sign_in_at?.toISOString() ?? null,
    email_confirmed: Boolean(row.email_confirmed_at),
    player: row.player_id ? { id: row.player_id, photo_url: row.photo_url } : null,
  }
}

async function listAdminUsers(id?: string) {
  // Auth metadata (last sign-in, confirmation) lives in auth.users and is not
  // part of the Prisma schema, hence the read-only raw query.
  const rows = await prisma.$queryRaw<AdminUserRow[]>`
    select
      p.id::text as id, p.email, p.name, p.role, p.onboarding_completed_at, p.created_at,
      u.last_sign_in_at, u.email_confirmed_at,
      pl.id::text as player_id, pl.name as player_name, pl.photo_url
    from public.profiles p
    left join auth.users u on u.id = p.id
    left join lateral (
      select id, name, photo_url from public.players where user_id = p.id order by created_at limit 1
    ) pl on true
    where ${id ?? null}::text is null or p.id::text = ${id ?? null}::text
    order by (p.role = 'admin') desc, lower(coalesce(p.name, p.email))
  `
  return rows.map(serializeAdminUser)
}

async function countAdmins(): Promise<number> {
  return prisma.profile.count({ where: { role: 'admin' } })
}

// -----------------------------------------------------------------------------
// Users
// -----------------------------------------------------------------------------
adminRouter.get('/users', async (_req, res) => {
  res.json(await listAdminUsers())
})

adminRouter.post('/users', async (req, res) => {
  const { email, password, name, role } = req.body as { email?: string; password?: string; name?: string; role?: UserRole }
  if (!email?.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
    res.status(400).json({ message: 'Inserisci un indirizzo email valido' })
    return
  }
  if (!password || password.length < 8) {
    res.status(400).json({ message: 'La password deve avere almeno 8 caratteri' })
    return
  }
  try {
    const created = await createConfirmedSupabaseUser(email, password, name)
    // The signup trigger creates the profile; apply the requested name/role.
    await prisma.profile.update({
      where: { id: created.id },
      data: {
        ...(name?.trim() ? { name: name.trim() } : {}),
        role: role === 'admin' ? 'admin' : 'player',
      },
    })
    const [user] = await listAdminUsers(created.id)
    res.status(201).json(user)
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Impossibile creare l’utente' })
  }
})

adminRouter.patch('/users/:id/role', async (req, res) => {
  const authReq = req as AuthenticatedRequest
  const userId = req.params['id'] as string
  const { role } = req.body as { role?: UserRole }
  if (role !== 'admin' && role !== 'player') {
    res.status(400).json({ message: 'Ruolo non valido' })
    return
  }
  const target = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } })
  if (!target) {
    res.status(404).json({ message: 'Utente non trovato' })
    return
  }
  if (role === 'player' && target.role === 'admin') {
    if (userId === authReq.authUser!.id) {
      res.status(409).json({ message: 'Non puoi rimuovere il ruolo di amministratore a te stesso' })
      return
    }
    if (await countAdmins() <= 1) {
      res.status(409).json({ message: 'Deve restare almeno un amministratore' })
      return
    }
  }
  await prisma.profile.update({ where: { id: userId }, data: { role } })
  const [user] = await listAdminUsers(userId)
  res.json(user)
})

adminRouter.delete('/users/:id', async (req, res) => {
  const authReq = req as AuthenticatedRequest
  const userId = req.params['id'] as string
  if (userId === authReq.authUser!.id) {
    res.status(409).json({ message: 'Non puoi eliminare il tuo account da qui' })
    return
  }
  const target = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } })
  if (!target) {
    res.status(404).json({ message: 'Utente non trovato' })
    return
  }
  if (target.role === 'admin' && await countAdmins() <= 1) {
    res.status(409).json({ message: 'Deve restare almeno un amministratore' })
    return
  }
  try {
    await deleteUserAccount(userId)
    res.status(204).send()
  } catch (error) {
    res.status(error instanceof AccountDeletionError ? error.status : 503).json({
      message: error instanceof Error ? error.message : 'Impossibile eliminare l’utente',
    })
  }
})

// -----------------------------------------------------------------------------
// Impersonation
// Validates the target before the client starts sending the impersonation
// header, and leaves an audit line in the server logs.
// -----------------------------------------------------------------------------
adminRouter.post('/impersonate/:id', async (req, res) => {
  const authReq = req as AuthenticatedRequest
  const targetId = req.params['id'] as string
  const result = await resolveImpersonation(authReq.authUser!.id, targetId)
  if (!result.ok) {
    res.status(403).json({ message: result.message })
    return
  }
  console.info(
    `[impersonation] ${new Date().toISOString()} admin=${result.impersonator.id} (${result.impersonator.email}) target=${result.target.id} (${result.target.email})`,
  )
  const [user] = await listAdminUsers(targetId)
  res.json(user)
})
