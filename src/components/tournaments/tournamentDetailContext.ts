import { inject, type InjectionKey, type Ref } from 'vue'
import type { TournamentWithPlayers } from '@/types'

export interface TournamentDetailContext {
  tournament: Ref<TournamentWithPlayers>
  reloadTournament: () => Promise<void>
}

/** Shared state exposed by the tournament detail layout to its child routes. */
export const tournamentDetailKey: InjectionKey<TournamentDetailContext> = Symbol('tournament-detail')

/**
 * Returns the nearest tournament detail context.
 *
 * Throwing immediately makes an accidental use outside the nested route fail
 * during development instead of producing harder-to-debug undefined values.
 */
export function useTournamentDetail(): TournamentDetailContext {
  const context = inject(tournamentDetailKey)
  if (!context) throw new Error('Tournament detail context is not available')
  return context
}
