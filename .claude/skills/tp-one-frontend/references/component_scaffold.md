# TP-One Vue Component Scaffolding Reference

## สร้าง Component/Page ใหม่ — Checklist

### 1. Page View

ไฟล์: `src/views/{FeatureName}View.vue`

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useMessage } from 'naive-ui'
import { NCard, NSpin, NEmpty } from 'naive-ui'
import { useThaiDate } from '@/composables/useThaiDate'
import { useFiscalYear } from '@/composables/useFiscalYear'
import { taskService } from '@/services/task'

const route = useRoute()
const message = useMessage()
const { formatShort } = useThaiDate()
const { selectedFY } = useFiscalYear()

const loading = ref(false)
const data = ref<Task[]>([])

async function loadData() {
  try {
    loading.value = true
    const { data: result } = await taskService.list({
      fiscalYear: selectedFY.value,
    })
    data.value = result.data
  } catch {
    message.error('โหลดข้อมูลไม่สำเร็จ')
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>ชื่อหน้า</h1>
    </div>

    <NSpin :show="loading">
      <NEmpty v-if="!data.length" description="ไม่มีข้อมูล" />
      <template v-else>
        <!-- content -->
      </template>
    </NSpin>
  </div>
</template>

<style scoped>
.page-container { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-header h1 { font-size: 1.5rem; font-weight: 600; margin: 0; }
</style>
```

### 2. Feature Component

ไฟล์: `src/components/{feature}/{ComponentName}.vue`

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { NTag, NAvatar, NButton } from 'naive-ui'
import { useThaiDate } from '@/composables/useThaiDate'
import ThaiDate from '@/components/common/ThaiDate.vue'
import PriorityBadge from '@/components/common/PriorityBadge.vue'
import type { Task } from '@/types'

const props = defineProps<{ task: Task }>()
const emit = defineEmits<{
  (e: 'update', task: Task): void
  (e: 'delete', id: string): void
}>()

const { relative } = useThaiDate()

const isOverdue = computed(() => {
  if (!props.task.dueDate) return false
  return new Date(props.task.dueDate) < new Date()
})
</script>

<template>
  <div class="task-card" :class="{ overdue: isOverdue }">
    <div class="task-card-header">
      <PriorityBadge :priority="task.priority" />
      <ThaiDate :date="task.dueDate" format="short" />
    </div>
    <div class="task-card-title">{{ task.title }}</div>
    <div class="task-card-footer">
      <NAvatar v-if="task.assignee" round size="tiny">
        {{ task.assignee.name.charAt(0) }}
      </NAvatar>
      <NButton size="tiny" @click="emit('update', task)">แก้ไข</NButton>
    </div>
  </div>
</template>

<style scoped>
.task-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px 16px;
  transition: box-shadow 0.15s ease;
}
.task-card:hover { box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); }
.task-card.overdue { border-left: 3px solid #e53e3e; }
.task-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.task-card-title { font-weight: 500; margin-bottom: 8px; }
.task-card-footer { display: flex; justify-content: space-between; align-items: center; }
</style>
```

### 3. Common Component

ไฟล์: `src/components/common/{ComponentName}.vue`

```vue
<!-- ThaiDate.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { formatThaiDate, formatThaiDateShort, formatThaiDateFull } from '@/utils/thai'

const props = withDefaults(defineProps<{
  date: string | Date | null
  format?: 'short' | 'full'
}>(), { format: 'short' })

const display = computed(() => {
  if (!props.date) return '-'
  const d = typeof props.date === 'string' ? props.date : props.date
  return props.format === 'full' ? formatThaiDateFull(d) : formatThaiDateShort(d)
})
</script>

<template>
  <span class="thai-date">{{ display }}</span>
</template>
```

### 4. Composable

ไฟล์: `src/composables/{name}.ts`

```typescript
// composables/usePermissions.ts
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

export function usePermissions() {
  const authStore = useAuthStore()

  const isAdmin = computed(() => authStore.user?.role === 'admin')

  function canEditWorkspace(permission: string | null) {
    if (isAdmin.value) return true
    return permission === 'owner' || permission === 'editor'
  }

  function canManageWorkspace(permission: string | null) {
    if (isAdmin.value) return true
    return permission === 'owner'
  }

  return { isAdmin, canEditWorkspace, canManageWorkspace }
}
```

### 5. API Service

ไฟล์: `src/services/{domain}.ts`

```typescript
// services/workspace.ts
import api from './api'

export interface Workspace {
  id: string
  name: string
  type: string
  color: string | null
  description: string | null
}

export const workspaceService = {
  list: () => api.get<{ success: boolean; data: Workspace[] }>('/api/workspaces'),
  getById: (id: string) => api.get<{ success: boolean; data: Workspace }>(`/api/workspaces/${id}`),
  create: (data: Partial<Workspace>) => api.post('/api/workspaces', data),
  update: (id: string, data: Partial<Workspace>) => api.put(`/api/workspaces/${id}`, data),
  delete: (id: string) => api.delete(`/api/workspaces/${id}`),
}
```

### 6. Pinia Store

ไฟล์: `src/stores/{name}.ts`

```typescript
// stores/notification.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { notificationService } from '@/services/notification'

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref<Notification[]>([])
  const unreadCount = computed(() => notifications.value.filter(n => !n.isRead).length)

  async function fetchAll() {
    const { data } = await notificationService.list()
    notifications.value = data.data
  }

  async function markRead(id: string) {
    await notificationService.markRead(id)
    const n = notifications.value.find(n => n.id === id)
    if (n) n.isRead = true
  }

  return { notifications, unreadCount, fetchAll, markRead }
})
```

## Component Naming Rules

| Type | Convention | Example |
|------|-----------|---------|
| Page view | `{Name}View.vue` | `TaskListView.vue` |
| Feature component | `{Name}.vue` in `components/{feature}/` | `TaskCard.vue` |
| Common component | `{Name}.vue` in `components/common/` | `ThaiDate.vue` |
| Composable | `use{Name}.ts` | `useThaiDate.ts` |
| Store | `{name}.ts` | `auth.ts` |
| Service | `{name}.ts` | `task.ts` |
