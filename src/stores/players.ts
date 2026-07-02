import { defineStore } from 'pinia'
import { ref } from 'vue'
import { playersService } from '../services/playersApi'
import type { PaginatedResponse, Player, PlayerCreate, PlayerListQuery, PlayerUpdate } from '../types'

export const usePlayersStore = defineStore('players', () => {
  const players = ref<Player[]>([])
  const page = ref(0)
  const perPage = ref(20)
  const total = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll(query?: PlayerListQuery): Promise<PaginatedResponse<Player>> {
    loading.value = true
    error.value = null
    try {
      const response = await playersService.getAll(query)
      players.value = response.values
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

  async function getById(id: string): Promise<Player> {
    return playersService.getById(id)
  }

  async function create(data: PlayerCreate): Promise<Player> {
    const newPlayer = await playersService.create(data)
    players.value.push(newPlayer)
    total.value += 1
    return newPlayer
  }

  async function update(id: string, data: PlayerUpdate): Promise<Player> {
    const updated = await playersService.update(id, data)
    const index = players.value.findIndex((p) => p.id === id)
    if (index !== -1) players.value[index] = updated
    return updated
  }

  async function remove(id: string): Promise<void> {
    await playersService.remove(id)
    players.value = players.value.filter((p) => p.id !== id)
    total.value = Math.max(0, total.value - 1)
  }

  return {
    players,
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
  }
})
