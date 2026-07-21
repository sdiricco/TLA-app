<script setup lang="ts">
import Skeleton from 'primevue/skeleton'

withDefaults(defineProps<{ count?: number }>(), {
  count: 6,
})
</script>

<template>
  <div class="grid w-full grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3" aria-busy="true">
    <div
      v-for="item in count"
      :key="item"
      class="grid min-h-24 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 border border-(--color-border) bg-(--color-surface-card) px-3 py-2"
    >
      <Skeleton class="col-start-1 row-start-1 w-[min(11rem,70%)]!" height="1rem" />
      <Skeleton
        class="col-start-2 row-start-1 self-center justify-self-end"
        width="4.5rem"
        height="0.8rem"
      />
      <div class="col-span-full row-start-2 flex items-center gap-1.5">
        <Skeleton width="1rem" height="1rem" />
        <Skeleton width="11rem" height="0.8rem" />
      </div>
      <div class="col-span-full row-start-3 flex items-center gap-3">
        <Skeleton width="7rem" height="0.8rem" />
        <Skeleton width="5rem" height="0.8rem" />
      </div>
    </div>
  </div>
</template>
