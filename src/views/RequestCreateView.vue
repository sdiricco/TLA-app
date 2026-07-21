<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Editor from 'primevue/editor'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import type { EditorLoadEvent } from 'primevue/editor'
import 'quill/dist/quill.snow.css'
import { requestsService } from '@/services/requestsApi'
import type { OrganizationRequestPriority, OrganizationRequestType } from '@/types'

// Local form and asynchronous upload state.
const router = useRouter()
const title = ref('')
const description = ref('')
const type = ref<OrganizationRequestType>('improvement')
const priority = ref<OrganizationRequestPriority>('medium')
const saving = ref(false)
const uploadingImage = ref(false)
const error = ref<string | null>(null)

const typeOptions: Array<{ label: string; value: OrganizationRequestType }> = [
  { label: 'Funzionalità', value: 'feature' },
  { label: 'Miglioramento', value: 'improvement' },
  { label: 'Bug', value: 'bug' },
]
const priorityOptions: Array<{ label: string; value: OrganizationRequestPriority }> = [
  { label: 'Bassa', value: 'low' },
  { label: 'Media', value: 'medium' },
  { label: 'Alta', value: 'high' },
]

function hasEditorContent(value: string): boolean {
  return /<img\b/i.test(value) || value.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0
}

async function createRequest(): Promise<void> {
  if (!title.value.trim() || uploadingImage.value) return
  saving.value = true
  error.value = null
  try {
    const request = await requestsService.create({
      title: title.value.trim(),
      description: hasEditorContent(description.value) ? description.value : null,
      type: type.value,
      priority: priority.value,
    })
    await router.push({ name: 'request-detail', params: { id: request.id } })
  } catch (requestError) {
    error.value = (requestError as Error).message
  } finally {
    saving.value = false
  }
}

// Quill's image action is replaced with the application's upload service.
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Immagine non valida'))
    reader.onerror = () => reject(new Error('Impossibile leggere l’immagine'))
    reader.readAsDataURL(file)
  })
}

function handleEditorLoad(event: EditorLoadEvent): void {
  const quill = event.instance
  const toolbar = quill.getModule('toolbar')
  toolbar.addHandler('image', () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/jpeg,image/png,image/webp,image/gif'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      if (file.size > 5 * 1024 * 1024) {
        error.value = 'L’immagine deve essere più piccola di 5 MB.'
        return
      }
      uploadingImage.value = true
      error.value = null
      try {
        const dataUrl = await readAsDataUrl(file)
        const { url } = await requestsService.uploadImage(dataUrl)
        const range = quill.getSelection(true)
        const index = range?.index ?? Math.max(0, quill.getLength() - 1)
        quill.insertEmbed(index, 'image', url, 'user')
        quill.setSelection(index + 1, 0, 'silent')
      } catch (requestError) {
        error.value = (requestError as Error).message
      } finally {
        uploadingImage.value = false
      }
    }
    input.click()
  })
}
</script>

