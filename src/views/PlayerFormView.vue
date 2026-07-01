<script setup lang="ts">
  import { computed, onMounted, ref, watch } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import Button from 'primevue/button';
  import Card from 'primevue/card';
  import DatePicker from 'primevue/datepicker';
  import InputNumber from 'primevue/inputnumber';
  import InputText from 'primevue/inputtext';
  import { useToast } from 'primevue/usetoast';
  import PlayerPhotoPicker from '../components/player/PlayerPhotoPicker.vue';
  import { useAuthStore } from '../stores/auth';
  import { usePlayersStore } from '../stores/players';
  import type { PlayerCreate } from '../types';
  import { toDateString } from '@/utils/main';

  /**
   * Interfaces
   */
  interface PlayerForm {
    name: string;
    ranking: number | null;
    birth_date: Date | null;
    photo_url: string;
    club: string;
    phone: string;
  }

  /**
   * Stores
   */
  const route = useRoute();
  const router = useRouter();
  const auth = useAuthStore();
  const store = usePlayersStore();
  const toast = useToast();

  /**
   * Reactive vars
   */
  const saving = ref(false);
  const loadingPlayer = ref(false);

  const form = ref<PlayerForm>({
    name: '',
    ranking: null,
    birth_date: null,
    photo_url: '',
    club: '',
    phone: '',
  });

  const editingId = computed(() => (route.params['id'] ? String(route.params['id']) : null));
  const isEditing = computed(() => editingId.value !== null);

  /**
   * Function: Empty form
   */
  function emptyForm(): PlayerForm {
    return { name: '', ranking: null, birth_date: null, photo_url: '', club: '', phone: '' };
  }

  /**
   * Function: Convert player form data structure into player create data structure
   */
  function toPlayerPayload(data: PlayerForm): PlayerCreate {
    return {
      name: data.name,
      ranking: data.ranking ?? 0,
      birth_date: toDateString(data.birth_date),
      photo_url: data.photo_url || null,
      club: data.club || null,
      phone: data.phone || null,
    };
  }

  /**
   * Function: Fetch player
   */
  async function fetchPlayer(id: string): Promise<void> {
    loadingPlayer.value = true;
    try {
      const player = await store.getById(id);
      form.value = {
        name: player.name,
        ranking: player.ranking,
        birth_date: player.birth_date ? new Date(player.birth_date) : null,
        photo_url: player.photo_url ?? '',
        club: player.club ?? '',
        phone: player.phone ?? '',
      };
    } catch {
      toast.add({
        severity: 'error',
        summary: 'Errore',
        detail: 'Giocatore non trovato',
        life: 3000,
      });
      await router.push({ name: 'players' });
    } finally {
      loadingPlayer.value = false;
    }
  }

  /**
   * Function: Save player
   */
  async function savePlayer(): Promise<void> {
    if (auth.isGuest) return;
    saving.value = true;
    try {
      const payload = toPlayerPayload(form.value);
      const player = isEditing.value
        ? await store.update(editingId.value as string, payload)
        : await store.create(payload);

      toast.add({
        severity: 'success',
        summary: 'Salvato',
        detail: isEditing.value ? 'Giocatore aggiornato' : 'Giocatore creato',
        life: 3000,
      });
      await router.push({ name: 'player-detail', params: { id: player.id } });
    } catch (e) {
      toast.add({ severity: 'error', summary: 'Errore', detail: (e as Error).message, life: 4000 });
    } finally {
      saving.value = false;
    }
  }

  async function cancel(): Promise<void> {
    if (editingId.value) {
      await router.push({ name: 'player-detail', params: { id: editingId.value } });
      return;
    }
    await router.push({ name: 'players' });
  }

  onMounted(() => {
    form.value = emptyForm();
  });

  watch(
    editingId,
    async (id) => {
      if (!id) {
        form.value = emptyForm();
        return;
      }
      await fetchPlayer(id);
    },
    { immediate: true }
  );
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h2 class="m-0 text-2xl">{{ isEditing ? 'Modifica giocatore' : 'Nuovo giocatore' }}</h2>
        <p class="mt-1 mb-0 text-sm text-muted-color">
          {{
            isEditing
              ? 'Aggiorna i dati dell’anagrafica'
              : 'Inserisci i dati anagrafici del nuovo giocatore'
          }}
        </p>
      </div>
      <Button label="Annulla" severity="secondary" outlined @click="cancel" />
    </div>

    <div v-if="loadingPlayer" class="flex justify-center py-10">
      <i class="pi pi-spin pi-spinner text-[2rem] text-primary-500" />
    </div>

    <Card v-else>
      <template #content>
        <form class="flex flex-col gap-5" @submit.prevent="savePlayer">
          <div class="grid gap-4 lg:grid-cols-2">
            <div class="flex flex-col gap-1.5">
              <label for="p-name" class="text-sm font-medium">Nome *</label>
              <InputText
                id="p-name"
                v-model="form.name"
                placeholder="Mario Rossi"
                fluid
                required
                autofocus
              />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="flex flex-col gap-1.5">
                <label for="p-ranking" class="text-sm font-medium">Ranking</label>
                <InputNumber
                  id="p-ranking"
                  v-model="form.ranking"
                  placeholder="1"
                  :min="1"
                  :max="9999"
                  fluid
                />
              </div>
              <div class="flex flex-col gap-1.5">
                <label for="p-birth-date" class="text-sm font-medium">Data nascita</label>
                <DatePicker
                  id="p-birth-date"
                  v-model="form.birth_date"
                  date-format="dd/mm/yy"
                  placeholder="gg/mm/aaaa"
                  fluid
                  show-button-bar
                />
              </div>
            </div>
          </div>

          <PlayerPhotoPicker v-model="form.photo_url" />

          <div class="grid gap-4 lg:grid-cols-2">
            <div class="flex flex-col gap-1.5">
              <label for="p-club" class="text-sm font-medium">Club</label>
              <InputText id="p-club" v-model="form.club" placeholder="TC Milano" fluid />
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="p-phone" class="text-sm font-medium">Contatto</label>
              <InputText id="p-phone" v-model="form.phone" placeholder="333-0000000" fluid />
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <Button type="button" label="Annulla" severity="secondary" outlined @click="cancel" />
            <Button type="submit" :label="isEditing ? 'Salva' : 'Crea'" :loading="saving" />
          </div>
        </form>
      </template>
    </Card>
  </div>
</template>
