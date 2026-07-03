import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { matchesService } from '../services/matchesApi'
import type { Match, MatchAssignInput, MatchResultInput, MatchRound, TournamentMatchesResponse } from '../types'

export const useMatchesStore = defineStore('matches', () => {
  const matches = ref<Match[]>([])
  const response = ref<TournamentMatchesResponse | null>(null)
  const loading = ref(false)

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

  async function loadForTournament(tournamentId: string): Promise<void> {
    loading.value = true
    try {
      response.value = await matchesService.getByTournament(tournamentId)
      matches.value = response.value.matches
    } finally {
      loading.value = false
    }
  }

  async function createEmptyBracket(tournamentId: string, numPlayers: number): Promise<void> {
    await matchesService.createEmptyBracket(tournamentId, numPlayers)
    await loadForTournament(tournamentId)
  }

  async function assignPlayer(matchId: string, data: MatchAssignInput): Promise<void> {
    const updated = await matchesService.assignPlayer(matchId, data)
    await loadForTournament(updated.tournament_id)
  }

  async function enterResult(matchId: string, data: MatchResultInput): Promise<void> {
    const updated = await matchesService.enterResult(matchId, data)
    await loadForTournament(updated.tournament_id)
  }

  async function reset(tournamentId: string): Promise<void> {
    await matchesService.reset(tournamentId)
    matches.value = []
    response.value = null
  }

  return {
    matches,
    rounds,
    draw,
    loading,
    matchesByRound,
    numRounds,
    loadForTournament,
    createEmptyBracket,
    assignPlayer,
    enterResult,
    reset,
  }
})
