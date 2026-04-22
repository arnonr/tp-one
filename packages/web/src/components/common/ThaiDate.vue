<script setup lang="ts">
import { computed } from 'vue'
import { formatThaiDate, formatThaiDateFull, relativeTime } from '@/utils/thai'

const props = defineProps<{
  date: string | Date
  format?: 'short' | 'full' | 'relative'
}>()

const formatted = computed(() => {
  const fmt = props.format || 'short'
  if (fmt === 'full') return formatThaiDateFull(props.date)
  if (fmt === 'relative') return relativeTime(props.date)
  return formatThaiDate(props.date)
})
</script>

<template>
  <span class="thai-date">{{ formatted }}</span>
</template>
