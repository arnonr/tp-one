<script setup lang="ts">
import { computed } from 'vue'
import { NSelect } from 'naive-ui'
import { useWorkspaceStore, ALL_WORKSPACES_ID } from '@/stores/workspace'

const ws = useWorkspaceStore()

const modelValue = computed({
  get: () => ws.currentWorkspaceId === null ? ALL_WORKSPACES_ID : ws.currentWorkspaceId,
  set: (val: string) => ws.setCurrentWorkspace(val === ALL_WORKSPACES_ID ? null : val),
})
</script>

<template>
  <NSelect
    v-model:value="modelValue"
    :options="ws.selectorOptions"
    placeholder="เลือกพื้นที่ทำงาน"
    size="small"
    :loading="ws.loading"
    style="min-width: 180px; max-width: 240px;"
  />
</template>
