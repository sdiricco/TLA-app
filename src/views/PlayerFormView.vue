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
      <Button class="cancel-top" label="Annulla" severity="secondary" outlined @click="cancel" />
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
.player-form-page { --green: #047857; --lime: #b7f34a; display: flex; max-width: 1480px; margin: 0 auto; flex-direction: column; gap: 1.5rem; color: #17211d; }
.page-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 2rem; padding-top: 0.2rem; }
.back-link { display: inline-flex; align-items: center; gap: 0.45rem; margin: 0 0 1.25rem; padding: 0; border: 0; background: transparent; color: #6e7c75; font: inherit; font-size: 0.72rem; font-weight: 650; cursor: pointer; }
.back-link:hover { color: var(--green); }
.eyebrow { margin: 0 0 0.5rem; color: var(--green); font-size: 0.72rem; font-weight: 800; letter-spacing: 0.16em; }
.page-header h1 { margin: 0; font-size: clamp(2rem, 3vw, 3rem); line-height: 1; letter-spacing: -0.055em; }
.page-subtitle { margin: 0.75rem 0 0; color: #68756f; font-size: 0.95rem; }
.cancel-top { height: 3rem; border-color: #dce5e1; border-radius: 12px; color: #56645e; }
.form-layout { display: grid; grid-template-columns: minmax(240px, 0.32fr) minmax(0, 1fr); align-items: start; gap: 1rem; }
.preview-card, .form-card { border: 1px solid #e0e8e4; border-radius: 20px; background: #fff; box-shadow: 0 8px 26px rgb(29 63 49 / 6%); }
.preview-card { position: sticky; top: 1rem; isolation: isolate; display: flex; min-height: 430px; flex-direction: column; align-items: center; overflow: hidden; padding: 2rem 1.35rem 1.3rem; background: linear-gradient(155deg, #073d31, #07634c); color: white; text-align: center; }
.preview-card::before { position: absolute; z-index: -1; inset: 0; opacity: 0.15; background-image: radial-gradient(rgb(255 255 255 / 45%) 0.7px, transparent 0.7px); background-size: 14px 14px; content: ''; mask-image: linear-gradient(to bottom, black, transparent 75%); }
.preview-card::after { position: absolute; z-index: -1; width: 250px; height: 250px; right: -150px; bottom: -150px; border: 1px solid rgb(255 255 255 / 11%); border-radius: 50%; box-shadow: 0 0 0 35px rgb(255 255 255 / 3%), 0 0 0 70px rgb(255 255 255 / 2%); content: ''; }
.preview-label { align-self: stretch; margin: 0 0 1.8rem; color: rgb(255 255 255 / 42%); font-size: 0.54rem; font-weight: 850; letter-spacing: 0.15em; text-align: left; }
.avatar-wrap { position: relative; }
.avatar-wrap :deep(.p-avatar) { width: 8rem; height: 8rem; border: 5px solid rgb(255 255 255 / 16%); background: #e6efeb; color: #25483b; font-size: 2rem; box-shadow: 0 16px 32px rgb(0 0 0 / 20%); }
.active-dot { position: absolute; right: 0.4rem; bottom: 0.45rem; width: 0.95rem; height: 0.95rem; border: 3px solid #075846; border-radius: 50%; background: var(--lime); }
.preview-card h2 { overflow: hidden; max-width: 100%; margin: 1.15rem 0 0.4rem; font-size: 1.35rem; letter-spacing: -0.035em; text-overflow: ellipsis; white-space: nowrap; }
.preview-card > p:not(.preview-label) { display: flex; align-items: center; gap: 0.4rem; margin: 0; color: rgb(255 255 255 / 58%); font-size: 0.68rem; }
.preview-ranking { display: grid; width: 100%; margin-top: 1.5rem; padding: 1rem; border: 1px solid rgb(255 255 255 / 10%); border-radius: 13px; background: rgb(255 255 255 / 7%); }
.preview-ranking small { color: #cfff79; font-size: 0.52rem; font-weight: 850; letter-spacing: 0.12em; }
.preview-ranking strong { margin-top: 0.25rem; font-size: 1.5rem; }
.preview-ranking span { color: rgb(255 255 255 / 38%); font-size: 0.56rem; }
.preview-note { display: flex; align-items: center; gap: 0.5rem; margin-top: auto; padding-top: 1.5rem; color: rgb(255 255 255 / 38%); font-size: 0.58rem; line-height: 1.4; text-align: left; }
.form-card { --form-padding: clamp(1.25rem, 3vw, 2rem); padding: var(--form-padding); }
.form-section { display: flex; flex-direction: column; gap: 1.15rem; }
.section-heading { display: flex; align-items: center; gap: 0.75rem; }
.section-heading > span { display: grid; place-items: center; width: 2.5rem; height: 2.5rem; flex: 0 0 auto; border-radius: 10px; background: #d1fae5; color: var(--green); }
.section-heading h2 { margin: 0; font-size: 0.95rem; letter-spacing: -0.02em; }
.section-heading p { margin: 0.2rem 0 0; color: #8a9690; font-size: 0.64rem; }
.fields-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.9rem; }
.identity-grid { grid-template-columns: minmax(0, 1.8fr) minmax(150px, 0.5fr); }
.phone-field { grid-column: 1 / -1; }
.field { display: flex; min-width: 0; flex-direction: column; gap: 0.45rem; }
.field label { color: #5d6964; font-size: 0.68rem; font-weight: 750; }
.input-wrap { position: relative; }
.input-wrap > i { position: absolute; z-index: 2; top: 50%; left: 0.95rem; transform: translateY(-50%); color: #8c9993; font-size: 0.78rem; }
.input-wrap :deep(.p-inputtext) { padding-left: 2.5rem; }
.field :deep(.p-inputtext), .field :deep(.p-inputnumber-input), .field :deep(.p-datepicker-input) { height: 3rem; border-color: #dce5e1; border-radius: 11px; background: #fbfdfc; font-size: 0.82rem; }
.field :deep(.p-inputtext:focus), .field :deep(.p-inputnumber-input:focus), .field :deep(.p-datepicker-input:focus) { border-color: #10b981; background: white; box-shadow: 0 0 0 3px rgb(16 185 129 / 10%); }
.form-divider { height: 1px; margin: 1.55rem 0; background: #edf1ef; }
.form-actions { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin: 1.7rem calc(-1 * var(--form-padding)) calc(-1 * var(--form-padding)); padding: 1rem var(--form-padding); border-top: 1px solid #e9efec; border-radius: 0 0 20px 20px; background: #fafcfb; }
.form-actions > span { display: flex; align-items: center; gap: 0.4rem; color: #8a9690; font-size: 0.61rem; }
.form-actions > div { display: flex; gap: 0.6rem; }
.form-actions :deep(.p-button) { height: 2.8rem; border-radius: 11px; }
.save-button { border-color: var(--green); background: var(--green); box-shadow: 0 8px 18px rgb(4 120 87 / 16%); font-weight: 700; }
.loading-preview, .loading-form { display: flex; flex-direction: column; gap: 1rem; }
.loading-preview { background: #fff; }
.loading-form { min-height: 500px; }

@media (max-width: 900px) { .form-layout { grid-template-columns: 1fr; } .preview-card { position: relative; top: auto; min-height: auto; } .preview-note { margin-top: 1.5rem; } }
@media (max-width: 620px) {
  .player-form-page { gap: 1.1rem; }
  .page-header { align-items: stretch; flex-direction: column; gap: 1rem; }
  .cancel-top { display: none; }
  .fields-grid, .identity-grid { grid-template-columns: 1fr; }
  .phone-field { grid-column: auto; }
  .form-actions { align-items: stretch; flex-direction: column; }
  .form-actions > div { display: grid; grid-template-columns: 1fr 1.3fr; }
}
</style>
