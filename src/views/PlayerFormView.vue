<script setup lang="ts">
  import { computed, onMounted, ref, watch } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import Avatar from 'primevue/avatar';
  import Button from 'primevue/button';
  import DatePicker from 'primevue/datepicker';
  import InputNumber from 'primevue/inputnumber';
  import InputText from 'primevue/inputtext';
  import Skeleton from 'primevue/skeleton';
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
  const previewInitials = computed(() =>
    form.value.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );

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
  <div class="player-form-page">
    <header class="page-header">
      <div>
        <button class="back-link" type="button" @click="cancel"><i class="pi pi-arrow-left" /> {{ isEditing ? 'Torna al profilo' : 'Tutti i giocatori' }}</button>
        <p class="eyebrow">{{ isEditing ? 'MODIFICA ATLETA' : 'NUOVO ATLETA' }}</p>
        <h1>{{ isEditing ? 'Aggiorna il profilo.' : 'Aggiungi un giocatore.' }}</h1>
        <p class="page-subtitle">{{ isEditing ? 'Mantieni aggiornati dati personali e informazioni sportive.' : 'Crea una nuova identità sportiva nel roster del circolo.' }}</p>
      </div>
    </header>

    <div v-if="loadingPlayer" class="form-layout">
      <div class="preview-card loading-preview"><Skeleton shape="circle" size="8rem" /><Skeleton width="75%" height="2rem" /><Skeleton width="45%" height="1rem" /></div>
      <div class="form-card loading-form"><Skeleton v-for="item in 5" :key="item" width="100%" height="4rem" borderRadius="12px" /></div>
    </div>

    <form v-else class="form-layout" @submit.prevent="savePlayer">
      <aside class="preview-card">
        <p class="preview-label">ANTEPRIMA PROFILO</p>
        <div class="avatar-wrap">
          <Avatar :label="previewInitials" :image="form.photo_url || undefined" shape="circle" />
          <span class="active-dot" />
        </div>
        <h2>{{ form.name || 'Nome giocatore' }}</h2>
        <p><i class="pi pi-building-columns" /> {{ form.club || 'Club non specificato' }}</p>
        <div class="preview-ranking"><small>RANKING</small><strong>#{{ form.ranking || '—' }}</strong><span>Posizione nel club</span></div>
        <div class="preview-note"><i class="pi pi-eye" /><span>L’anteprima si aggiorna mentre compili il modulo.</span></div>
      </aside>

      <section class="form-card">
        <div class="form-section">
          <header class="section-heading"><span><i class="pi pi-user" /></span><div><h2>Identità sportiva</h2><p>Nome e posizione nel ranking</p></div></header>
          <div class="fields-grid identity-grid">
            <div class="field name-field">
              <label for="p-name" class="text-sm font-medium">Nome *</label>
              <span class="input-wrap"><i class="pi pi-user" /><InputText id="p-name" v-model="form.name" placeholder="Mario Rossi" fluid required autofocus /></span>
            </div>

            <div class="field">
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
          </div>
        </div>

        <div class="form-divider" />

        <div class="form-section">
          <header class="section-heading"><span><i class="pi pi-address-book" /></span><div><h2>Anagrafica e contatti</h2><p>Informazioni personali del giocatore</p></div></header>
          <div class="fields-grid">
              <div class="field">
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
            <div class="field">
              <label for="p-club" class="text-sm font-medium">Club</label>
              <span class="input-wrap"><i class="pi pi-building-columns" /><InputText id="p-club" v-model="form.club" placeholder="TC Milano" fluid /></span>
            </div>

            <div class="field phone-field">
              <label for="p-phone" class="text-sm font-medium">Contatto</label>
              <span class="input-wrap"><i class="pi pi-phone" /><InputText id="p-phone" v-model="form.phone" placeholder="333 0000000" fluid /></span>
            </div>
          </div>
        </div>

        <div class="form-divider" />

        <div class="form-section">
          <header class="section-heading"><span><i class="pi pi-camera" /></span><div><h2>Foto profilo</h2><p>Immagine quadrata per avatar e scheda atleta</p></div></header>
          <PlayerPhotoPicker v-model="form.photo_url" />
        </div>

        <footer class="form-actions">
          <span><i class="pi pi-info-circle" /> I campi contrassegnati con * sono obbligatori.</span>
          <div>
            <Button type="button" label="Annulla" severity="secondary" outlined @click="cancel" />
            <Button class="save-button" type="submit" :label="isEditing ? 'Salva modifiche' : 'Crea giocatore'" icon="pi pi-check" :loading="saving" />
          </div>
        </footer>
      </section>
    </form>
  </div>
