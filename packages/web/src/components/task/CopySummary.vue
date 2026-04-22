<script setup lang="ts">
import { NButton, NIcon, NDropdown, useMessage } from 'naive-ui'
import { CopyOutline, CheckmarkOutline } from '@vicons/ionicons5'
import { useClipboard } from '@/composables/useClipboard'
import { ref } from 'vue'

const props = defineProps<{
  task: {
    title: string
    description?: string
    statusName?: string
    priority?: string
    dueDate?: string
    startDate?: string
    assigneeName?: string
    workspaceName?: string
    subtasks?: Array<{ title: string; statusName?: string }>
  }
}>()

const message = useMessage()
const { copied, copy, formatTaskShort, formatTaskFull } = useClipboard()

async function handleCopy(format: 'short' | 'full') {
  const text = format === 'short' ? formatTaskShort(props.task) : formatTaskFull(props.task)
  const ok = await copy(text)
  if (ok) {
    message.success(format === 'short' ? 'คัดลอกสรุปสั้นแล้ว' : 'คัดลอกรายละเอียดแล้ว')
  }
}

const options = [
  { label: 'สรุปสั้น (Telegram)', key: 'short' },
  { label: 'รายละเอียดเต็ม', key: 'full' },
]
</script>

<template>
  <NDropdown :options="options" @select="(key: string) => handleCopy(key as 'short' | 'full')">
    <NButton :type="copied ? 'success' : 'default'" size="small" quaternary>
      <template #icon>
        <NIcon>
          <CheckmarkOutline v-if="copied" />
          <CopyOutline v-else />
        </NIcon>
      </template>
      {{ copied ? 'คัดลอกแล้ว' : 'คัดลอก' }}
    </NButton>
  </NDropdown>
</template>
