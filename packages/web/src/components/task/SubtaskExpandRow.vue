<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NCheckbox, NButton, NIcon, NSpin, NEmpty } from 'naive-ui'
import { TrashOutline } from '@vicons/ionicons5'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { taskService } from '@/services/task'

const props = defineProps<{
  taskId: string
  workspaceId: string
}>()

const subtasks = ref<any[]>([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    subtasks.value = await taskService.getSubtasks(props.taskId)
  } catch {
    subtasks.value = []
  } finally {
    loading.value = false
  }
}

async function toggle(id: string, done: boolean) {
  const completedAt = done ? new Date().toISOString() : null
  await taskService.updateSubtask(id, { completedAt })
  const idx = subtasks.value.findIndex(s => s.id === id)
  if (idx !== -1) subtasks.value[idx] = { ...subtasks.value[idx], completedAt }
}

async function remove(id: string) {
  await taskService.deleteSubtask(id)
  subtasks.value = subtasks.value.filter(s => s.id !== id)
}

onMounted(load)
</script>

<template>
  <NSpin :show="loading" :content-style="{ minHeight: '40px', padding: '8px 0' }">
    <NEmpty v-if="!loading && !subtasks.length" :size="'small'" description="ไม่มีงานย่อย"
      style="padding: 12px 0" />
    <div v-else class="subtask-expand">
      <div v-for="st in subtasks" :key="st.id" class="subtask-row">
        <NCheckbox :checked="!!st.completedAt" @update:checked="toggle(st.id, $event)" />
        <StatusBadge v-if="st.statusName" :name="st.statusName" :color="st.statusColor" />
        <span class="st-title" :class="{ done: !!st.completedAt }">{{ st.title }}</span>
        <NButton size="tiny" quaternary type="error" class="st-delete" @click="remove(st.id)">
          <template #icon>
            <NIcon>
              <TrashOutline />
            </NIcon>
          </template>
        </NButton>
      </div>
    </div>
  </NSpin>
</template>

<style scoped>
.subtask-expand {
  padding: 6px 16px 6px 44px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--color-surface-variant, #f8fafc);
  border-top: 1px solid var(--color-border);
}

.subtask-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border-radius: var(--radius-sm);
  transition: background 0.1s ease;
}

.subtask-row:hover {
  background: var(--color-surface);
}

.st-title {
  flex: 1;
  font-size: 0.85rem;
  line-height: 1.4;
}

.done {
  text-decoration: line-through;
  color: var(--color-text-tertiary);
}

.st-delete {
  opacity: 0;
  transition: opacity 0.15s ease;
}

.subtask-row:hover .st-delete {
  opacity: 1;
}
</style>