</template>

<style scoped>
.player-form-page { --green: var(--color-primary-700); --lime: var(--color-accent); display: flex; max-width: 1480px; margin: 0 auto; flex-direction: column; gap: 1.5rem; color: var(--color-text); }
.page-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 2rem; padding-top: 0.2rem; }
.back-link { display: inline-flex; align-items: center; gap: 0.45rem; margin: 0 0 1.25rem; padding: 0; border: 0; background: transparent; color: var(--color-text-muted); font: inherit; font-size: 0.72rem; font-weight: 650; cursor: pointer; }
.back-link:hover { color: var(--green); }
.eyebrow { margin: 0 0 0.5rem; color: var(--green); font-size: 0.72rem; font-weight: 800; letter-spacing: 0.16em; }
.page-header h1 { margin: 0; font-size: clamp(2rem, 3vw, 3rem); line-height: 1; letter-spacing: -0.055em; }
.page-subtitle { margin: 0.75rem 0 0; color: var(--color-text-muted); font-size: 0.95rem; }
.form-layout { display: grid; grid-template-columns: minmax(240px, 0.32fr) minmax(0, 1fr); align-items: start; gap: 1rem; }
.preview-card, .form-card { border: 1px solid var(--color-border); border-radius: 0; background: var(--color-surface-card); box-shadow: 0 8px 26px rgb(var(--color-shadow-rgb) / 6%); }
.preview-card { position: sticky; top: 1rem; display: flex; min-height: 430px; flex-direction: column; align-items: center; overflow: hidden; padding: 2rem 1.35rem 1.3rem; background: var(--color-primary-800); color: var(--color-white); text-align: center; }
.preview-label { align-self: stretch; margin: 0 0 1.8rem; color: var(--color-primary-300); font-size: 0.7rem; font-weight: 850; letter-spacing: 0.1em; text-align: left; }
.avatar-wrap { position: relative; }
.avatar-wrap :deep(.p-avatar) { width: 8rem; height: 8rem; border: 0; background: var(--color-surface-muted); color: var(--color-text-muted); font-size: 2rem; box-shadow: none; }
.active-dot { position: absolute; right: 0.4rem; bottom: 0.45rem; width: 0.95rem; height: 0.95rem; border: 3px solid var(--color-primary-800); border-radius: 50%; background: var(--lime); }
.preview-card h2 { overflow: hidden; max-width: 100%; margin: 1.15rem 0 0.4rem; font-size: 1.35rem; letter-spacing: -0.035em; text-overflow: ellipsis; white-space: nowrap; }
.preview-card > p:not(.preview-label) { display: flex; align-items: center; gap: 0.4rem; margin: 0; color: var(--color-primary-300); font-size: 0.8125rem; }
.preview-ranking { display: grid; width: 100%; margin-top: 1.5rem; padding: 1rem 0 0; border-top: 1px solid var(--color-primary-700); background: transparent; }
.preview-ranking small { color: var(--color-accent); font-size: 0.52rem; font-weight: 850; letter-spacing: 0.12em; }
.preview-ranking strong { margin-top: 0.25rem; font-size: 1.5rem; }
.preview-ranking span { color: var(--color-primary-300); font-size: 0.75rem; }
.preview-note { display: flex; align-items: center; gap: 0.5rem; margin-top: auto; padding-top: 1.5rem; color: var(--color-primary-300); font-size: 0.75rem; line-height: 1.4; text-align: left; }
.form-card { --form-padding: clamp(1.25rem, 3vw, 2rem); padding: var(--form-padding); }
.form-section { display: flex; flex-direction: column; gap: 1.15rem; }
.section-heading { display: flex; align-items: center; gap: 0.75rem; }
.section-heading > span { display: grid; place-items: center; width: 2.5rem; height: 2.5rem; flex: 0 0 auto; border-radius: 0; background: var(--color-primary-soft-surface); color: var(--green); }
.section-heading h2 { margin: 0; font-size: 0.95rem; letter-spacing: -0.02em; }
.section-heading p { margin: 0.2rem 0 0; color: var(--color-text-subtle); font-size: 0.64rem; }
.fields-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.9rem; }
.identity-grid { grid-template-columns: minmax(0, 1.8fr) minmax(150px, 0.5fr); }
.phone-field { grid-column: 1 / -1; }
.field { display: flex; min-width: 0; flex-direction: column; gap: 0.45rem; }
.field label { color: var(--color-text-muted); font-size: 0.68rem; font-weight: 750; }
.input-wrap { position: relative; }
.input-wrap > i { position: absolute; z-index: 2; top: 50%; left: 0.95rem; transform: translateY(-50%); color: var(--color-text-subtle); font-size: 0.78rem; }
.input-wrap :deep(.p-inputtext) { padding-left: 2.5rem; }
.field :deep(.p-inputtext), .field :deep(.p-inputnumber-input), .field :deep(.p-datepicker-input) { height: 3rem; border-color: var(--color-border); border-radius: 0; background: var(--color-surface-soft); font-size: 0.82rem; }
.field :deep(.p-inputtext:focus), .field :deep(.p-inputnumber-input:focus), .field :deep(.p-datepicker-input:focus) { border-color: var(--color-primary-500); background: var(--color-surface-card); box-shadow: 0 0 0 3px rgb(var(--color-primary-500-rgb) / 10%); }
.form-divider { height: 1px; margin: 1.55rem 0; background: var(--color-surface-muted); }
.form-actions { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin: 1.7rem calc(-1 * var(--form-padding)) calc(-1 * var(--form-padding)); padding: 1rem var(--form-padding); border-top: 1px solid var(--color-surface-muted); border-radius: 0; background: var(--color-surface-soft); }
.form-actions > span { display: flex; align-items: center; gap: 0.4rem; color: var(--color-text-subtle); font-size: 0.61rem; }
.form-actions > div { display: flex; gap: 0.6rem; }
.form-actions :deep(.p-button) { height: 2.8rem; border-radius: 0; }
.save-button { border-color: var(--green); background: var(--green); box-shadow: 0 8px 18px rgb(var(--color-primary-rgb) / 16%); font-weight: 700; }
.loading-preview, .loading-form { display: flex; flex-direction: column; gap: 1rem; }
.loading-preview { background: var(--color-surface-card); }
.loading-form { min-height: 500px; }

