<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  name: string
  color?: string
}>()

const style = computed(() => ({
  backgroundColor: props.color ? `${props.color}20` : '#f1f5f9',
  color: props.color || '#64748b',
  borderColor: props.color || '#e2e8f0',
}))
</script>

<template>
  <span class="status-badge" :style="style">
    {{ name }}
  </span>
</template>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid;
  white-space: nowrap;
}
</style>
