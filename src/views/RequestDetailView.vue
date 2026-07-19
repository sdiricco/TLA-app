<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import { useAuthStore } from '../stores/auth'
import { requestsService } from '../services/requestsApi'
import type { OrganizationRequest, OrganizationRequestComment, OrganizationRequestStatus, OrganizationRequestType } from '../types'

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

function typeLabel(value: OrganizationRequestType): string { return value === 'feature' ? 'Funzionalità' : value === 'bug' ? 'Bug' : 'Miglioramento' }
function statusLabel(value: OrganizationRequestStatus): string { return statusOptions.find(option => option.value === value)?.label ?? value }
function statusSeverity(value: OrganizationRequestStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
  if (value === 'done') return 'success'
  if (value === 'in_progress') return 'info'
  if (value === 'rejected') return 'danger'
  if (value === 'planned') return 'warn'
  return 'secondary'
}

async function loadDetail(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const id = String(route.params.id)
    const [loadedRequest, loadedComments] = await Promise.all([requestsService.getById(id), requestsService.getComments(id)])
    request.value = loadedRequest
    comments.value = loadedComments
  } catch (e) { error.value = (e as Error).message }
  finally { loading.value = false }
}

async function addComment(): Promise<void> {
  if (!request.value || !commentBody.value.trim()) return
  savingComment.value = true
  error.value = null
  try {
    const comment = await requestsService.createComment(request.value.id, commentBody.value.trim())
    comments.value.push(comment)
    commentBody.value = ''
  } catch (e) { error.value = (e as Error).message }
  finally { savingComment.value = false }
}

onMounted(() => { void loadDetail() })
</script>

<template>
  <section class="request-detail-page">
    <RouterLink to="/requests" class="back-link">← Torna alle richieste</RouterLink>
    <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>
    <p v-if="loading" class="loading-copy">Caricamento dettaglio…</p>

    <template v-else-if="request">
      <article class="detail-card">
        <div class="detail-topline">
          <div class="detail-tags"><Tag :value="typeLabel(request.type)" severity="info" /><Tag :value="statusLabel(request.status)" :severity="statusSeverity(request.status)" /></div>
          <span class="priority">{{ request.important_count }} {{ request.important_count === 1 ? 'persona la considera importante' : 'persone la considerano importante' }}</span>
        </div>
        <h1>{{ request.title }}</h1>
        <p v-if="request.description" class="description">{{ request.description }}</p>
        <img v-if="request.image_url" class="detail-image" :src="request.image_url" alt="Immagine allegata alla richiesta" />
        <small>Proposta da {{ request.created_by.name }} · {{ new Date(request.created_at).toLocaleDateString('it-IT') }}</small>
      </article>

      <section class="comments-card">
        <div class="section-heading"><div><p class="eyebrow">DISCUSSIONE</p><h2>Commenti</h2></div><span>{{ comments.length }}</span></div>
        <Message v-if="!comments.length" severity="info" :closable="false">Non ci sono ancora commenti. Aggiungi il primo contributo.</Message>
        <div v-else class="comments-list">
          <article v-for="comment in comments" :key="comment.id" class="comment">
            <div class="comment-meta"><strong>{{ comment.author.name }}</strong><small>{{ new Date(comment.created_at).toLocaleDateString('it-IT') }} · {{ new Date(comment.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) }}</small></div>
            <p>{{ comment.body }}</p>
          </article>
        </div>

        <form v-if="!auth.isGuest" class="comment-form" @submit.prevent="addComment">
          <label for="comment">Aggiungi un commento</label>
          <textarea id="comment" v-model="commentBody" class="native-textarea" rows="4" maxlength="2000" placeholder="Condividi un dettaglio o una proposta…" required />
          <Button type="submit" label="Pubblica commento" icon="pi pi-send" :loading="savingComment" :disabled="!commentBody.trim()" />
        </form>
        <p v-else class="login-copy">Accedi o registrati per partecipare alla discussione.</p>
      </section>
    </template>
  </section>
</template>

<style scoped>
.request-detail-page { width: min(920px, 100%); margin: 0 auto; padding: clamp(1rem, 3vw, 2.5rem) 0; display: grid; gap: 1rem; }
.back-link { color: var(--color-primary-700); font-size: .82rem; font-weight: 800; text-decoration: none; }
.detail-card, .comments-card { display: grid; gap: 1rem; padding: clamp(1.15rem, 3vw, 1.7rem); border: 1px solid var(--color-border); background: var(--color-surface-card); box-shadow: 0 12px 28px rgb(var(--color-shadow-rgb) / 5%); }
.detail-topline, .section-heading, .comment-meta { display: flex; align-items: center; justify-content: space-between; gap: .8rem; }
.detail-tags { display: flex; flex-wrap: wrap; gap: .4rem; }
.priority, .section-heading > span { color: var(--color-text-muted); font-size: .76rem; font-weight: 750; }
h1, h2 { margin: 0; color: var(--color-text); letter-spacing: -.035em; }
h1 { font-size: clamp(1.8rem, 4vw, 2.7rem); }
h2 { font-size: 1.35rem; }
.description { margin: 0; color: var(--color-text-muted); line-height: 1.65; white-space: pre-wrap; }
.detail-card small, .comment-meta small, .login-copy { color: var(--color-text-subtle); font-size: .74rem; }
.detail-image { width: min(100%, 680px); max-height: 440px; object-fit: contain; justify-self: start; border: 1px solid var(--color-border); background: var(--color-surface-soft); }
.eyebrow { margin: 0 0 .3rem; color: var(--color-primary-700); font-size: .7rem; font-weight: 850; letter-spacing: .14em; }
.comments-list { display: grid; gap: .8rem; }
.comment { padding: .9rem 1rem; border-left: 3px solid var(--color-primary-500); background: var(--color-surface-soft); }
.comment-meta { justify-content: flex-start; align-items: baseline; }
.comment-meta strong { color: var(--color-text); font-size: .86rem; }
.comment p { margin: .5rem 0 0; color: var(--color-text); line-height: 1.55; white-space: pre-wrap; }
.comment-form { display: grid; gap: .55rem; padding-top: .5rem; border-top: 1px solid var(--color-border); }
.comment-form label { color: var(--color-text-muted); font-size: .78rem; font-weight: 750; }
.native-textarea { width: 100%; border: 1px solid var(--color-border); background: var(--color-surface-card); color: var(--color-text); font: inherit; padding: .75rem; resize: vertical; }
.loading-copy { color: var(--color-text-muted); }
@media (max-width: 620px) { .detail-topline { align-items: flex-start; flex-direction: column; } }
</style>
