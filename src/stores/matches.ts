import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { matchesService } from '../services/matchesService'
import type { Match, MatchAssignInput, MatchResultInput } from '../types'

export const useMatchesStore = defineStore('matches', () => {
  const matches = ref<Match[]>([])
  const loading = ref(false)

  const matchesByRound = computed(() => {
    const map = new Map<number, Match[]>()
    for (const match of matches.value) {
      const roundMatches = map.get(match.round) ?? []
      roundMatches[match.position] = match
      map.set(match.round, roundMatches)
    }
    return map
  })

  const numRounds = computed(() =>
    matches.value.length === 0 ? 0 : Math.max(...matches.value.map((m) => m.round)),
  )

  async function loadForTournament(tournamentId: string): Promise<void> {
    loading.value = true
    try {
      matches.value = await matchesService.getByTournament(tournamentId)
    } finally {
      loading.value = false
    }
  }

  async function createEmptyBracket(tournamentId: string, numPlayers: number): Promise<void> {
    matches.value = await matchesService.createEmptyBracket(tournamentId, numPlayers)
  }

  async function assignPlayer(matchId: string, data: MatchAssignInput): Promise<void> {
    const updated = await matchesService.assignPlayer(matchId, data)
    const index = matches.value.findIndex((m) => m.id === matchId)
    if (index !== -1) matches.value[index] = updated
  }

  async function enterResult(matchId: string, data: MatchResultInput): Promise<void> {
    const updated = await matchesService.enterResult(matchId, data)
    const index = matches.value.findIndex((m) => m.id === matchId)
    if (index !== -1) matches.value[index] = updated
  }

  async function reset(tournamentId: string): Promise<void> {
    await matchesService.reset(tournamentId)
    matches.value = []
  }

  return {
    matches,
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
