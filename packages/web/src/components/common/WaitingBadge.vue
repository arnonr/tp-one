<script setup lang="ts">
import { NTag, NIcon } from 'naive-ui'
import { TimeOutline } from '@vicons/ionicons5'

defineProps<{ count?: number }>()
</script>

<template>
  <NTag type="warning" size="small" round :bordered="false">
    <template #icon>
      <NIcon :size="13"><TimeOutline /></NIcon>
    </template>
    รอหน่วยงานอื่น{{ count && count > 1 ? ` (${count})` : '' }}
  </NTag>
</template>