@media (max-width: 900px) { .form-layout { grid-template-columns: 1fr; } .preview-card { position: relative; top: auto; min-height: auto; } .preview-note { margin-top: 1.5rem; } }
@media (max-width: 620px) {
  .player-form-page { gap: 0.8rem; }
  .page-header { align-items: stretch; flex-direction: column; gap: 1rem; }
  .back-link { margin-bottom: 0.65rem; }
  .eyebrow, .page-subtitle { display: none; }
  .page-header h1 { font-size: 1.65rem; }
  .preview-card { display: grid; grid-template-columns: auto 1fr; justify-items: start; min-height: auto; padding: 0.75rem; border-radius: 0; text-align: left; }
  .preview-label, .preview-ranking, .preview-note { display: none; }
  .avatar-wrap { grid-row: 1 / 3; margin-right: 0.75rem; }
  .avatar-wrap :deep(.p-avatar) { width: 3.5rem; height: 3.5rem; border-width: 2px; font-size: 1rem; box-shadow: none; }
  .preview-card h2 { margin: 0.25rem 0; font-size: 1rem; }
  .preview-card > p:not(.preview-label), .section-heading p, .field label { font-size: 0.75rem; }
  .form-card { --form-padding: 0.85rem; border-radius: 0; box-shadow: none; }
  .fields-grid, .identity-grid { grid-template-columns: 1fr; }
  .phone-field { grid-column: auto; }
  .form-actions { align-items: stretch; flex-direction: column; }
  .form-actions > span { display: none; }
  .form-actions > div { display: grid; grid-template-columns: 1fr 1.3fr; }
}
</style>
