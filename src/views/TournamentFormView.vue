<script setup lang="ts">
  // Vue and third-party dependencies
  import { computed, ref, watch } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import moment from 'moment';
  import Button from 'primevue/button';
  import Card from 'primevue/card';
  import DatePicker from 'primevue/datepicker';
  import IconField from 'primevue/iconfield';
  import InputIcon from 'primevue/inputicon';
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
  import { useTournamentFormDraftStore } from '@/stores/tournamentFormDraft';
  import { useTournamentsStore } from '@/stores/tournaments';
  import type {
    TournamentCategory,
    TournamentCreate,
    TournamentFormat,
    TournamentPhaseInput,
    TournamentStatus,
  } from '@/types';

  /**
   * Stores, route services and notifications
   */
  const route = useRoute();
  const router = useRouter();
  const auth = useAuthStore();
  const featureFlags = useFeatureFlagsStore();
  const draftStore = useTournamentFormDraftStore();
  const store = useTournamentsStore();
  const toast = useToast();

  /**
   * Local state
   */
  const saving = ref(false);
  const editingId = ref<string | null>(null);
  const loadingTournament = ref(false);
  const form = ref<TournamentFormModel>(createEmptyForm());
  const regulationInput = ref<HTMLInputElement | null>(null);
  const regulationFile = ref<File | null>(null);
  const existingRegulation = ref<{
    name: string;
    contentType: string | null;
    size: number | null;
  } | null>(null);

  const MAX_REGULATION_SIZE = 6 * 1024 * 1024;

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

  const selectedCategoryLabel = computed(
    () =>
      categoryOptions.value.find((option) => option.value === form.value.category)?.label ??
      form.value.category
  );
  const selectedStatusLabel = computed(
    () =>
      statusOptions.find((option) => option.value === form.value.status)?.label ?? form.value.status
  );
  const requiresPhaseConfig = computed(() => form.value.format === 'round_robin_elimination');
  const phaseFlow = computed(() => {
    let inputCount = form.value.participant_limit ?? 0;
    return form.value.phases.map((phase, index) => {
      const item = { phase, index, inputCount, outputCount: phase.output_count };
      inputCount = phase.output_count;
      return item;
    });
  });
  const phasePresets = computed(() => {
    const inputCount = form.value.participant_limit ?? 32;
    const singleGroupOutput = Math.min(8, Math.max(2, Math.floor(inputCount / 2)));
    const groupCount = Math.min(4, Math.floor(inputCount / 2));
    const multiGroupOutput = groupCount * 2;

    return [
      {
        id: 'single-group',
        title: 'Girone unico + fase finale',
        description: `Tutti nel girone iniziale, i migliori ${singleGroupOutput} accedono al tabellone.`,
        icon: 'pi pi-list',
        available: true,
        phases: [
          {
            name: 'Fase a girone',
            format: 'round_robin',
            group_count: 1,
            output_count: singleGroupOutput,
            qualifiers_per_group: singleGroupOutput,
          },
          {
            name: 'Fase finale',
            format: 'single_elimination',
            group_count: 1,
            output_count: 1,
            qualifiers_per_group: null,
          },
        ] satisfies TournamentPhaseInput[],
      },
      {
        id: 'four-groups',
        title: '4 gironi + fase finale',
        description: 'Passano i primi 2 di ogni girone, poi eliminazione diretta.',
        icon: 'pi pi-th-large',
        available: inputCount >= 8,
        phases: [
          {
            name: 'Fase a gironi',
            format: 'round_robin',
            group_count: groupCount,
            output_count: multiGroupOutput,
            qualifiers_per_group: 2,
          },
          {
            name: 'Fase finale',
            format: 'single_elimination',
            group_count: 1,
            output_count: 1,
            qualifiers_per_group: null,
          },
        ] satisfies TournamentPhaseInput[],
      },
    ];
  });
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
      phases: [],
    };
  }

  function createDefaultPhases(inputCount: number): TournamentPhaseInput[] {
    const qualifiedCount = Math.min(Math.max(2, Math.floor(inputCount / 2)), 8);
    return [
      {
        name: 'Fase a gironi',
        format: 'round_robin',
        group_count: 1,
        output_count: qualifiedCount,
        qualifiers_per_group: qualifiedCount,
      },
      {
        name: 'Fase finale',
        format: 'single_elimination',
        group_count: 1,
        output_count: 1,
        qualifiers_per_group: null,
      },
    ];
  }

  function phaseInputCount(index: number): number {
    return index === 0
      ? form.value.participant_limit ?? 0
      : form.value.phases[index - 1]?.output_count ?? 0;
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

  function formatFileSize(size: number | null): string {
    if (size == null) return '';
    if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  function openRegulationPicker(): void {
    regulationInput.value?.click();
  }

  function selectRegulation(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;
    if (file.size > MAX_REGULATION_SIZE) {
      toast.add({
        severity: 'warn',
        summary: 'File troppo grande',
        detail: 'Il regolamento non può superare 6 MB',
        life: 4000,
      });
      return;
    }
    regulationFile.value = file;
  }

  function clearSelectedRegulation(): void {
    regulationFile.value = null;
  }

  async function downloadExistingRegulation(): Promise<void> {
    if (!editingId.value || !existingRegulation.value) return;
    try {
      const blob = await store.downloadRegulation(editingId.value);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = existingRegulation.value.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Download non riuscito',
        detail: (error as Error).message,
        life: 4000,
      });
    }
  }

  // Removes presentation-only values and fields not supported by the selected format.
  function toTournamentPayload(data: TournamentFormModel): TournamentCreate {
    const phases = data.format === 'round_robin_elimination'
      ? data.phases.map((phase) => ({
          ...phase,
          group_count: phase.format === 'round_robin' ? phase.group_count : 1,
          qualifiers_per_group:
            phase.format === 'round_robin' && phase.output_count % phase.group_count === 0
              ? phase.output_count / phase.group_count
              : null,
        }))
      : undefined;
    const firstPhase = phases?.[0];
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
      group_count:
        data.format === 'round_robin_elimination' && firstPhase?.format === 'round_robin'
          ? firstPhase.group_count
          : null,
      qualifiers_per_group:
        data.format === 'round_robin_elimination' && firstPhase?.qualifiers_per_group
          ? firstPhase.qualifiers_per_group
          : null,
      phases,
    };
  }

  /**
   * Form actions
   */

  // Locked formats remain visible but cannot replace the current selection.
  function selectFormat(format: TournamentFormat): void {
    const option = formatOptions.value.find((item) => item.format === format);
    if (!option?.selectable) return;
    form.value.format = format;
  }

  function applyPhasePreset(phases: TournamentPhaseInput[]): void {
    form.value.phases = phases.map((phase) => ({ ...phase }));
  }

  function clearPhaseConfiguration(): void {
    form.value.phases = [];
  }

  function draftContextKey(): string {
    return editingId.value ? `edit:${editingId.value}` : 'create';
  }

  async function openPhaseBuilder(): Promise<void> {
    draftStore.save(
      draftContextKey(),
      form.value,
      regulationFile.value,
      existingRegulation.value,
    );
    await router.push({ name: 'tournament-phases-builder' });
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

    if (form.value.format === 'round_robin_elimination' && form.value.phases.length === 0) {
      toast.add({
        severity: 'warn',
        summary: 'Controlla i dati',
        detail: 'Aggiungi almeno una fase al percorso del torneo',
        life: 4000,
      });
      return false;
    }

    if (form.value.format === 'round_robin_elimination') {
      for (const [index, phase] of form.value.phases.entries()) {
        const inputCount = phaseInputCount(index);
        if (!phase.name.trim()) {
          toast.add({
            severity: 'warn',
            summary: 'Controlla le fasi',
            detail: `Inserisci il nome della fase ${index + 1}`,
            life: 4000,
          });
          return false;
        }
        if (
          !Number.isInteger(phase.output_count)
          || phase.output_count < 1
          || phase.output_count > inputCount
        ) {
          toast.add({
            severity: 'warn',
            summary: 'Controlla il flusso',
            detail: `La fase ${index + 1} deve produrre da 1 a ${inputCount} giocatori`,
            life: 4000,
          });
          return false;
        }
        if (index < form.value.phases.length - 1 && phase.output_count < 2) {
          toast.add({
            severity: 'warn',
            summary: 'Controlla il flusso',
            detail: `La fase ${index + 1} deve lasciare almeno due giocatori alla fase successiva`,
            life: 4000,
          });
          return false;
        }
        if (phase.format === 'round_robin' && phase.group_count > inputCount) {
          toast.add({
            severity: 'warn',
            summary: 'Controlla i gironi',
            detail: `La fase ${index + 1} non può avere più di ${inputCount} gironi`,
            life: 4000,
          });
          return false;
        }
      }
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
      const firstPhase = tournament.phases?.[0];
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
        group_count: firstPhase?.group_count ?? tournament.group_count ?? null,
        qualifiers_per_group:
          firstPhase?.qualifiers_per_group ?? tournament.qualifiers_per_group ?? null,
        phases: tournament.phases?.map((phase) => ({
          name: phase.name,
          format: phase.format,
          group_count: phase.group_count,
          output_count:
            phase.output_count
            ?? (
              phase.qualifiers_per_group
                ? phase.group_count * phase.qualifiers_per_group
                : 1
            ),
          qualifiers_per_group: phase.qualifiers_per_group ?? null,
        })) ?? createDefaultPhases(tournament.participant_limit ?? 32),
      };
      existingRegulation.value = tournament.regulation_name
        ? {
            name: tournament.regulation_name,
            contentType: tournament.regulation_content_type ?? null,
            size: tournament.regulation_size ?? null,
          }
        : null;
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
    let savedTournamentId: string | null = null;
    try {
      const payload = toTournamentPayload(form.value);
      const tournament = editingId.value
        ? await store.update(editingId.value, payload)
        : await store.create(payload);
      savedTournamentId = tournament.id;
      if (regulationFile.value) {
        await store.uploadRegulation(tournament.id, regulationFile.value);
      }

      toast.add({
        severity: 'success',
        summary: 'Salvato',
        detail: isEditing.value ? 'Torneo aggiornato' : 'Torneo creato',
        life: 3000,
      });
      draftStore.clear();
      await router.push({ name: 'tournament-detail', params: { id: tournament.id } });
    } catch (error) {
      if (savedTournamentId && !editingId.value) {
        await router.replace({ name: 'tournament-edit', params: { id: savedTournamentId } });
      }
      toast.add({
        severity: 'error',
        summary: 'Errore',
        detail: savedTournamentId
          ? `Il torneo è stato salvato, ma il regolamento non è stato caricato: ${(error as Error).message}`
          : (error as Error).message,
        life: 4000,
      });
    } finally {
      saving.value = false;
    }
  }

  // Returns to the tournament being edited, or to the list when creating one.
  async function cancel(): Promise<void> {
    draftStore.clear();
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
      const restoredDraft = draftStore.restore(draftContextKey());
      if (restoredDraft) {
        form.value = restoredDraft.form;
        regulationFile.value = restoredDraft.regulationFile;
        existingRegulation.value = restoredDraft.existingRegulation;
        return;
      }
      if (!editingId.value) {
        form.value = createEmptyForm();
        regulationFile.value = null;
        existingRegulation.value = null;
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
    <Card v-else>
      <template #content>
        <form class="flex flex-col gap-6" @submit.prevent="saveTournament">
          <!------------------------------>
          <!-- Section: Basic information -->
          <!------------------------------>
          <section class="border-b border-(--color-border) pb-6">
            <header class="mb-4 flex items-center gap-3">
              <span class="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary">
                <i class="pi pi-trophy" aria-hidden="true" />
              </span>
              <div>
                <h2 class="font-bold">Informazioni torneo</h2>
                <p class="mt-0.5 text-xs text-muted-color">Nome e luogo della competizione.</p>
              </div>
            </header>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div class="flex flex-col gap-1.5">
                <label for="t-name" class="text-sm font-medium">Nome *</label>
                <IconField>
                  <InputIcon class="pi pi-trophy" />
                  <InputText
                    id="t-name"
                    v-model="form.name"
                    placeholder="Torneo Estivo 2025"
                    fluid
                    required
                    autofocus
                  />
                </IconField>
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="t-location" class="text-sm font-medium">Sede</label>
                <IconField>
                  <InputIcon class="pi pi-map-marker" />
                  <InputText id="t-location" v-model="form.location" placeholder="TC Milano" fluid />
                </IconField>
              </div>
            </div>
          </section>

          <!------------------------------>
          <!-- Section: Calendar and registration -->
          <!------------------------------>
          <section class="border-b border-(--color-border) pb-6">
            <header class="mb-4 flex items-center gap-3">
              <span class="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary">
                <i class="pi pi-calendar" aria-hidden="true" />
              </span>
              <div>
                <h2 class="font-bold">Calendario e iscrizioni</h2>
                <p class="mt-0.5 text-xs text-muted-color">Definisci le finestre temporali e le condizioni di partecipazione.</p>
              </div>
            </header>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div class="flex flex-col gap-1.5">
                <label for="t-registration-start" class="text-sm font-medium">Inizio iscrizioni</label>
                <DatePicker
                  input-id="t-registration-start"
                  v-model="form.registration_start_date"
                  date-format="dd/mm/yy"
                  placeholder="gg/mm/aaaa"
                  fluid
                  show-button-bar
                  show-icon
                  icon-display="input"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="t-registration-end" class="text-sm font-medium">Termine iscrizioni</label>
                <DatePicker
                  input-id="t-registration-end"
                  v-model="form.registration_end_date"
                  date-format="dd/mm/yy"
                  placeholder="gg/mm/aaaa"
                  fluid
                  show-button-bar
                  show-icon
                  icon-display="input"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="t-start-date" class="text-sm font-medium">Inizio torneo</label>
                <DatePicker
                  input-id="t-start-date"
                  v-model="form.start_date"
                  date-format="dd/mm/yy"
                  placeholder="gg/mm/aaaa"
                  fluid
                  show-button-bar
                  show-icon
                  icon-display="input"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="t-end-date" class="text-sm font-medium">Fine torneo</label>
                <DatePicker
                  input-id="t-end-date"
                  v-model="form.end_date"
                  date-format="dd/mm/yy"
                  placeholder="gg/mm/aaaa"
                  fluid
                  show-button-bar
                  show-icon
                  icon-display="input"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="t-game-formula" class="text-sm font-medium">Formula di gioco</label>
                <IconField>
                  <InputIcon class="pi pi-sliders-h" />
                  <InputText
                    id="t-game-formula"
                    v-model="form.game_formula"
                    placeholder="Es. 2 set su 3 con tie-break"
                    fluid
                  />
                </IconField>
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="t-registration-fee" class="text-sm font-medium">Quota iscrizione</label>
                <IconField>
                  <InputIcon class="pi pi-euro" />
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
                </IconField>
              </div>
            </div>
          </section>

          <!------------------------------>
          <!-- Section: Format and configuration -->
          <!------------------------------>
          <section class="border-b border-(--color-border) pb-6">
            <header class="mb-4 flex items-center gap-3">
              <span class="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary">
                <i class="pi pi-sitemap" aria-hidden="true" />
              </span>
              <div>
                <h2 class="font-bold">Formato e configurazione</h2>
                <p class="mt-0.5 text-xs text-muted-color">Scegli la struttura del torneo e i suoi parametri operativi.</p>
              </div>
            </header>

            <div class="flex flex-col gap-1.5">
              <span class="text-sm font-medium">Formato *</span>
              <TournamentFormatSelector :options="formatOptions" @select="selectFormat" />
            </div>

            <div class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div class="flex flex-col gap-1.5">
                <label for="t-participant-limit" class="text-sm font-medium">Limite partecipanti *</label>
                <IconField>
                  <InputIcon class="pi pi-users" />
                  <InputNumber
                    input-id="t-participant-limit"
                    v-model="form.participant_limit"
                    :min="2"
                    :use-grouping="false"
                    placeholder="Es. 32"
                    fluid
                  />
                </IconField>
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="t-category" class="text-sm font-medium">Categoria *</label>
                <Select
                  input-id="t-category"
                  v-model="form.category"
                  :options="categoryOptions"
                  option-label="label"
                  option-value="value"
                  option-disabled="disabled"
                  fluid
                >
                  <template #value>
                    <span class="flex items-center gap-2">
                      <i class="pi pi-user text-muted-color" aria-hidden="true" />
                      <span>{{ selectedCategoryLabel }}</span>
                    </span>
                  </template>
                </Select>
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="t-status" class="text-sm font-medium">Stato iniziale</label>
                <Select
                  input-id="t-status"
                  v-model="form.status"
                  :options="statusOptions"
                  option-label="label"
                  option-value="value"
                  fluid
                >
                  <template #value>
                    <span class="flex items-center gap-2">
                      <i class="pi pi-flag text-muted-color" aria-hidden="true" />
                      <span>{{ selectedStatusLabel }}</span>
                    </span>
                  </template>
                </Select>
              </div>
            </div>

            <!------------------------------>
            <!-- Section: Phase pipeline -->
            <!------------------------------>
            <div
              v-if="requiresPhaseConfig"
              class="mt-5 flex flex-col gap-4"
            >
              <template v-if="form.phases.length === 0">
                <div>
                  <h3 class="font-bold">Come vuoi costruire il percorso?</h3>
                  <p class="mt-1 text-sm text-muted-color">
                    Parti da un preset oppure crea una sequenza di fasi personalizzata.
                  </p>
                </div>

                <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <article
                    v-for="preset in phasePresets"
                    :key="preset.id"
                    class="flex flex-col gap-4 rounded-lg border border-(--color-border) p-4"
                    :class="{ 'opacity-55': !preset.available }"
                  >
                    <div class="flex items-start gap-3">
                      <span class="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary">
                        <i :class="preset.icon" aria-hidden="true" />
                      </span>
                      <div>
                        <h4 class="font-bold">{{ preset.title }}</h4>
                        <p class="mt-1 text-sm text-muted-color">{{ preset.description }}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      label="Usa preset"
                      icon="pi pi-bolt"
                      severity="secondary"
                      outlined
                      size="small"
                      class="self-start"
                      :disabled="!preset.available"
                      @click="applyPhasePreset(preset.phases)"
                    />
                  </article>
                </div>

                <div class="flex flex-col gap-3 rounded-lg border border-(--color-border) p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 class="font-bold">Percorso personalizzato</h4>
                    <p class="mt-1 text-sm text-muted-color">
                      Definisci liberamente formule, ordine e numero di qualificati.
                    </p>
                  </div>
                  <Button
                    type="button"
                    label="Crea"
                    icon="pi pi-plus"
                    @click="openPhaseBuilder"
                  />
                </div>
              </template>

              <template v-else>
                <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 class="font-bold">Riepilogo percorso</h3>
                    <p class="mt-1 text-sm text-muted-color">
                      {{ form.phases.length }} {{ form.phases.length === 1 ? 'fase configurata' : 'fasi configurate' }}
                    </p>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      label="Cambia"
                      severity="secondary"
                      text
                      size="small"
                      @click="clearPhaseConfiguration"
                    />
                    <Button
                      type="button"
                      label="Modifica percorso"
                      icon="pi pi-pencil"
                      severity="secondary"
                      outlined
                      size="small"
                      @click="openPhaseBuilder"
                    />
                  </div>
                </div>

                <div class="flex flex-col overflow-hidden rounded-lg border border-(--color-border)">
                  <div
                    v-for="item in phaseFlow"
                    :key="item.index"
                    class="flex items-center gap-3 border-b border-(--color-border) p-3 last:border-b-0"
                  >
                    <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary">
                      <i
                        :class="item.phase.format === 'round_robin' ? 'pi pi-list' : 'pi pi-sitemap'"
                        aria-hidden="true"
                      />
                    </span>
                    <div class="min-w-0 flex-1">
                      <p class="truncate font-semibold">{{ item.phase.name }}</p>
                      <p class="text-xs text-muted-color">
                        {{ item.phase.format === 'round_robin' ? "Girone all'italiana" : 'Eliminazione diretta' }}
                        <template v-if="item.phase.format === 'round_robin'">
                          · {{ item.phase.group_count }} {{ item.phase.group_count === 1 ? 'girone' : 'gironi' }}
                        </template>
                      </p>
                    </div>
                    <div class="shrink-0 text-right">
                      <p class="font-bold text-primary">{{ item.inputCount }} → {{ item.outputCount }}</p>
                      <p class="text-xs text-muted-color">giocatori</p>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </section>

          <!------------------------------>
          <!-- Section: Regulation -->
          <!------------------------------>
          <section>
            <header class="mb-4 flex items-center gap-3">
              <span class="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary">
                <i class="pi pi-file" aria-hidden="true" />
              </span>
              <div>
                <h2 class="font-bold">Documenti</h2>
                <p class="mt-0.5 text-xs text-muted-color">Allega il regolamento del torneo in qualsiasi formato.</p>
              </div>
            </header>

            <input
              ref="regulationInput"
              type="file"
              class="hidden"
              aria-label="Seleziona il regolamento"
              @change="selectRegulation"
            />

            <div class="flex flex-col gap-3 rounded-lg border border-dashed border-(--color-border-strong) bg-surface-50 p-4 sm:flex-row sm:items-center">
              <span class="grid size-11 shrink-0 place-items-center rounded-lg bg-(--color-surface-card) text-primary">
                <i class="pi pi-file text-lg" aria-hidden="true" />
              </span>

              <div class="min-w-0 flex-1">
                <template v-if="regulationFile">
                  <strong class="block truncate text-sm">{{ regulationFile.name }}</strong>
                  <small class="text-xs text-muted-color">
                    {{ formatFileSize(regulationFile.size) }} · pronto per il caricamento
                  </small>
                </template>
                <template v-else-if="existingRegulation">
                  <strong class="block truncate text-sm">{{ existingRegulation.name }}</strong>
                  <small class="text-xs text-muted-color">
                    Regolamento attuale<template v-if="existingRegulation.size"> · {{ formatFileSize(existingRegulation.size) }}</template>
                  </small>
                </template>
                <template v-else>
                  <strong class="block text-sm">Nessun regolamento allegato</strong>
                  <small class="text-xs text-muted-color">Qualsiasi formato, massimo 6 MB.</small>
                </template>
              </div>

              <div class="flex flex-wrap gap-2">
                <Button
                  v-if="existingRegulation && !regulationFile"
                  type="button"
                  label="Scarica"
                  icon="pi pi-download"
                  severity="secondary"
                  text
                  @click="downloadExistingRegulation"
                />
                <Button
                  type="button"
                  :label="regulationFile || existingRegulation ? 'Sostituisci' : 'Scegli file'"
                  icon="pi pi-upload"
                  severity="secondary"
                  outlined
                  @click="openRegulationPicker"
                />
                <Button
                  v-if="regulationFile"
                  type="button"
                  icon="pi pi-times"
                  severity="secondary"
                  text
                  aria-label="Rimuovi il file selezionato"
                  @click="clearSelectedRegulation"
                />
              </div>
            </div>
          </section>

          <!------------------------------>
          <!-- Section: Form actions -->
          <!------------------------------>
          <div
            class="-mx-3 -mb-3 flex flex-col gap-3 border-t border-(--color-border) bg-(--color-surface-card) p-3 sm:mx-0 sm:mb-0 sm:flex-row sm:items-center sm:justify-between sm:px-0 sm:pb-0 sm:pt-5"
          >
            <p class="flex items-center gap-2 text-xs text-muted-color">
              <i class="pi pi-info-circle text-primary" aria-hidden="true" />
              {{ isEditing ? 'Le modifiche saranno applicate al torneo.' : 'Il torneo verrà creato come bozza e potrai pubblicarlo in seguito.' }}
            </p>
            <div class="grid grid-cols-2 gap-2 sm:flex">
              <Button
                type="button"
                label="Annulla"
                severity="secondary"
                outlined
                @click="cancel"
              />
              <Button
                type="submit"
                :label="isEditing ? 'Salva modifiche' : 'Crea torneo'"
                icon="pi pi-check"
                :loading="saving"
              />
            </div>
          </div>
        </form>
      </template>
    </Card>
  </div>
</template>
