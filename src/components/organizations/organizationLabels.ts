import type { Organization, OrganizationPreview } from '@/types'

export function organizationRoleLabel(role: Organization['role']): string {
  if (role === 'owner') return 'Proprietario'
  if (role === 'admin') return 'Amministratore'
  return 'Membro'
}

export function organizationRoleSeverity(role: Organization['role']): 'success' | 'info' | 'secondary' {
  if (role === 'owner') return 'success'
  if (role === 'admin') return 'info'
  return 'secondary'
}

export function organizationVisibilityLabel(organization: Pick<OrganizationPreview, 'visibility' | 'discoverable'>): string {
  if (organization.visibility === 'public') return 'Pubblica'
  return organization.discoverable ? 'Privata · visibile' : 'Privata · nascosta'
}

// Italian connectors are skipped so "Amici del Martedì" becomes "AM".
const INITIALS_STOP_WORDS = new Set(['di', 'del', 'della', 'dei', 'delle', 'e', 'il', 'la', 'le', 'lo', 'gli', 'i'])

export function organizationInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter((word) => /^[A-Za-zÀ-ÿ0-9]/.test(word) && !INITIALS_STOP_WORDS.has(word.toLowerCase()))
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('') || name.slice(0, 2).toUpperCase()
}

export function canManageOrganization(organization: Pick<Organization, 'role'>): boolean {
  return organization.role === 'owner' || organization.role === 'admin'
}
