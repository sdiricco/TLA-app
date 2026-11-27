<script setup lang="ts">
// -----------------------------------------------------------------------------
// Imports
// -----------------------------------------------------------------------------
import { computed, ref, watch } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import { useOrganizationsStore } from '@/stores/organizations'
import type { Organization } from '@/types'

// -----------------------------------------------------------------------------
// Model, events and state
// -----------------------------------------------------------------------------
const visible = defineModel<boolean>('visible', { required: true })
const emit = defineEmits<{ joined: [organization: Organization] }>()

const store = useOrganizationsStore()
const joinCode = ref('')
const joining = ref(false)
const joinError = ref<string | null>(null)

// New codes are 5 uppercase characters; older invitation tokens are longer.
const joinCodeIsValid = computed(() =>
  /^[A-Z0-9]{5}$/.test(joinCode.value) || /^[A-Za-z0-9_-]{8,64}$/.test(joinCode.value),
)

// -----------------------------------------------------------------------------
// Actions
// -----------------------------------------------------------------------------
function normalizeJoinCode(): void {
  const normalized = joinCode.value.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64)
  joinCode.value = normalized.length <= 5 ? normalized.toUpperCase() : normalized
}

async function joinOrganization(): Promise<void> {
  normalizeJoinCode()
  if (!joinCodeIsValid.value) {
    joinError.value = 'Inserisci un codice invito valido.'
    return
  }
  joining.value = true
  joinError.value = null
  try {
    const organization = await store.join(joinCode.value)
    visible.value = false
    emit('joined', organization)
  } catch (error) {
    joinError.value = (error as Error).message
  } finally {
    joining.value = false
  }
}

// Every opening starts from an empty form.
watch(visible, (isVisible) => {
  if (!isVisible) return
  joinCode.value = ''
  joinError.value = null
})
</script>

<template>
  <Dialog v-model:visible="visible" modal header="Entra con codice" class="mx-4 w-full max-w-md">
    <form class="grid gap-4" @submit.prevent="joinOrganization">
      <p class="text-sm leading-relaxed text-(--color-text-muted)">
        Inserisci il codice ricevuto dall’amministratore dell’organizzazione.
      </p>
      <Message v-if="joinError" severity="error" :closable="false">{{ joinError }}</Message>
      <div class="grid gap-2">
        <label for="organization-join-code" class="text-sm font-bold text-(--color-text-muted)">Codice invito</label>
        <InputText
          id="organization-join-code"
          v-model="joinCode"
          placeholder="A1B2C"
          maxlength="64"
          autocomplete="off"
          class="text-center font-mono text-lg tracking-[0.3em]"
          fluid
          autofocus
          @input="normalizeJoinCode"
        />
        <small class="text-xs text-(--color-text-muted)">I nuovi codici hanno 5 caratteri: lettere maiuscole e numeri.</small>
      </div>
      <Button type="submit" label="Entra nell’organizzazione" icon="pi pi-sign-in" :loading="joining" :disabled="!joinCodeIsValid" fluid />
    </form>
  </Dialog>
</template>
