<script setup lang="ts">
import { NTag, NIcon } from 'naive-ui'
import { computed } from 'vue'
import { FlagOutline } from '@vicons/ionicons5'
import type { TaskPriority } from '@/types'

const props = defineProps<{ priority: TaskPriority }>()

const config: Record<TaskPriority, { label: string; type: 'error' | 'warning' | 'info' | 'default' }> = {
  urgent: { label: 'เร่งด่วน', type: 'error' },
  high: { label: 'สูง', type: 'warning' },
  normal: { label: 'ปกติ', type: 'info' },
  low: { label: 'ต่ำ', type: 'default' },
}

const current = computed(() => config[props.priority] || config.normal)
</script>

<template>
  <NTag :type="current.type" size="small" round :bordered="false">
    <template #icon>
      <NIcon :size="14"><FlagOutline /></NIcon>
    </template>
    {{ current.label }}
  </NTag>
</template>
