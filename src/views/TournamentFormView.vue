<script setup lang="ts">
  // Vue and third-party dependencies
  import { computed, ref, watch } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import moment from 'moment';
  import Button from 'primevue/button';
  import Card from 'primevue/card';
  import DatePicker from 'primevue/datepicker';
  import InputNumber from 'primevue/inputnumber';
  import InputText from 'primevue/inputtext';
  import ProgressSpinner from 'primevue/progressspinner';
  import Select from 'primevue/select';
  import { useToast } from 'primevue/usetoast';

  // Page components and tournament form types
  import PageHeader from '@/components/layout/PageHeader.vue';
  import TournamentFormatSelector from '@/components/tournaments/TournamentFormatSelector.vue';
  import type {
    TournamentFormModel,
    TournamentFormatOption,
    TournamentSelectOption,
  } from '@/components/tournaments/tournamentForm';

  // Domain configuration, stores and types
  import {
    tournamentCategoryDefinitions,
    tournamentFormatDefinitions,
  } from '@/config/tournamentFormats';
  import { useAuthStore } from '@/stores/auth';
  import { useFeatureFlagsStore } from '@/stores/featureFlags';
  import { useTournamentsStore } from '@/stores/tournaments';
  import type {
    TournamentCategory,
    TournamentCreate,
    TournamentFormat,
    TournamentStatus,
  } from '@/types';

  /**
   * Stores, route services and notifications
   */
  const route = useRoute();
  const router = useRouter();
  const auth = useAuthStore();
  const featureFlags = useFeatureFlagsStore();
  const store = useTournamentsStore();
  const toast = useToast();

  /**
   * Local state
   */
  const saving = ref(false);
  const editingId = ref<string | null>(null);
  const loadingTournament = ref(false);
  const form = ref<TournamentFormModel>(createEmptyForm());

  /**
   * Select options and derived state
   */
  const statusOptions: TournamentSelectOption<TournamentStatus>[] = [
    { label: 'In programma', value: 'upcoming' },
    { label: 'In corso', value: 'ongoing' },
    { label: 'Completato', value: 'completed' },
  ];

  const categoryOptions = computed<TournamentSelectOption<TournamentCategory>[]>(() =>
    tournamentCategoryDefinitions.map((definition) => ({
      label: definition.title,
      value: definition.category,
      disabled: !featureFlags.isTournamentCategoryEnabled(definition.category),
    }))
  );

  const requiresGroupConfig = computed(() => form.value.format === 'round_robin_elimination');
  const isEditing = computed(() => editingId.value !== null);

  // Combines static format metadata with feature availability and current selection.
  const formatOptions = computed<TournamentFormatOption[]>(() =>
    tournamentFormatDefinitions.map((definition) => {
      const enabled =
        definition.format === 'round_robin' ||
        featureFlags.isTournamentFormatEnabled(definition.format);
      const selected = form.value.format === definition.format;

      return {
        ...definition,
        enabled,
        selected,
        locked: definition.locked === true,
        selectable: enabled || selected,
      };
    })
  );

  /**
   * Form and date helpers
   */

  // Keeps legacy category values readable while respecting currently enabled features.
  function normalizeCategory(category: string): TournamentCategory {
    const candidate = category === 'doubles' ? 'femminile' : category;
    if (
      (candidate === 'maschile' || candidate === 'femminile') &&
      featureFlags.isTournamentCategoryEnabled(candidate)
    ) {
      return candidate;
    }
    return featureFlags.enabledTournamentCategories[0] ?? 'maschile';
  }

  // Returns a fresh form model for create mode and route transitions.
  function createEmptyForm(): TournamentFormModel {
    return {
      name: '',
      location: '',
      registration_start_date: null,
      registration_end_date: null,
      game_formula: '',
      registration_fee: null,
      start_date: null,
      end_date: null,
      format: 'single_elimination',
      category: featureFlags.enabledTournamentCategories[0] ?? 'maschile',
      status: 'upcoming',
      participant_limit: 32,
      group_count: null,
      qualifiers_per_group: null,
    };
  }

  // Converts an API date into the Date instance expected by PrimeVue DatePicker.
  function toFormDate(value: string | null | undefined): Date | null {
    if (!value) return null;
    const parsedDate = moment(value, moment.ISO_8601, true);
    return parsedDate.isValid() ? parsedDate.toDate() : null;
  }

  // Serializes a DatePicker value as a local calendar date for the API.
  function toApiDate(value: Date | null): string | null {
    return value ? moment(value).format('YYYY-MM-DD') : null;
  }

  // Removes presentation-only values and fields not supported by the selected format.
  function toTournamentPayload(data: TournamentFormModel): TournamentCreate {
    return {
      name: data.name,
      location: data.location || null,
      registration_start_date: toApiDate(data.registration_start_date),
      registration_end_date: toApiDate(data.registration_end_date),
      game_formula: data.game_formula || null,
      registration_fee: data.registration_fee,
      start_date: toApiDate(data.start_date),
      end_date: toApiDate(data.end_date),
      format: data.format,
      category: data.category,
      status: data.status,
      participant_limit: data.participant_limit,
      group_count: data.format === 'round_robin_elimination' ? data.group_count : null,
      qualifiers_per_group:
        data.format === 'round_robin_elimination' ? data.qualifiers_per_group : null,
    };
  }

  /**
   * Form actions
   */

  // Locked formats remain visible but cannot replace the current selection.
  function selectFormat(format: TournamentFormat): void {
    const option = formatOptions.value.find((item) => item.format === format);
    if (option?.selectable) form.value.format = format;
  }

  // Keeps validation close to the save boundary and reports actionable feedback.
  function validateForm(): boolean {
    if (!form.value.participant_limit || form.value.participant_limit < 2) {
      toast.add({
        severity: 'warn',
        summary: 'Controlla i dati',
        detail: 'Inserisci un limite partecipanti valido',
        life: 4000,
      });
      return false;
    }

    if (
      form.value.format === 'round_robin_elimination' &&
      (!form.value.group_count || !form.value.qualifiers_per_group)
    ) {
      toast.add({
        severity: 'warn',
        summary: 'Controlla i dati',
        detail: 'Configura gironi e qualificati per il formato gironi + finale',
        life: 4000,
      });
      return false;
    }

    return true;
  }

  /**
   * Data loading and persistence
   */

  // Hydrates edit mode by adapting API fields to the form component contracts.
  async function loadTournament(id: string): Promise<void> {
    loadingTournament.value = true;
    try {
      const tournament = await store.getById(id);
      form.value = {
        name: tournament.name,
        location: tournament.location ?? '',
        registration_start_date: toFormDate(tournament.registration_start_date),
        registration_end_date: toFormDate(tournament.registration_end_date),
        game_formula: tournament.game_formula ?? '',
        registration_fee: tournament.registration_fee ?? null,
        start_date: toFormDate(tournament.start_date),
        end_date: toFormDate(tournament.end_date),
        format: tournament.format,
        category: normalizeCategory(tournament.category),
        status: tournament.status,
        participant_limit: tournament.participant_limit ?? 32,
        group_count: tournament.group_count ?? null,
        qualifiers_per_group: tournament.qualifiers_per_group ?? null,
      };
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Errore',
        detail: (error as Error).message || 'Impossibile caricare il torneo',
        life: 3000,
      });
      await router.push({ name: 'tournaments' });
    } finally {
      loadingTournament.value = false;
    }
  }

  // Creates or updates according to the current route, then opens the saved tournament.
  async function saveTournament(): Promise<void> {
    if (auth.isGuest || !validateForm()) return;

    saving.value = true;
    try {
      const payload = toTournamentPayload(form.value);
      const tournament = editingId.value
        ? await store.update(editingId.value, payload)
        : await store.create(payload);

      toast.add({
        severity: 'success',
        summary: 'Salvato',
        detail: isEditing.value ? 'Torneo aggiornato' : 'Torneo creato',
        life: 3000,
      });
      await router.push({ name: 'tournament-detail', params: { id: tournament.id } });
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Errore',
        detail: (error as Error).message,
        life: 4000,
      });
    } finally {
      saving.value = false;
    }
  }

  // Returns to the tournament being edited, or to the list when creating one.
  async function cancel(): Promise<void> {
    if (editingId.value) {
      await router.push({ name: 'tournament-detail', params: { id: editingId.value } });
      return;
    }
    await router.push({ name: 'tournaments' });
  }

  /**
   * Route synchronization
   */

  // The same view supports create and edit routes, including transitions between them.
  watch(
    () => route.params['id'],
    async (id) => {
      editingId.value = id ? String(id) : null;
      if (!editingId.value) {
        form.value = createEmptyForm();
        return;
      }
      await loadTournament(editingId.value);
    },
    { immediate: true }
  );
