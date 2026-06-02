import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { matchesService } from '../services/matchesService'
import type { Match, MatchResultInput } from '../types'

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

  const numRounds = computed(() => {
    if (matches.value.length === 0) return 0
    return Math.max(...matches.value.map((match) => match.round))
  })

  async function loadForTournament(tournamentId: string): Promise<void> {
    loading.value = true
    try {
      matches.value = await matchesService.getByTournament(tournamentId)
    } finally {
      loading.value = false
    }
  }

  async function generateDraw(tournamentId: string, seededPlayerIds: string[]): Promise<void> {
    matches.value = await matchesService.generateDraw(tournamentId, seededPlayerIds)
  }

  async function enterResult(matchId: string, data: MatchResultInput): Promise<void> {
    const updated = await matchesService.enterResult(matchId, data)
    const index = matches.value.findIndex((match) => match.id === matchId)
    if (index !== -1) matches.value[index] = updated
    matches.value = await matchesService.getByTournament(updated.tournament_id)
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
    generateDraw,
    enterResult,
    reset,
  }
})
