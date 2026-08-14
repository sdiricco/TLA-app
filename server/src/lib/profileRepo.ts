import { prisma } from '../db/prisma'
import { env } from '../config/env'
import type { SupabaseAuthUser } from './supabaseAuth'

export interface StoredProfile {
  id: string
  email: string
  name: string | null
  role: 'admin' | 'player'
  onboardingIntent: 'player' | 'manager' | 'explore' | null
  onboardingCompletedAt: Date | null
}

function mapProfile(profile: {
  id: string
  email: string
  name: string | null
  role: string
  onboardingIntent: string | null
  onboardingCompletedAt: Date | null
}): StoredProfile {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role as StoredProfile['role'],
    onboardingIntent: profile.onboardingIntent as StoredProfile['onboardingIntent'],
    onboardingCompletedAt: profile.onboardingCompletedAt,
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

  const metadataName = authUser.user_metadata?.name
  const name = typeof metadataName === 'string' && metadataName.trim()
    ? metadataName.trim()
    : null

  if (!env.databaseUrl) {
    return mapProfile({
      id: authUser.id,
      email,
      name,
      role: fallbackRole,
      onboardingIntent: null,
      onboardingCompletedAt: null,
    })
  }

  let profile = await prisma.profile.upsert({
    where: { id: authUser.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      onboardingIntent: true,
      onboardingCompletedAt: true,
    },
    create: {
      id: authUser.id,
      email,
      name,
      role: fallbackRole,
    },
    update: {
      email,
    },
  })

  // The application profile is the source of truth after registration. Only
  // backfill an empty profile from Auth metadata, so a later login cannot
  // overwrite a name edited from the profile page with stale signup metadata.
  if (!profile.name && name) {
    profile = await prisma.profile.update({
      where: { id: profile.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        onboardingIntent: true,
        onboardingCompletedAt: true,
      },
      data: { name },
    })
  }

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
      onboardingIntent: true,
      onboardingCompletedAt: true,
    },
  })

  return profile ? mapProfile(profile) : null
}

export async function listUnlinkedProfiles(organizationId: string): Promise<StoredProfile[]> {
  if (!env.databaseUrl) return []

  const profiles = await prisma.profile.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      onboardingIntent: true,
      onboardingCompletedAt: true,
    },
    where: {
      role: 'player',
      players: { none: { organizationId } },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return profiles.map(mapProfile)
}
