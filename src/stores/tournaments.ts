import { defineStore } from 'pinia'
import { ref } from 'vue'
import { tournamentsService } from '../services/tournamentsApi'
import type { Tournament, TournamentCreate, TournamentUpdate, TournamentWithPlayers } from '../types'

export const useTournamentsStore = defineStore('tournaments', () => {
  const tournaments = ref<Tournament[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      tournaments.value = await tournamentsService.getAll()
    } catch (e) {
      error.value = (e as Error).message
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
