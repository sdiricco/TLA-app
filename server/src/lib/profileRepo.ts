import { prisma } from '../db/prisma'
import { env } from '../config/env'
import type { SupabaseAuthUser } from './supabaseAuth'

export interface StoredProfile {
  id: string
  email: string
  name: string | null
  role: 'admin' | 'player'
}

function mapProfile(profile: {
  id: string
  email: string
  name: string | null
  role: string
}): StoredProfile {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role as StoredProfile['role'],
  }
}

export async function getOrCreateProfile(
  authUser: SupabaseAuthUser,
  fallbackRole: StoredProfile['role'] = 'player',
): Promise<StoredProfile> {
  const email = authUser.email?.trim()
  if (!email) {
    throw new Error('Authenticated user is missing an email address')
  }

  const name = (authUser.user_metadata?.name as string | undefined) ?? null

  if (!env.databaseUrl) {
    return mapProfile({
      id: authUser.id,
      email,
      name,
      role: fallbackRole,
    })
  }

  const profile = await prisma.profile.upsert({
    where: { id: authUser.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
    create: {
      id: authUser.id,
      email,
      name,
      role: fallbackRole,
    },
    update: {
      email,
      name,
    },
  })

  return mapProfile(profile)
}

export async function getProfileByUserId(userId: string): Promise<StoredProfile | null> {
  if (!env.databaseUrl) return null

  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  })

  return profile ? mapProfile(profile) : null
}

export async function listUnlinkedProfiles(): Promise<StoredProfile[]> {
  if (!env.databaseUrl) return []

  const profiles = await prisma.profile.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
    where: {
      role: 'player',
      player: null,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return profiles.map(mapProfile)
}
