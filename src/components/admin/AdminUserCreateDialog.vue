<script setup lang="ts">
// Form to add an account that can sign in right away (email already
// confirmed). The parent performs the request and closes the dialog.
import { ref, watch } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import SelectButton from 'primevue/selectbutton'
import type { AdminUserCreate, UserRole } from '@/types'

defineProps<{ saving: boolean }>()
const emit = defineEmits<{ submit: [data: AdminUserCreate] }>()
const visible = defineModel<boolean>('visible', { required: true })

const name = ref('')
const email = ref('')
const password = ref('')
const role = ref<UserRole>('player')
const error = ref<string | null>(null)
const roleOptions = [
  { label: 'Giocatore', value: 'player' },
  { label: 'Amministratore', value: 'admin' },
]

// Start from a clean form every time the dialog opens.
watch(visible, (open) => {
  if (!open) return
  name.value = ''
  email.value = ''
  password.value = ''
  role.value = 'player'
  error.value = null
})

function submit(): void {
  if (!/^\S+@\S+\.\S+$/.test(email.value.trim())) {
    error.value = 'Inserisci un indirizzo email valido.'
    return
  }
  if (password.value.length < 8) {
    error.value = 'La password deve avere almeno 8 caratteri.'
    return
  }
  error.value = null
  emit('submit', { name: name.value.trim() || undefined, email: email.value.trim(), password: password.value, role: role.value })
}
</script>

<template>
  <Dialog v-model:visible="visible" modal header="Nuovo utente" class="w-full max-w-md" :draggable="false">
    <form class="grid gap-4" @submit.prevent="submit">
      <p class="text-sm text-(--color-text-muted)">L’account è già confermato: l’utente può accedere subito con questa password.</p>
      <label class="grid gap-1.5 text-sm font-semibold">
        Nome e cognome
        <InputText v-model="name" autocomplete="off" fluid />
      </label>
      <label class="grid gap-1.5 text-sm font-semibold">
        Email
        <InputText v-model="email" type="email" autocomplete="off" fluid required />
      </label>
      <label class="grid gap-1.5 text-sm font-semibold" for="admin-new-user-password">
        Password
        <Password v-model="password" input-id="admin-new-user-password" :feedback="false" toggle-mask fluid autocomplete="new-password" />
      </label>
      <div class="grid gap-1.5 text-sm font-semibold">
        Ruolo
        <SelectButton v-model="role" :options="roleOptions" option-label="label" option-value="value" :allow-empty="false" aria-label="Ruolo" />
      </div>
      <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>
      <div class="flex justify-end gap-2 pt-1">
        <Button label="Annulla" severity="secondary" text type="button" @click="visible = false" />
        <Button label="Crea utente" icon="pi pi-user-plus" type="submit" :loading="saving" />
      </div>
    </form>
  </Dialog>
</template>
