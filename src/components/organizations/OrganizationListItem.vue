<script setup lang="ts">
// -----------------------------------------------------------------------------
// Imports
// -----------------------------------------------------------------------------
import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import {
  canManageOrganization,
  organizationInitials,
  organizationRoleLabel,
  organizationRoleSeverity,
  organizationVisibilityLabel,
} from '@/components/organizations/organizationLabels'
import type { Organization } from '@/types'

// -----------------------------------------------------------------------------
// Props and events
// -----------------------------------------------------------------------------
defineProps<{
  organization: Organization
  active: boolean
}>()

defineEmits<{
  select: [organization: Organization]
  copyCode: [organization: Organization]
}>()
</script>

<template>
  <article
    class="group relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-(--color-border) px-4 py-3.5 transition-colors last:border-b-0 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-primary sm:px-5"
    :class="active ? 'bg-primary-50/60' : 'hover:bg-(--color-surface-soft)'"
  >
    <!-- Section: Select action (covers the row) -->
    <button
      type="button"
      class="absolute inset-0 z-10 cursor-pointer focus:outline-none"
      :aria-label="active ? `${organization.name}, organizzazione attiva` : `Passa a ${organization.name}`"
      :aria-current="active ? 'true' : undefined"
      @click="$emit('select', organization)"
    />

    <Avatar
      :label="organizationInitials(organization.name)"
      shape="circle"
      class="size-11! shrink-0 text-sm! font-bold!"
      :class="active ? 'bg-primary! text-white!' : 'bg-primary-50! text-primary!'"
      aria-hidden="true"
    />

    <!-- Section: Identity -->
    <span class="grid min-w-0 gap-1">
      <strong class="truncate text-sm transition-colors group-hover:text-primary sm:text-base">{{ organization.name }}</strong>
      <small class="flex min-w-0 items-center gap-1.5 truncate text-xs text-(--color-text-muted)">
        <span v-if="organization.city" class="truncate">{{ organization.city }}</span>
        <span v-if="organization.city" aria-hidden="true">·</span>
        <span class="truncate">{{ organizationVisibilityLabel(organization) }}</span>
        <template v-if="organization.member_count !== undefined">
          <span class="hidden sm:inline" aria-hidden="true">·</span>
          <span class="hidden shrink-0 sm:inline">{{ organization.member_count }} membri</span>
        </template>
      </small>
    </span>

    <!-- Section: Status and actions -->
    <span class="flex items-center gap-2">
      <Tag
        class="hidden sm:inline-flex"
        :value="organizationRoleLabel(organization.role)"
        :severity="organizationRoleSeverity(organization.role)"
      />
      <Tag v-if="active" value="Attiva" icon="pi pi-check" severity="success" />
      <Button
        v-if="organization.join_code && canManageOrganization(organization)"
        icon="pi pi-copy"
        severity="secondary"
        text
        rounded
        size="small"
        class="relative z-20"
        :aria-label="`Copia codice invito di ${organization.name}`"
        title="Copia codice invito"
        @click="$emit('copyCode', organization)"
      />
      <i v-if="!active" class="pi pi-chevron-right text-xs text-(--color-text-subtle) transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </span>
  </article>
</template>
