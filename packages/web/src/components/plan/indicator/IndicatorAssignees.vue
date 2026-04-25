<script setup lang="ts">
import { NTag, NIcon } from 'naive-ui'
import { CloseOutline } from '@vicons/ionicons5'
import type { UserMini } from '@/types/plan'

const props = defineProps<{
  assignees: UserMini[]
  maxDisplay?: number
}>()

const emit = defineEmits<{
  remove: [userId: string]
}>()
</script>

<template>
  <div class="indicator-assignees">
    <NTag
      v-for="assignee in assignees.slice(0, maxDisplay || assignees.length)"
      :key="assignee.id"
      closable
      size="small"
      @close="emit('remove', assignee.id)"
    >
      {{ assignee.name }}
    </NTag>
    <NTag v-if="assignees.length > (maxDisplay || assignees.length)" size="small" :bordered="false">
      +{{ assignees.length - (maxDisplay || assignees.length) }}
    </NTag>
  </div>
</template>

<style scoped>
.indicator-assignees {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2xs);
}
</style>