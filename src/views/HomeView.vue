<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue';
  import Card from 'primevue/card';
  import { useTournamentsStore } from '../stores/tournaments';
  import { usePlayersStore } from '../stores/players';
  import type { TournamentStats } from '../types';

  /**
   * Stores
   */
  const tournamentsStore = useTournamentsStore();
  const playersStore = usePlayersStore();

  /**
   * Reactive vars
   */
  const loading = ref(false);

  const stats = computed<TournamentStats>(() => ({
    upcoming: tournamentsStore.tournaments.filter((t) => t.status === 'upcoming').length,
    ongoing: tournamentsStore.tournaments.filter((t) => t.status === 'ongoing').length,
    completed: tournamentsStore.tournaments.filter((t) => t.status === 'completed').length,
    totalPlayers: playersStore.players.length,
  }));

  const statCards = computed(() => [
    {
      label: 'Upcoming',
      value: stats.value.upcoming,
      icon: 'pi pi-calendar',
      color: 'text-blue-500',
    },
    { label: 'In corso', value: stats.value.ongoing, icon: 'pi pi-play', color: 'text-green-500' },
    {
      label: 'Completati',
      value: stats.value.completed,
      icon: 'pi pi-check-circle',
      color: 'text-surface-400',
    },
    {
      label: 'Giocatori',
      value: stats.value.totalPlayers,
      icon: 'pi pi-users',
      color: 'text-primary-500',
    },
  ]);

  /**
   * Component hook: onMounted
   * Fetch tournaments and players
   */
  onMounted(async () => {
    loading.value = true;
    await Promise.all([tournamentsStore.fetchAll(), playersStore.fetchAll()]);
    loading.value = false;
  });
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- ------------------------------------------------ -->
    <!-- Header -->
    <!-- ------------------------------------------------ -->
    <div>
      <h2 class="m-0 text-2xl font-bold">Dashboard</h2>
      <p class="mt-1 mb-0 text-sm text-muted-color">Riepilogo attività</p>
    </div>

    <!-- ------------------------------------------------ -->
    <!-- Stats card -->
    <!-- ------------------------------------------------ -->
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card v-for="card in statCards" :key="card.label">
        <template #content>
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="m-0 text-sm text-muted-color">{{ card.label }}</p>
              <p class="m-0 text-3xl font-bold mt-1">{{ card.value }}</p>
            </div>
            <i :class="[card.icon, card.color, 'text-3xl']" />
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>
