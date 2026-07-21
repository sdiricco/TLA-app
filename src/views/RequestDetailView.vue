<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import moment from 'moment'
import 'moment/locale/it.js'
import Button from 'primevue/button'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import Tag from 'primevue/tag'
import Textarea from 'primevue/textarea'
import { requestsService } from '@/services/requestsApi'
import { useAuthStore } from '@/stores/auth'
import type { OrganizationRequest, OrganizationRequestComment, OrganizationRequestStatus, OrganizationRequestType } from '@/types'

// Route services and detail state.
const route = useRoute()
const auth = useAuthStore()
const request = ref<OrganizationRequest | null>(null)
const comments = ref<OrganizationRequestComment[]>([])
const commentBody = ref('')
const loading = ref(true)
const savingComment = ref(false)
const error = ref<string | null>(null)

const statusOptions: Array<{ label: string; value: OrganizationRequestStatus }> = [
  { label: 'Aperta', value: 'open' },
  { label: 'Pianificata', value: 'planned' },
  { label: 'In lavorazione', value: 'in_progress' },
  { label: 'Completata', value: 'done' },
  { label: 'Rifiutata', value: 'rejected' },
]

// Presentation mappings for API enum values and dates.
function typeLabel(value: OrganizationRequestType): string {
  return value === 'feature' ? 'Funzionalità' : value === 'bug' ? 'Bug' : 'Miglioramento'
}

function statusLabel(value: OrganizationRequestStatus): string {
  return statusOptions.find((option) => option.value === value)?.label ?? value
}

function statusSeverity(value: OrganizationRequestStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
  if (value === 'done') return 'success'
  if (value === 'in_progress') return 'info'
  if (value === 'rejected') return 'danger'
  if (value === 'planned') return 'warn'
  return 'secondary'
}

function formatDate(value: string): string {
  const date = moment(value, moment.ISO_8601, true)
  return date.isValid() ? date.locale('it').format('L') : '—'
}

function formatDateTime(value: string): string {
  const date = moment(value, moment.ISO_8601, true)
  return date.isValid() ? date.locale('it').format('L · HH:mm') : '—'
}

// Request and comments are independent and load in parallel.
async function loadDetail(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const id = String(route.params['id'])
    const [loadedRequest, loadedComments] = await Promise.all([
      requestsService.getById(id),
      requestsService.getComments(id),
    ])
    request.value = loadedRequest
    comments.value = loadedComments
  } catch (requestError) {
    error.value = (requestError as Error).message
  } finally {
    loading.value = false
  }
}

async function addComment(): Promise<void> {
  if (!request.value || !commentBody.value.trim()) return
  savingComment.value = true
  error.value = null
  try {
    const comment = await requestsService.createComment(request.value.id, commentBody.value.trim())
    comments.value.push(comment)
    commentBody.value = ''
  } catch (requestError) {
    error.value = (requestError as Error).message
  } finally {
    savingComment.value = false
  }
}

onMounted(loadDetail)
</script>

<template>
  <!------------------------------>
  <!-- Page layout -->
  <!------------------------------>
  <section class="mx-auto grid w-full max-w-230 gap-4 py-4 sm:py-8">
    <RouterLink to="/requests" class="text-sm font-bold text-primary-700 no-underline">← Torna alle richieste</RouterLink>
    <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

    <div v-if="loading" class="flex min-h-40 items-center justify-center gap-3 text-sm text-(--color-text-muted)" role="status">
      <ProgressSpinner class="size-8" stroke-width="4" />
      <span>Caricamento dettaglio…</span>
    </div>

    <template v-else-if="request">
      <!------------------------------>
      <!-- Section: Request detail -->
      <!------------------------------>
      <article class="grid gap-4 border border-(--color-border) bg-(--color-surface-card) p-4 shadow-sm sm:p-7">
        <div class="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div class="flex flex-wrap gap-2">
            <Tag :value="typeLabel(request.type)" severity="info" />
            <Tag :value="statusLabel(request.status)" :severity="statusSeverity(request.status)" />
          </div>
          <span class="text-xs font-bold text-(--color-text-muted)">{{ request.important_count }} {{ request.important_count === 1 ? 'persona la considera importante' : 'persone la considerano importante' }}</span>
        </div>

        <h1 class="text-3xl font-bold tracking-tight sm:text-4xl">{{ request.title }}</h1>
        <div
          v-if="request.description"
          class="wrap-anywhere leading-relaxed text-(--color-text-muted) [&_.ql-align-center]:text-center [&_.ql-align-justify]:text-justify [&_.ql-align-right]:text-right [&_.ql-ui]:hidden [&_a]:text-primary-700 [&_blockquote]:my-4 [&_blockquote]:border-l-3 [&_blockquote]:border-primary-500 [&_blockquote]:pl-4 [&_h1]:my-3 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:my-3 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:my-3 [&_h3]:text-lg [&_h3]:font-bold [&_img]:my-4 [&_img]:max-h-140 [&_img]:max-w-full [&_img]:object-contain [&_ol]:pl-6 [&_ul]:pl-6"
          v-html="request.description"
        />
        <img v-if="request.image_url" class="max-h-110 w-full max-w-170 justify-self-start border border-(--color-border) bg-(--color-surface-soft) object-contain" :src="request.image_url" alt="Immagine allegata alla richiesta" />
        <small class="text-xs text-(--color-text-subtle)">Proposta da {{ request.created_by.name }} · {{ formatDate(request.created_at) }}</small>
      </article>

      <!------------------------------>
      <!-- Section: Discussion -->
      <!------------------------------>
      <section class="grid gap-4 border border-(--color-border) bg-(--color-surface-card) p-4 shadow-sm sm:p-7">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="mb-1 text-xs font-extrabold tracking-[0.14em] text-primary-700">DISCUSSIONE</p>
            <h2 class="text-2xl font-bold tracking-tight">Commenti</h2>
          </div>
          <span class="text-xs font-bold text-(--color-text-muted)">{{ comments.length }}</span>
        </div>

        <Message v-if="!comments.length" severity="info" :closable="false">Non ci sono ancora commenti. Aggiungi il primo contributo.</Message>
        <div v-else class="grid gap-3">
          <article v-for="comment in comments" :key="comment.id" class="border-l-3 border-primary-500 bg-(--color-surface-soft) px-4 py-3">
            <div class="flex flex-wrap items-baseline gap-2">
              <strong class="text-sm">{{ comment.author.name }}</strong>
              <small class="text-xs text-(--color-text-subtle)">{{ formatDateTime(comment.created_at) }}</small>
            </div>
            <p class="mt-2 whitespace-pre-wrap leading-relaxed">{{ comment.body }}</p>
          </article>
        </div>

        <!-- Comment form -->
        <form v-if="!auth.isGuest" class="grid gap-2 border-t border-(--color-border) pt-4" @submit.prevent="addComment">
          <label for="comment" class="text-sm font-bold text-(--color-text-muted)">Aggiungi un commento</label>
          <Textarea id="comment" v-model="commentBody" rows="4" maxlength="2000" placeholder="Condividi un dettaglio o una proposta…" fluid required />
          <Button class="justify-self-start" type="submit" label="Pubblica commento" icon="pi pi-send" :loading="savingComment" :disabled="!commentBody.trim()" />
        </form>
        <p v-else class="text-xs text-(--color-text-subtle)">Accedi o registrati per partecipare alla discussione.</p>
      </section>
    </template>
  </section>
</template>
