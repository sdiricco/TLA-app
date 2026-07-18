import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { organizationsService } from '../services/organizationsApi'
import type { Organization, OrganizationUpdate, OrganizationVisibility } from '../types'

const STORAGE_KEY = 'tla_organization_id'

export const useOrganizationsStore = defineStore('organizations', () => {
  const organizations = ref<Organization[]>([])
  const activeId = ref<string | null>(localStorage.getItem(STORAGE_KEY))
  const loading = ref(false)
  const initialized = ref(false)
  const error = ref<string | null>(null)

  const activeOrganization = computed(() => organizations.value.find(item => item.id === activeId.value) ?? null)
  const isAdmin = computed(() => ['owner', 'admin'].includes(activeOrganization.value?.role ?? ''))

  function select(id: string): void {
    if (!organizations.value.some(item => item.id === id)) return
    activeId.value = id
    localStorage.setItem(STORAGE_KEY, id)
  }

  async function load(): Promise<void> {
    if (loading.value) return
    loading.value = true
    error.value = null
    try {
      organizations.value = await organizationsService.getAll()
      if (!activeId.value || !organizations.value.some(item => item.id === activeId.value)) {
        const firstId = organizations.value[0]?.id ?? null
        activeId.value = firstId
        if (firstId) localStorage.setItem(STORAGE_KEY, firstId)
        else localStorage.removeItem(STORAGE_KEY)
      }
      initialized.value = true
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function create(name: string, visibility: OrganizationVisibility, latitude?: number | null, longitude?: number | null, discoverable?: boolean, description?: string | null): Promise<Organization> {
    const organization = await organizationsService.create(name, visibility, latitude, longitude, discoverable, description)
    organizations.value.push(organization)
    select(organization.id)
    return organization
  }

  async function joinPublic(id: string): Promise<Organization> {
    const organization = await organizationsService.joinPublic(id)
    const index = organizations.value.findIndex(item => item.id === organization.id)
    if (index >= 0) organizations.value[index] = organization
    else organizations.value.push(organization)
    select(organization.id)
    return organization
  }

  async function join(code: string): Promise<Organization> {
    const organization = await organizationsService.join(code)
    const index = organizations.value.findIndex(item => item.id === organization.id)
    if (index >= 0) organizations.value[index] = organization
    else organizations.value.push(organization)
    select(organization.id)
    return organization
  }

  async function requestAccess(id: string): Promise<{ organization: Organization; status: 'pending' | 'approved' }> {
    return organizationsService.requestAccess(id)
  }

  async function update(id: string, data: OrganizationUpdate): Promise<Organization> {
    const organization = await organizationsService.update(id, data)
    const index = organizations.value.findIndex(item => item.id === id)
    if (index >= 0) organizations.value[index] = organization
    return organization
  }

  function clear(): void {
    organizations.value = []
    activeId.value = null
    initialized.value = false
    localStorage.removeItem(STORAGE_KEY)
  }

  return { organizations, activeId, activeOrganization, loading, initialized, error, isAdmin, select, load, create, join, joinPublic, requestAccess, update, clear }
})
