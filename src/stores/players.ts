import { defineStore } from 'pinia'
import { ref } from 'vue'
import { playersService } from '../services/playersService'
import type { Player, PlayerCreate, PlayerUpdate } from '../types'

export const usePlayersStore = defineStore('players', () => {
  const players = ref<Player[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      players.value = await playersService.getAll()
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function create(data: PlayerCreate): Promise<Player> {
    const newPlayer = await playersService.create(data)
    players.value.push(newPlayer)
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
  }

  return { players, loading, error, fetchAll, create, update, remove }
})
