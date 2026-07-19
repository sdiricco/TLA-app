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
import { requestsService } from '../services/requestsApi'
import type { OrganizationRequestPriority, OrganizationRequestType } from '../types'

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
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    saving.value = false
  }
}

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
      } catch (e) {
        error.value = (e as Error).message
      } finally {
        uploadingImage.value = false
      }
    }
    input.click()
  })
}
</script>

<template>
  <section class="request-create-page">
    <button class="back-link" type="button" @click="router.push({ name: 'requests' })">
      <i class="pi pi-arrow-left" />
      Torna alle richieste
    </button>

    <header class="page-header">
      <p class="eyebrow">BACKLOG ORGANIZZAZIONE</p>
      <h1>Nuova richiesta</h1>
      <p>Racconta con chiarezza l’idea o il problema che vuoi condividere.</p>
    </header>

    <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

    <form class="request-form-card" @submit.prevent="createRequest">
      <section class="form-section">
        <div class="section-heading">
          <span class="section-number">1</span>
          <div>
            <h2>Contenuto</h2>
            <p>Dai un titolo breve e aggiungi tutti i dettagli utili.</p>
          </div>
        </div>

        <div class="field">
          <label for="request-title">Titolo <span aria-hidden="true">*</span></label>
          <InputText id="request-title" v-model="title" placeholder="Es. Aggiungere il calendario delle partite" minlength="3" maxlength="120" fluid required />
        </div>

        <div class="field">
          <div class="field-label">
            <label for="request-description">Descrizione</label>
            <small>Puoi inserire elenchi, link e immagini</small>
          </div>
          <Editor
            id="request-description"
            v-model="description"
            class="description-editor"
            placeholder="Descrivi il problema, il contesto e il risultato desiderato…"
            editor-style="height: 250px"
            @load="handleEditorLoad"
          >
            <template #toolbar>
              <span class="ql-formats">
                <select class="ql-header" aria-label="Stile testo">
                  <option value="1">Titolo</option>
                  <option value="2">Sottotitolo</option>
                  <option selected>Testo</option>
                </select>
              </span>
              <span class="ql-formats">
                <button class="ql-bold" type="button" aria-label="Grassetto" />
                <button class="ql-italic" type="button" aria-label="Corsivo" />
                <button class="ql-underline" type="button" aria-label="Sottolineato" />
              </span>
              <span class="ql-formats">
                <button class="ql-list" value="ordered" type="button" aria-label="Elenco numerato" />
                <button class="ql-list" value="bullet" type="button" aria-label="Elenco puntato" />
                <button class="ql-blockquote" type="button" aria-label="Citazione" />
              </span>
              <span class="ql-formats">
                <button class="ql-link" type="button" aria-label="Inserisci link" />
                <button class="ql-image" type="button" aria-label="Inserisci immagine" />
                <button class="ql-clean" type="button" aria-label="Rimuovi formattazione" />
              </span>
            </template>
          </Editor>
          <small v-if="uploadingImage" class="upload-status"><i class="pi pi-spin pi-spinner" /> Caricamento immagine…</small>
        </div>
      </section>

      <section class="form-section classification-section">
        <div class="section-heading">
          <span class="section-number">2</span>
          <div>
            <h2>Classificazione</h2>
            <p>Aiuta l’organizzazione a valutare la richiesta.</p>
          </div>
        </div>
        <div class="form-grid">
          <div class="field">
            <label for="request-type">Tipo</label>
            <Select id="request-type" v-model="type" :options="typeOptions" option-label="label" option-value="value" fluid />
          </div>
          <div class="field">
            <label for="request-priority">Priorità</label>
            <Select id="request-priority" v-model="priority" :options="priorityOptions" option-label="label" option-value="value" fluid />
          </div>
        </div>
      </section>

      <footer class="form-actions">
        <p><i class="pi pi-users" /> Visibile ai membri dell’organizzazione</p>
        <Button type="submit" label="Pubblica richiesta" icon="pi pi-send" :loading="saving" :disabled="uploadingImage || title.trim().length < 3" />
      </footer>
    </form>
  </section>
