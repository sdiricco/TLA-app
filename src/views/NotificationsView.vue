<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import moment from 'moment'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import PageHeader from '@/components/layout/PageHeader.vue'
import { useNotificationsStore } from '@/stores/notifications'
import { useOrganizationsStore } from '@/stores/organizations'

const notifications = useNotificationsStore()
const organizations = useOrganizationsStore()
const toast = useToast()
const respondingId = ref<string | null>(null)
const pendingCount = computed(() => notifications.items.filter((item) => item.status === 'pending').length)

function formattedDate(value: string): string {
  return moment(value).locale('it').format('D MMM YYYY, HH:mm')
}

function statusLabel(status: string): string {
  if (status === 'accepted') return 'Accettato'
  if (status === 'declined') return 'Rifiutato'
  return 'Da gestire'
}

function statusSeverity(status: string): 'success' | 'danger' | 'warn' {
  if (status === 'accepted') return 'success'
  if (status === 'declined') return 'danger'
  return 'warn'
}

async function respond(id: string, decision: 'accepted' | 'declined'): Promise<void> {
  respondingId.value = id
  try {
    await notifications.respond(id, decision)
    if (decision === 'accepted') await organizations.load()
    toast.add({
      severity: decision === 'accepted' ? 'success' : 'info',
      summary: decision === 'accepted' ? 'Invito accettato' : 'Invito rifiutato',
      detail: decision === 'accepted' ? 'L’organizzazione è ora disponibile nel selettore dell’header.' : undefined,
      life: 3500,
    })
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Operazione non riuscita', detail: (error as Error).message, life: 4500 })
  } finally {
    respondingId.value = null
  }
}

onMounted(() => notifications.load())
</script>

<template>
  <div class="mx-auto flex w-full max-w-5xl flex-col gap-5 text-(--color-text)">
    <!-- Section: Header -->
    <PageHeader eyebrow="ACCOUNT" title="Notifiche" description="Inviti e aggiornamenti che richiedono la tua attenzione.">
      <Tag v-if="pendingCount" :value="`${pendingCount} da gestire`" severity="warn" rounded />
    </PageHeader>

    <!-- Section: Loading -->
    <div v-if="notifications.loading" class="grid gap-3">
      <Skeleton v-for="item in 3" :key="item" height="8rem" border-radius="0.75rem" />
    </div>

    <Message v-else-if="notifications.error" severity="error" :closable="false">
      {{ notifications.error }}
    </Message>

    <!-- Section: Empty state -->
    <section v-else-if="!notifications.items.length" class="grid min-h-72 place-items-center rounded-xl border border-dashed border-(--color-border) bg-(--color-surface-card) p-8 text-center">
      <div>
        <span class="mx-auto grid size-14 place-items-center rounded-full bg-primary-50 text-xl text-primary"><i class="pi pi-bell" /></span>
        <h2 class="mt-4 text-lg font-bold">Nessuna notifica</h2>
        <p class="mt-1 text-sm text-(--color-text-muted)">Quando riceverai un invito a un’organizzazione lo troverai qui.</p>
      </div>
    </section>

    <!-- Section: Notification feed -->
    <section v-else class="grid gap-3" aria-label="Elenco notifiche">
      <article
        v-for="notification in notifications.items"
        :key="notification.id"
        class="rounded-xl border border-(--color-border) bg-(--color-surface-card) p-4 sm:p-5"
      >
        <div class="flex items-start gap-3 sm:gap-4">
          <span class="grid size-11 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary"><i class="pi pi-building" /></span>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="font-bold">Invito in {{ notification.organization.name }}</h2>
              <Tag :value="statusLabel(notification.status)" :severity="statusSeverity(notification.status)" rounded />
            </div>
            <p class="mt-1 text-sm text-(--color-text-muted)">
              {{ notification.invited_by?.name ?? 'Un amministratore' }} ti ha invitato a entrare come giocatore.
            </p>
            <small class="mt-2 block text-(--color-text-subtle)">{{ formattedDate(notification.created_at) }}</small>
          </div>
        </div>
        <div v-if="notification.status === 'pending'" class="mt-4 flex flex-col gap-2 border-t border-(--color-border) pt-4 sm:flex-row sm:justify-end">
          <Button label="Rifiuta" icon="pi pi-times" severity="secondary" outlined :loading="respondingId === notification.id" @click="respond(notification.id, 'declined')" />
          <Button label="Accetta invito" icon="pi pi-check" :loading="respondingId === notification.id" @click="respond(notification.id, 'accepted')" />
        </div>
      </article>
    </section>
  </div>
</template>
