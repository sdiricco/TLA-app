import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { matchesService } from '../services/matchesApi'
import type {
  Match,
  MatchAssignInput,
  MatchResultInput,
  MatchRound,
  TournamentMatchesResponse,
  TournamentWithPlayers,
} from '../types'

export const useMatchesStore = defineStore('matches', () => {
  const matches = ref<Match[]>([])
  const response = ref<TournamentMatchesResponse | null>(null)
  const loading = ref(false)
  const activePhaseId = ref<string | null>(null)

  const matchesByRound = computed(() => {
    const map = new Map<number, Match[]>()
    for (const match of matches.value) {
      const roundMatches = map.get(match.round_index) ?? []
      roundMatches[match.position] = match
      map.set(match.round_index, roundMatches)
    }
    return map
  })

  const rounds = computed<MatchRound[]>(() => response.value?.rounds ?? [])
  const draw = computed(() => response.value?.draw ?? null)
  const numRounds = computed(() => response.value?.draw.rounds_count ?? 0)

  async function loadForTournament(tournamentId: string, phaseId?: string): Promise<void> {
    loading.value = true
    try {
      response.value = await matchesService.getByTournament(tournamentId, phaseId)
      matches.value = response.value.matches
      activePhaseId.value = response.value.phase?.id ?? phaseId ?? null
    } finally {
      loading.value = false
    }
  }

  async function createEmptyBracket(tournamentId: string, numPlayers: number, phaseId?: string): Promise<void> {
    const targetPhaseId = phaseId ?? activePhaseId.value ?? undefined
    await matchesService.createEmptyBracket(tournamentId, numPlayers, targetPhaseId)
    await loadForTournament(tournamentId, targetPhaseId)
  }

  async function completePhase(tournamentId: string, phaseId: string): Promise<TournamentWithPlayers> {
    const tournament = await matchesService.completePhase(tournamentId, phaseId)
    const nextPhase = tournament.phases?.find((phase) => phase.status === 'active')
    await loadForTournament(tournamentId, nextPhase?.id)
    return tournament
  }

  async function assignPlayer(matchId: string, data: MatchAssignInput): Promise<void> {
    const updated = await matchesService.assignPlayer(matchId, data)
    await loadForTournament(updated.tournament_id, updated.phase_id ?? activePhaseId.value ?? undefined)
  }

  async function enterResult(matchId: string, data: MatchResultInput): Promise<void> {
    const updated = await matchesService.enterResult(matchId, data)
    await loadForTournament(updated.tournament_id, updated.phase_id ?? activePhaseId.value ?? undefined)
  }

  async function reset(tournamentId: string, phaseId?: string): Promise<void> {
    const targetPhaseId = phaseId ?? activePhaseId.value ?? undefined
    await matchesService.reset(tournamentId, targetPhaseId)
    matches.value = []
    response.value = null
  }

  return {
    matches,
    rounds,
    draw,
    loading,
    activePhaseId,
    matchesByRound,
    numRounds,
    loadForTournament,
    createEmptyBracket,
    completePhase,
    assignPlayer,
    enterResult,
    reset,
  }
})