</template>

<style scoped>
.request-create-page { display: grid; width: min(900px, 100%); margin: 0 auto; gap: 1.15rem; padding: clamp(1rem, 3vw, 2.25rem) 0; }
.back-link { display: inline-flex; width: fit-content; align-items: center; gap: .5rem; min-height: 2.4rem; padding: 0 .25rem; border: 0; background: transparent; color: var(--color-text-muted); font-size: .8rem; font-weight: 750; cursor: pointer; }
.back-link:hover { color: var(--color-primary-700); }
.page-header { display: grid; gap: .4rem; padding: .35rem 0 .25rem; }
.eyebrow { margin: 0; color: var(--color-primary-700); font-size: .7rem; font-weight: 850; letter-spacing: .14em; }
h1, h2 { margin: 0; color: var(--color-text); letter-spacing: -.035em; }
h1 { font-size: clamp(2rem, 4vw, 2.65rem); }
h2 { font-size: 1rem; }
.page-header > p:last-child, .section-heading p { margin: 0; color: var(--color-text-muted); line-height: 1.5; }
.page-header > p:last-child { font-size: .95rem; }
.request-form-card { overflow: hidden; border: 1px solid var(--color-border); border-radius: .75rem; background: var(--color-surface-card); box-shadow: 0 14px 34px rgb(var(--color-shadow-rgb) / 6%); }
.form-section { display: grid; gap: 1.25rem; padding: clamp(1.15rem, 3vw, 1.75rem); }
.form-section + .form-section { border-top: 1px solid var(--color-border); }
.classification-section { background: var(--color-surface-soft); }
.section-heading { display: flex; align-items: flex-start; gap: .75rem; }
.section-heading p { margin-top: .15rem; font-size: .78rem; }
.section-number { display: grid; flex: 0 0 1.8rem; width: 1.8rem; height: 1.8rem; place-items: center; border-radius: 50%; background: var(--color-primary-100); color: var(--color-primary-700); font-size: .75rem; font-weight: 850; }
.field { display: grid; min-width: 0; gap: .48rem; }
.field-label { display: flex; align-items: baseline; justify-content: space-between; gap: .75rem; }
.field label { color: var(--color-text); font-size: .8rem; font-weight: 750; }
.field label span { color: var(--color-danger, #b42318); }
.field-label small { color: var(--color-text-subtle); font-size: .7rem; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.description-editor { overflow: hidden; border-radius: .5rem; }
.description-editor :deep(.p-editor-toolbar) { padding: .55rem .65rem; border-color: var(--color-border); background: var(--color-surface-soft); }
.description-editor :deep(.p-editor-content) { border-color: var(--color-border); background: var(--color-surface-card); }
.description-editor :deep(.ql-editor) { padding: 1rem 1.1rem; color: var(--color-text); font-family: inherit; font-size: .92rem; line-height: 1.65; }
.description-editor :deep(.ql-editor.ql-blank::before) { left: 1.1rem; right: 1.1rem; color: var(--color-text-subtle); font-style: normal; }
.description-editor :deep(.ql-editor img) { max-width: 100%; max-height: 420px; object-fit: contain; }
.upload-status { display: inline-flex; align-items: center; gap: .35rem; color: var(--color-primary-700); font-size: .74rem; font-weight: 700; }
.form-actions { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem clamp(1.15rem, 3vw, 1.75rem); border-top: 1px solid var(--color-border); background: var(--color-surface-card); }
.form-actions p { display: flex; align-items: center; gap: .45rem; margin: 0; color: var(--color-text-subtle); font-size: .75rem; }
@media (max-width: 680px) {
  .form-grid { grid-template-columns: 1fr; }
  .field-label { align-items: flex-start; flex-direction: column; gap: .15rem; }
  .form-actions { align-items: stretch; flex-direction: column; }
  .form-actions :deep(.p-button) { width: 100%; justify-content: center; }
  .description-editor :deep(.p-editor-toolbar) { white-space: normal; }
}
</style>
