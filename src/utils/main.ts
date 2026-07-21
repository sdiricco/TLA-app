import moment from 'moment';
import type { Player } from '@/types';

export function formatAge(birthDate: string | null | undefined): string {
  if (!birthDate) return 'Età non disponibile';

  const dob = moment(birthDate, moment.ISO_8601, true);
  if (!dob.isValid()) return 'Età non disponibile';

  return `${moment().diff(dob, 'years')} anni`;
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
  return value ? moment(value).format('YYYY-MM-DD') : null;
}
