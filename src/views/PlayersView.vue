<script setup lang="ts">
  import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import { RouterLink, useRouter } from 'vue-router'
  import Avatar from 'primevue/avatar'
  import Button from 'primevue/button'
  import Column from 'primevue/column'
  import DataTable from 'primevue/datatable'
  import InputText from 'primevue/inputtext'
  import Tag from 'primevue/tag'
  import { useConfirm } from 'primevue/useconfirm'
  import { useToast } from 'primevue/usetoast'
  import { useAuthStore } from '../stores/auth'
  import { usePlayersStore } from '../stores/players'
  import type { Player } from '../types'
  import { formatAge, getPlayerInitials } from '@/utils/main'

  /**
   * Interfaces
   */
  interface PageEvent {
    page?: number
    rows?: number
  }

  /**
   * Stores
   */
  const store = usePlayersStore();
  const auth = useAuthStore();
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();

  /**
   * Reactive vars
   */
  const canViewAdmin = computed(() => auth.isAdmin || auth.isGuest)
  const searchName = ref('')
  const searchClub = ref('')
  let searchTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * Action: open create player page
   */
  function openCreate(): void {
    if (auth.isGuest) return
    void router.push({ name: 'player-create' })
  }

  /**
   * Action: open edit player page
   */
  function openEdit(player: Player): void {
    if (auth.isGuest) return
    void router.push({ name: 'player-edit', params: { id: player.id } })
  }

  /**
   * Action: confirm delete player
   */
  function confirmDelete(player: Player): void {
    if (auth.isGuest) return
    confirm.require({
      message: `Eliminare ${player.name}?`,
      header: 'Conferma eliminazione',
      icon: 'pi pi-exclamation-triangle',
      rejectLabel: 'Annulla',
      acceptLabel: 'Elimina',
      accept: async () => {
        try {
          await store.remove(player.id)
          await loadPlayers(store.page, store.perPage)
          toast.add({
            severity: 'success',
            summary: 'Eliminato',
            detail: `${player.name} rimosso`,
            life: 3000,
          });
        } catch (e) {
          toast.add({
            severity: 'error',
            summary: 'Errore',
            detail: (e as Error).message,
            life: 4000,
          })
        }
      },
    })
  }

  /**
   * Function: Load players from the server with the current filters
   */
  async function loadPlayers(page = 0, perPage = store.perPage): Promise<void> {
    await store.fetchAll({
      name: searchName.value.trim() || undefined,
      club: searchClub.value.trim() || undefined,
      page,
      perPage,
    })
  }

  /**
   * Function: Handle paginator change
   */
  function onPage(event: PageEvent): void {
    void loadPlayers(event.page ?? 0, event.rows ?? store.perPage)
  }

  /**
   * Function: Clear the search filters
   */
  function clearFilters(): void {
    searchName.value = ''
    searchClub.value = ''
    void loadPlayers(0, store.perPage)
  }

  /**
   * Hooks
   */
  onMounted(() => {
    void loadPlayers()
  })

  watch([searchName, searchClub], () => {
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      void loadPlayers(0, store.perPage)
    }, 300)
  })

  onBeforeUnmount(() => {
    if (searchTimer) clearTimeout(searchTimer)
  })
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- ------------------------------------------------ -->
    <!-- Header -->
    <!-- ------------------------------------------------ -->
    <div class="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h2 class="m-0 text-2xl">Giocatori</h2>
        <p class="mt-1 mb-0 text-sm text-muted-color">
          {{ store.total }} giocatori registrati
        </p>
      </div>
      <Button
        v-if="canViewAdmin"
        label="Aggiungi"
        icon="pi pi-plus"
        :disabled="auth.isGuest"
        @click="openCreate"
      />
    </div>

    <!-- ------------------------------------------------ -->
    <!-- Filters -->
    <!-- ------------------------------------------------ -->
    <div class="grid gap-3 rounded-2xl border border-surface-200 bg-surface-0 p-4 lg:grid-cols-3">
      <div class="flex flex-col gap-1.5">
        <label for="player-name-filter" class="text-sm font-medium">Cerca per nome</label>
        <InputText
          id="player-name-filter"
          v-model="searchName"
          placeholder="Mario Rossi"
          fluid
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="player-club-filter" class="text-sm font-medium">Cerca per club</label>
        <InputText
          id="player-club-filter"
          v-model="searchClub"
          placeholder="TC Milano"
          fluid
        />
      </div>

      <div class="flex items-end gap-2">
        <Button label="Azzera filtri" severity="secondary" outlined fluid @click="clearFilters" />
      </div>
    </div>

    <!-- ------------------------------------------------ -->
    <!-- Players table -->
    <!-- ------------------------------------------------ -->
    <DataTable
      :value="store.players"
      :loading="store.loading"
      lazy
      :first="store.page * store.perPage"
      :rows="store.perPage"
      :total-records="store.total"
      :rows-per-page-options="[10, 20, 50]"
      sort-field="ranking"
      :sort-order="1"
      striped-rows
      show-gridlines
      paginator
      paginator-template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink"
      @page="onPage"
    >
      <!-- Empty slot -->
      <template #empty>
        <div class="flex flex-col items-center gap-3 py-10 px-4 text-muted-color text-center">
          <i class="pi pi-users text-[2rem] text-muted-color" />
          <p class="m-0 leading-relaxed">
            Nessun giocatore trovato.
            <br />
            Clicca
            <strong>Aggiungi</strong>
            per iniziare.
          </p>
        </div>
      </template>

      <!-- Column: photo_url -->
      <Column header="" style="width: 4rem; text-align: center">
        <template #body="{ data }">
          <Avatar
            :label="getPlayerInitials(data)"
            :image="data.photo_url ?? undefined"
            shape="circle"
            class="mx-auto"
          />
        </template>
      </Column>

      <!-- Column: ranking -->
      <Column field="ranking" header="#" sortable style="width: 4rem; text-align: center">
        <template #body="{ data }">
          <Tag v-if="data.ranking" :value="String(data.ranking)" severity="secondary" />
          <span v-else class="text-muted-color">—</span>
        </template>
      </Column>

      <!-- Column: name -->
      <Column field="name" header="Nome" sortable />

      <!-- Column: birth_date -->
      <Column header="Età" style="width: 8rem">
        <template #body="{ data }">
          <span>{{ formatAge(data.birth_date) }}</span>
        </template>
      </Column>

      <!-- Column: club -->
      <Column field="club" header="Club">
        <template #body="{ data }">
          <span v-if="data.club">{{ data.club }}</span>
          <span v-else class="text-muted-color">—</span>
        </template>
      </Column>

      <!-- Column: phone -->
      <Column field="phone" header="Contatto">
        <template #body="{ data }">
          <span v-if="data.phone">{{ data.phone }}</span>
          <span v-else class="text-muted-color">—</span>
        </template>
      </Column>

      <!-- Column: id -->
      <Column header="Profilo" style="width: 8rem">
        <template #body="{ data }">
          <RouterLink
            :to="{ name: 'player-detail', params: { id: data.id } }"
            class="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50 hover:text-primary-700"
          >
            Apri
          </RouterLink>
        </template>
      </Column>

      <!-- Column: Actions -->
      <Column header="Azioni" style="width: 7rem">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button
              v-if="canViewAdmin"
              icon="pi pi-pencil"
              text
              rounded
              size="small"
              aria-label="Modifica"
              :disabled="auth.isGuest"
              @click="openEdit(data)"
            />
            <Button
              v-if="canViewAdmin"
              icon="pi pi-trash"
              text
              rounded
              size="small"
              severity="danger"
              aria-label="Elimina"
              :disabled="auth.isGuest"
              @click="confirmDelete(data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>
  </div>
</template>
