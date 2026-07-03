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
    description: 'Formato supportato subito. Tabellone classico a eliminazione singola.',
    icon: 'pi pi-sitemap',
  },
  {
    format: 'double_elimination',
    title: 'Doppia eliminazione',
    description: 'Formato previsto in futuro con bracket dei vincenti e dei ripescati.',
    icon: 'pi pi-replay',
    locked: true,
  },
  {
    format: 'round_robin',
    title: "Girone all'italiana",
    description: 'Tutti contro tutti, organizzati per giornate, con classifica aggiornata dai risultati.',
    icon: 'pi pi-list',
  },
  {
    format: 'round_robin_elimination',
    title: 'Gironi + finale',
    description: 'Formato previsto per le fasi a gironi seguite dal tabellone finale.',
    icon: 'pi pi-objects-column',
    locked: true,
  },
]

export const tournamentFormatLabels: Record<TournamentFormat, string> = {
  single_elimination: 'Eliminazione diretta',
  double_elimination: 'Doppia eliminazione',
  round_robin: "Girone all'italiana",
  round_robin_elimination: 'Gironi + finale',
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
    round_robin_elimination: false,
  },
  categories: {
    maschile: true,
    femminile: true,
  },
}
