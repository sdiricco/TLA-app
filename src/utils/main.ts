import { Player } from '@/types';

export function formatAge(birthDate: string | null | undefined): string {
  if (!birthDate) return 'Età non disponibile';
  const dob = new Date(birthDate);
  if (Number.isNaN(dob.getTime())) return 'Età non disponibile';
  const diff = Date.now() - dob.getTime();
  const ageDate = new Date(diff);
  return `${Math.abs(ageDate.getUTCFullYear() - 1970)} anni`;
}

export function getPlayerInitials(player: Player): string {
  return player.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function toDateString(value: Date | null): string | null {
  return value ? (value.toISOString().split('T')[0] ?? null) : null;
}
