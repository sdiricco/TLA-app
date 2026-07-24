import type { TournamentCategory, TournamentFormat } from '../types'

export type SupportedTournamentFormat = TournamentFormat
export type LockedTournamentFormat = Exclude<TournamentFormat, 'single_elimination' | 'round_robin'>

export interface TournamentFormatDefinition {
  format: TournamentFormat
  title: string
  description: string
  icon: string
  locked?: boolean
}

export interface TournamentCategoryDefinition {
  category: TournamentCategory
  title: string
  description: string
  icon: string
}

export const tournamentFormatDefinitions: TournamentFormatDefinition[] = [
  {
    format: 'single_elimination',
    title: 'Eliminazione diretta',
    description: 'Tabellone classico: chi perde viene eliminato dal torneo.',
    icon: 'pi pi-sitemap',
  },
  {
    format: 'double_elimination',
    title: 'Doppia eliminazione',
    description: 'Tabelloni separati per vincenti e ripescati.',
    icon: 'pi pi-replay',
    locked: true,
  },
  {
    format: 'round_robin',
    title: "Girone all'italiana",
    description: 'Tutti contro tutti, con calendario e classifica aggiornata.',
    icon: 'pi pi-list',
  },
  {
    format: 'round_robin_elimination',
    title: 'Torneo a fasi',
    description: 'Una sequenza libera di fasi, ognuna con ingresso e qualificati definiti.',
    icon: 'pi pi-objects-column',
  },
]

export const tournamentFormatLabels: Record<TournamentFormat, string> = {
  single_elimination: 'Eliminazione diretta',
  double_elimination: 'Doppia eliminazione',
  round_robin: "Girone all'italiana",
  round_robin_elimination: 'Torneo a fasi',
}

export const tournamentCategoryDefinitions: TournamentCategoryDefinition[] = [
  {
    category: 'maschile',
    title: 'Maschile',
    description: 'Categoria torneo maschile.',
    icon: 'pi pi-user',
  },
  {
    category: 'femminile',
    title: 'Femminile',
    description: 'Categoria torneo femminile.',
    icon: 'pi pi-user',
  },
]

export const tournamentCategoryLabels: Record<TournamentCategory, string> = {
  maschile: 'Maschile',
  femminile: 'Femminile',
}

export const defaultTournamentFeatureFlags = {
  formats: {
    double_elimination: false,
    round_robin_elimination: true,
  },
  categories: {
    maschile: true,
    femminile: true,
  },
}
