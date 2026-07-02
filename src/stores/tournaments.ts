import { defineStore } from 'pinia'
import { ref } from 'vue'
import { tournamentsService } from '../services/tournamentsApi'
import type {
  PaginatedResponse,
  Tournament,
  TournamentCreate,
  TournamentListQuery,
  TournamentUpdate,
  TournamentWithPlayers,
} from '../types'

export const useTournamentsStore = defineStore('tournaments', () => {
  const tournaments = ref<Tournament[]>([])
  const page = ref(0)
  const perPage = ref(12)
  const total = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll(query?: TournamentListQuery): Promise<PaginatedResponse<Tournament>> {
    loading.value = true
    error.value = null
    try {
      const response = await tournamentsService.getAll(query)
      tournaments.value = response.values
      page.value = response.page
      perPage.value = response.perPage
      total.value = response.total
      return response
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getById(id: string): Promise<TournamentWithPlayers> {
    return tournamentsService.getById(id)
  }

  async function create(data: TournamentCreate): Promise<Tournament> {
    const tournament = await tournamentsService.create(data)
    tournaments.value.unshift(tournament)
    total.value += 1
    return tournament
  }

  async function update(id: string, data: TournamentUpdate): Promise<Tournament> {
    const updated = await tournamentsService.update(id, data)
    const index = tournaments.value.findIndex((tournament) => tournament.id === id)
    if (index !== -1) tournaments.value[index] = updated
    return updated
  }

  async function remove(id: string): Promise<void> {
    await tournamentsService.remove(id)
    tournaments.value = tournaments.value.filter((tournament) => tournament.id !== id)
    total.value = Math.max(0, total.value - 1)
  }

  async function addPlayer(tournamentId: string, playerId: string): Promise<void> {
    await tournamentsService.addPlayer(tournamentId, playerId)
  }

  async function removePlayer(tournamentId: string, playerId: string): Promise<void> {
    await tournamentsService.removePlayer(tournamentId, playerId)
  }

  async function updateSeeds(tournamentId: string, seededPlayerIds: string[]): Promise<void> {
    await tournamentsService.updateSeeds(tournamentId, seededPlayerIds)
  }

  async function setPublished(id: string, published: boolean): Promise<void> {
    const updated = await tournamentsService.setPublished(id, published)
    const index = tournaments.value.findIndex((t) => t.id === id)
    if (index !== -1) tournaments.value[index] = updated
  }

  async function enroll(id: string): Promise<void> {
    await tournamentsService.enroll(id)
    await getById(id)
  }

  async function withdraw(id: string): Promise<void> {
    await tournamentsService.withdraw(id)
    await getById(id)
  }

  return {
    tournaments,
    page,
    perPage,
    total,
    loading,
    error,
    fetchAll,
    getById,
    create,
    update,
    remove,
    addPlayer,
    removePlayer,
    updateSeeds,
    setPublished,
    enroll,
    withdraw,
  }
})