<template>
  <!------------------------------>
  <!-- Page layout -->
  <!------------------------------>
  <section class="mx-auto grid w-full max-w-225 gap-4 py-4 sm:py-8">
    <Button class="w-fit" icon="pi pi-arrow-left" label="Torna alle richieste" text severity="secondary" @click="router.push({ name: 'requests' })" />

    <!-- Section: Header -->
    <header>
      <p class="mb-2 text-xs font-extrabold tracking-[0.14em] text-primary-700">BACKLOG ORGANIZZAZIONE</p>
      <h1 class="text-3xl font-bold tracking-tight sm:text-4xl">Nuova richiesta</h1>
      <p class="mt-2 leading-relaxed text-(--color-text-muted)">Racconta con chiarezza l’idea o il problema che vuoi condividere.</p>
    </header>

    <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

    <!------------------------------>
    <!-- Section: Request form -->
    <!------------------------------>
    <form class="overflow-hidden border border-(--color-border) bg-(--color-surface-card) shadow-sm" @submit.prevent="createRequest">
      <!-- Content section -->
      <section class="grid gap-5 p-4 sm:p-7">
        <div class="flex items-start gap-3">
          <span class="grid size-7 shrink-0 place-items-center rounded-full bg-primary-100 text-xs font-extrabold text-primary-700">1</span>
          <div><h2 class="font-bold">Contenuto</h2><p class="mt-1 text-sm text-(--color-text-muted)">Dai un titolo breve e aggiungi tutti i dettagli utili.</p></div>
        </div>

        <label for="request-title" class="grid gap-2 text-sm font-bold">
          <span>Titolo <span class="text-red-700" aria-hidden="true">*</span></span>
          <InputText id="request-title" v-model="title" placeholder="Es. Aggiungere il calendario delle partite" minlength="3" maxlength="120" fluid required />
        </label>

        <div class="grid gap-2">
          <div class="flex flex-col items-start justify-between gap-1 sm:flex-row sm:items-baseline"><label for="request-description" class="text-sm font-bold">Descrizione</label><small class="text-xs text-(--color-text-subtle)">Puoi inserire elenchi, link e immagini</small></div>
          <Editor
            id="request-description"
            v-model="description"
            class="overflow-hidden [&_.p-editor-content]:border-(--color-border) [&_.p-editor-toolbar]:border-(--color-border) [&_.p-editor-toolbar]:bg-(--color-surface-soft) [&_.ql-editor]:min-h-64 [&_.ql-editor]:p-4 [&_.ql-editor]:text-sm [&_.ql-editor]:leading-relaxed [&_.ql-editor_img]:max-h-105 [&_.ql-editor_img]:max-w-full [&_.ql-editor_img]:object-contain"
            placeholder="Descrivi il problema, il contesto e il risultato desiderato…"
            @load="handleEditorLoad"
          >
            <template #toolbar>
              <span class="ql-formats"><select class="ql-header" aria-label="Stile testo"><option value="1">Titolo</option><option value="2">Sottotitolo</option><option selected>Testo</option></select></span>
              <span class="ql-formats"><button class="ql-bold" type="button" aria-label="Grassetto" /><button class="ql-italic" type="button" aria-label="Corsivo" /><button class="ql-underline" type="button" aria-label="Sottolineato" /></span>
              <span class="ql-formats"><button class="ql-list" value="ordered" type="button" aria-label="Elenco numerato" /><button class="ql-list" value="bullet" type="button" aria-label="Elenco puntato" /><button class="ql-blockquote" type="button" aria-label="Citazione" /></span>
              <span class="ql-formats"><button class="ql-link" type="button" aria-label="Inserisci link" /><button class="ql-image" type="button" aria-label="Inserisci immagine" /><button class="ql-clean" type="button" aria-label="Rimuovi formattazione" /></span>
            </template>
          </Editor>
          <small v-if="uploadingImage" class="inline-flex items-center gap-2 text-xs font-bold text-primary-700"><i class="pi pi-spin pi-spinner" /> Caricamento immagine…</small>
        </div>
      </section>

      <!-- Classification section -->
      <section class="grid gap-5 border-t border-(--color-border) bg-(--color-surface-soft) p-4 sm:p-7">
        <div class="flex items-start gap-3"><span class="grid size-7 shrink-0 place-items-center rounded-full bg-primary-100 text-xs font-extrabold text-primary-700">2</span><div><h2 class="font-bold">Classificazione</h2><p class="mt-1 text-sm text-(--color-text-muted)">Aiuta l’organizzazione a valutare la richiesta.</p></div></div>
        <div class="grid gap-4 sm:grid-cols-2">
          <label for="request-type" class="grid gap-2 text-sm font-bold">Tipo<Select id="request-type" v-model="type" :options="typeOptions" option-label="label" option-value="value" fluid /></label>
          <label for="request-priority" class="grid gap-2 text-sm font-bold">Priorità<Select id="request-priority" v-model="priority" :options="priorityOptions" option-label="label" option-value="value" fluid /></label>
        </div>
      </section>

      <!-- Form actions -->
      <footer class="flex flex-col items-stretch justify-between gap-3 border-t border-(--color-border) p-4 sm:flex-row sm:items-center sm:px-7">
        <p class="flex items-center gap-2 text-xs text-(--color-text-subtle)"><i class="pi pi-users" /> Visibile ai membri dell’organizzazione</p>
        <Button type="submit" label="Pubblica richiesta" icon="pi pi-send" :loading="saving" :disabled="uploadingImage || title.trim().length < 3" />
      </footer>
    </form>
  </section>
</template>