</script>

<template>
  <!------------------------------>
  <!-- Page layout -->
  <!------------------------------>
  <div class="mx-auto flex max-w-5xl flex-col gap-4 text-(--color-text) sm:gap-5">
    <!------------------------------>
    <!-- Section: Header -->
    <!------------------------------>
    <div>
      <Button
        type="button"
        class="-ml-3 mb-2 rounded-none text-sm font-bold"
        label="Indietro"
        icon="pi pi-arrow-left"
        severity="secondary"
        text
        @click="cancel"
      />
      <PageHeader
        :title="isEditing ? 'Modifica torneo' : 'Nuovo torneo'"
        :description="isEditing ? 'Aggiorna i dati del torneo' : 'Crea un nuovo torneo'"
      />
    </div>

    <!------------------------------>
    <!-- Section: Loading tournament -->
    <!------------------------------>
    <div
      v-if="loadingTournament"
      class="flex min-h-64 items-center justify-center"
      role="status"
      aria-label="Caricamento torneo"
    >
      <ProgressSpinner class="size-10" stroke-width="4" />
    </div>

    <!------------------------------>
    <!-- Section: Tournament form -->
    <!------------------------------>
    <Card
      v-else
      class="rounded-none border border-surface-200"
      :pt="{
        body: { class: 'p-3 sm:p-5' },
        content: { class: 'p-0' },
      }"
    >
      <template #content>
        <form class="flex flex-col gap-4 sm:gap-5" @submit.prevent="saveTournament">
          <!------------------------------>
          <!-- Section: Basic information -->
          <!------------------------------>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="flex flex-col gap-1.5">
              <label for="t-name" class="text-sm font-medium">Nome *</label>
              <InputText
                id="t-name"
                v-model="form.name"
                placeholder="Torneo Estivo 2025"
                fluid
                required
                autofocus
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="t-location" class="text-sm font-medium">Sede</label>
              <InputText id="t-location" v-model="form.location" placeholder="TC Milano" fluid />
            </div>
          </div>

          <!------------------------------>
          <!-- Section: Registration -->
          <!------------------------------>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="flex flex-col gap-1.5">
              <label for="t-registration-start" class="text-sm font-medium">
                Data inizio iscrizioni
              </label>
              <DatePicker
                input-id="t-registration-start"
                v-model="form.registration_start_date"
                date-format="dd/mm/yy"
                placeholder="gg/mm/aaaa"
                fluid
                show-button-bar
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="t-registration-end" class="text-sm font-medium">
                Data termine iscrizioni
              </label>
              <DatePicker
                input-id="t-registration-end"
                v-model="form.registration_end_date"
                date-format="dd/mm/yy"
                placeholder="gg/mm/aaaa"
                fluid
                show-button-bar
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="t-game-formula" class="text-sm font-medium">Formula di gioco</label>
              <InputText
                id="t-game-formula"
                v-model="form.game_formula"
                placeholder="Es. 2 set su 3 con tie-break"
                fluid
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="t-registration-fee" class="text-sm font-medium">Quota iscrizione</label>
              <InputNumber
                input-id="t-registration-fee"
                v-model="form.registration_fee"
                mode="currency"
                currency="EUR"
                locale="it-IT"
                :min="0"
                :max-fraction-digits="2"
                fluid
              />
            </div>
          </div>

          <!------------------------------>
          <!-- Section: Tournament dates -->
          <!------------------------------>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="flex flex-col gap-1.5">
              <label for="t-start-date" class="text-sm font-medium">Data inizio</label>
              <DatePicker
                input-id="t-start-date"
                v-model="form.start_date"
                date-format="dd/mm/yy"
                placeholder="gg/mm/aaaa"
                fluid
                show-button-bar
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="t-end-date" class="text-sm font-medium">Data fine</label>
              <DatePicker
                input-id="t-end-date"
                v-model="form.end_date"
                date-format="dd/mm/yy"
                placeholder="gg/mm/aaaa"
                fluid
                show-button-bar
              />
            </div>
          </div>

          <!------------------------------>
          <!-- Section: Tournament format -->
          <!------------------------------>
          <div class="flex flex-col gap-1.5">
            <span class="text-sm font-medium">Formato *</span>
            <TournamentFormatSelector :options="formatOptions" @select="selectFormat" />
          </div>

          <!------------------------------>
          <!-- Section: Tournament configuration -->
          <!------------------------------>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div class="flex flex-col gap-1.5">
              <label for="t-participant-limit" class="text-sm font-medium">
                Limite partecipanti *
              </label>
              <InputNumber
                input-id="t-participant-limit"
                v-model="form.participant_limit"
                :min="2"
                :use-grouping="false"
                placeholder="Es. 32"
                fluid
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="t-category" class="text-sm font-medium">Categoria torneo *</label>
              <small class="text-xs text-muted-color">
                Definisce se il torneo è maschile o femminile.
              </small>
              <Select
                input-id="t-category"
                v-model="form.category"
                :options="categoryOptions"
                option-label="label"
                option-value="value"
                option-disabled="disabled"
                fluid
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="t-status" class="text-sm font-medium">Stato iniziale</label>
              <small class="text-xs text-muted-color">
                Indica la fase iniziale del torneo.
              </small>
              <Select
                input-id="t-status"
                v-model="form.status"
                :options="statusOptions"
                option-label="label"
                option-value="value"
                fluid
              />
            </div>
          </div>

          <!------------------------------>
          <!-- Section: Group configuration -->
          <!------------------------------>
          <div
            v-if="requiresGroupConfig"
            class="border border-surface-200 bg-surface-50 p-3 sm:p-4"
          >
            <h3 class="mb-3 text-sm font-semibold">Configurazione gironi</h3>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div class="flex flex-col gap-1.5">
                <label for="t-group-count" class="text-sm font-medium">Numero gironi *</label>
                <InputNumber
                  input-id="t-group-count"
                  v-model="form.group_count"
                  :min="1"
                  :use-grouping="false"
                  placeholder="Es. 4"
                  fluid
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="t-qualifiers-per-group" class="text-sm font-medium">
                  Qualificati per girone *
                </label>
                <InputNumber
                  input-id="t-qualifiers-per-group"
                  v-model="form.qualifiers_per_group"
                  :min="1"
                  :use-grouping="false"
                  placeholder="Es. 2"
                  fluid
                />
              </div>
            </div>
          </div>

          <!------------------------------>
          <!-- Section: Form actions -->
          <!------------------------------>
          <div
            class="-mx-3 -mb-3 grid grid-cols-2 gap-2 border-t border-(--color-border) bg-(--color-surface-card) p-3 sm:mx-0 sm:mb-0 sm:flex sm:justify-end sm:border-0 sm:bg-transparent sm:p-0"
          >
            <Button
              type="button"
              class="w-full rounded-none sm:w-auto"
              label="Annulla"
              severity="secondary"
              outlined
              @click="cancel"
            />
            <Button
              type="submit"
              class="w-full rounded-none sm:w-auto"
              :label="isEditing ? 'Salva' : 'Crea'"
              :loading="saving"
            />
          </div>
        </form>
      </template>
    </Card>
  </div>
</template>
