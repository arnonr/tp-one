---
name: tp-one-frontend
description: Use when working on any frontend code in tp-one project (packages/web/) — writing Vue 3 pages, components, Pinia stores, composables, or routing with TypeScript and Naive UI. Enforces Thai-first design, consistent patterns, design quality, and clean code.
---

# TP-One Frontend Skill

Vue 3 + Naive UI + Pinia frontend สำหรับระบบจัดการงานอุทยานเทคโนโลยี — สร้าง UI ที่ใช้งานได้จริง สวยงาม และเป็นระบบ

## เอกสารอ้างอิง

อ่านเมื่อต้องการ context เพิ่มเติม:
- `docs/SYSTEM_ANALYSIS.md` — requirements เต็ม (เฉพาะส่วน UI/UX)
- `docs/superpowers/plans/2026-04-21-tp-one-implementation.md` — phase ปัจจุบัน + task details
- `docs/api-spec.md` — API endpoints ที่ frontend เรียก
- `references/component_scaffold.md` — scaffolding templates สำหรับ page, component, composable, store, service

---

## 1. Design Thinking — คิดก่อนเขียน

ก่อนเขียน component/page ใดๆ ให้ตอบคำถามเหล่านี้:

- **Purpose**: หน้านี้แก้ปัญหาอะไร? ใครใช้? ใช้บ่อยแค่ไหน?
- **Tone**: เลือก aesthetic direction ให้ชัด — สำหรับระบบราชการให้เน้น **utilitarian/clean** (ไม่ใช่ flashy marketing page)
- **Constraints**: Naive UI components, Thai-first, desktop-first, scoped styles
- **Differentiation**: อะไรทำให้หน้านี้ใช้ง่ายกว่าเดิม? (เช่น filter ปีงบประมาณด้านบน, Kanban view, สถานะเป็นสี)

### Design Principles สำหรับ TP-One

| Principle | Apply |
|-----------|-------|
| **Functional beauty** | ระบบงาน — clean > flashy. ใช้ได้จริงสำคัญกว่าสวยแบบ one-time |
| **Typography** | ใช้ font ที่อ่านง่ายสำหรับภาษาไทย (Sarabun, Noto Sans Thai). ไม่ใช้ Inter/Roboto กับภาษาไทย |
| **Color** | ใช้ CSS variables จาก tokens.css. สีเป็นสื่อความหมาย (priority/status) ไม่ใช่แค่ตกแต่ง |
| **Motion** | transition สำหรับ loading/hover/state change เท่านั้น. ไม่ต้อง animation ฟุ่มเฟือย |
| **Spatial** | whitespace อย่างเพียงพอ. Group related items. ใช้ grid/flex อย่างมีระเบียบ |
| **Feedback** | ทุก action ต้องมี feedback (loading state, success/error message, optimistic update) |

### สิ่งที่ต้องหลีกเลี่ยง

- generic "AI slop" aesthetics — purple gradients, cookie-cutter layouts
- hardcode สี, spacing, font size (ใช้ CSS variables)
- สร้าง custom UI primitives เมื่อ Naive UI มีให้แล้ว
- over-animate — ระบบงานต้องรู้สึก "มืออาชีพ" ไม่ใช่ "toy"

---

## 2. Architecture Rules

### File Organization — แยกตาม feature domain

```
src/
├── components/{feature}/    # Feature-specific components
├── components/common/       # Shared: ThaiDate, PriorityBadge, StatusBadge
├── components/layout/       # AppLayout, Sidebar, Header, QuickNotePanel
├── composables/             # useThaiDate, useFiscalYear, usePermissions, useClipboard
├── stores/                  # Pinia: auth, workspace, notification, ui
├── services/                # API calls (one file per domain)
├── utils/                   # thai.ts, format.ts
├── views/                   # Page-level components
└── router/                  # Route definitions
```

### Component Structure — เขียนแบบเดียวกันทุก component

```vue
<script setup lang="ts">
// 1. Imports (typed)
import { ref, computed, onMounted } from 'vue'
import { NButton, NInput, NSpace } from 'naive-ui'
import { useThaiDate } from '@/composables/useThaiDate'
import type { Task } from '@/types'

// 2. Props & Emits
const props = defineProps<{ taskId: string }>()
const emit = defineEmits<{ (e: 'update', task: Task): void }>()

// 3. Composables
const { formatShort } = useThaiDate()

// 4. Reactive state
const loading = ref(false)
const task = ref<Task | null>(null)

// 5. Computed
const isOverdue = computed(() => ...)

// 6. Methods
async function fetchTask() { ... }

// 7. Lifecycle
onMounted(fetchTask)
</script>

<template>
  <!-- Single root element. Thai labels. -->
</template>

<style scoped>
/* Scoped styles only. Use CSS variables from tokens.css */
</style>
```

---

## 3. Thai-First Rules — บังคับทุกหน้า

### วันที่ — ใช้ พ.ศ. เท่านั้น

```typescript
// ✅ ถูก
<span>{{ formatShort(task.dueDate) }}</span>  // → "21 เม.ย. 2569"

// ❌ ผิด
<span>{{ new Date(task.dueDate).toLocaleDateString() }}</span>  // → "4/21/2026"
<span>{{ dayjs(task.dueDate).format('DD/MM/YYYY') }}</span>    // → "21/04/2026"
```

ใช้ composable `useThaiDate()`:
- `formatShort(date)` → `21 เม.ย. 2569`
- `formatFull(date)` → `21 เมษายน 2569`
- `formatMonth(date)` → `เม.ย. 2569`
- `relative(date)` → `วันนี้`, `เลย 3 วัน`, `อีก 5 วัน`

### ปีงบประมาณ — default filter ทุกหน้า

```vue
<script setup lang="ts">
import { useFiscalYear } from '@/composables/useFiscalYear'
const { selectedFY, fyOptions, fyLabel } = useFiscalYear()
</script>

<template>
  <FiscalYearFilter v-model:value="selectedFY" :options="fyOptions" />
</template>
```

### UI Text — ภาษาไทยทั้งหมด

```typescript
// ✅ ถูก — Thai labels
const menuItems = [
  { label: 'งานของฉัน', key: 'my-work' },
  { label: 'สร้างงานใหม่', key: 'create' },
]

// ❌ ผิด — English labels
const menuItems = [
  { label: 'My Work', key: 'my-work' },
  { label: 'New Task', key: 'create' },
]
```

### Naive UI — ตั้งค่า Thai locale

```vue
<!-- App.vue -->
<NConfigProvider :locale="thTH" :date-locale="dateThTH">
  <NMessageProvider>
    <NDialogProvider>
      <RouterView />
    </NDialogProvider>
  </NMessageProvider>
</NConfigProvider>
```

---

## 4. Component Patterns

### ใช้ Naive UI components — ไม่สร้าง UI primitives เอง

```typescript
// ✅ ใช้ Naive UI
import { NButton, NInput, NDataTable, NModal } from 'naive-ui'

// ❌ ไม่สร้างเอง
// <button class="custom-btn">...</button>
// <input class="custom-input" />
```

### Data fetching — ใช้ service pattern

```typescript
// services/task.ts
import api from './api'

export const taskService = {
  list: (params: TaskFilter) => api.get('/api/tasks', { params }),
  getById: (id: string) => api.get(`/api/tasks/${id}`),
  create: (data: CreateTaskInput) => api.post('/api/tasks', data),
  update: (id: string, data: UpdateTaskInput) => api.put(`/api/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/api/tasks/${id}`),
}
```

### State management — Pinia store pattern

```typescript
// stores/workspace.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { workspaceService } from '@/services/workspace'

export const useWorkspaceStore = defineStore('workspace', () => {
  const workspaces = ref<Workspace[]>([])
  const activeWorkspaceId = ref<string | null>(null)

  const activeWorkspace = computed(() =>
    workspaces.value.find(w => w.id === activeWorkspaceId.value)
  )

  async function fetchAll() {
    const { data } = await workspaceService.list()
    workspaces.value = data.data
  }

  return { workspaces, activeWorkspaceId, activeWorkspace, fetchAll }
})
```

### Props down, Events up — ไม่ mutate props

```vue
<!-- Parent -->
<TaskCard :task="task" @status-change="handleStatusChange" />

<!-- Child: TaskCard.vue -->
<script setup lang="ts">
const props = defineProps<{ task: Task }>()
const emit = defineEmits<{
  (e: 'statusChange', taskId: string, statusId: string): void
}>()

function changeStatus(newStatusId: string) {
  emit('statusChange', props.task.id, newStatusId)
}
</script>
```

---

## 5. Common Components — ใช้ซ้ำ

| Component | Usage |
|-----------|-------|
| `ThaiDate` | `<ThaiDate :date="task.dueDate" format="short" />` |
| `PriorityBadge` | `<PriorityBadge priority="urgent" />` → "เร่งด่วน" |
| `StatusBadge` | `<StatusBadge :status="task.status" />` |
| `FiscalYearFilter` | `<FiscalYearFilter v-model="selectedFY" />` |
| `UserAvatar` | `<UserAvatar :user="task.assignee" />` |

---

## 6. Style System

### CSS Variables — tokens.css

```css
/* ✅ ใช้ CSS variables */
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: var(--space-md);
  border-radius: var(--radius-md);
  transition: box-shadow var(--duration-fast) var(--ease-out);
}

/* ❌ ห้าม hardcode */
.card {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  padding: 16px;
}
```

### Scoped Styles เท่านั้น

```vue
<!-- ✅ ถูก -->
<style scoped>

<!-- ❌ ห้าม global styles ใน component -->
<style>
```

### Responsive

- Desktop-first (1024px–1920px)
- ใช้ Naive UI responsive props เมื่อต้องการ mobile-friendly
- Minimum: tablet landscape support (768px)
- ใช้ `clamp()` สำหรับ fluid sizing

### Motion — ใช้เท่าที่จำเป็น

```css
/* ✅ Compositor-friendly properties */
.card {
  transition: transform 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease;
}

/* ❌ ห้าม animate layout properties */
.card {
  transition: width 0.3s, height 0.3s, padding 0.3s;
}
```

---

## 7. Error Handling & UX Feedback

```typescript
import { useMessage } from 'naive-ui'

const message = useMessage()

// ทุก async action ต้องมี loading + try/catch + feedback
async function saveTask() {
  try {
    loading.value = true
    await taskService.create(formData)
    message.success('สร้างงานสำเร็จ')
    emit('created')
  } catch (error) {
    message.error('สร้างงานไม่สำเร็จ กรุณาลองใหม่')
  } finally {
    loading.value = false
  }
}
```

### Loading States — ทุกหน้าที่โหลดข้อมูล

```vue
<template>
  <NSpin :show="loading">
    <NEmpty v-if="!data.length && !loading" description="ไม่มีข้อมูล" />
    <template v-else>
      <!-- content -->
    </template>
  </NSpin>
</template>
```

### Optimistic Update — เมื่อ action เร็ว

```typescript
async function toggleStatus(taskId: string, newStatus: string) {
  const prev = tasks.value.find(t => t.id === taskId)?.status
  // Optimistic: update UI immediately
  updateLocalStatus(taskId, newStatus)
  try {
    await taskService.updateStatus(taskId, newStatus)
  } catch {
    // Rollback on failure
    updateLocalStatus(taskId, prev!)
    message.error('เปลี่ยนสถานะไม่สำเร็จ')
  }
}
```

---

## 8. Kanban-specific Rules

- Columns = workspace custom statuses
- Drag-and-drop ใช้ `vuedraggable` หรือ HTML5 DnD API
- Card แสดง: title, priority badge, assignee avatar, Thai due date
- Status change ผ่าน API call `PATCH /api/tasks/:id/status`

---

## 9. TypeScript Rules

```typescript
// ✅ มี type ทุกตัวแปร
interface Task {
  id: string
  title: string
  dueDate: string | null
  priority: 'urgent' | 'high' | 'normal' | 'low'
}

// ❌ ห้าม any
const task: any = {} // ผิด

// API response type
interface ApiResponse<T> {
  success: boolean
  data: T
  error?: { code: string; message: string }
}
```

### Import Alias

```typescript
// ✅ ใช้ @/ alias (configured in vite.config.ts)
import { useThaiDate } from '@/composables/useThaiDate'
import TaskCard from '@/components/task/TaskCard.vue'

// ❌ ห้าม relative path ข้ามโฟลเดอร์
import { useThaiDate } from '../../composables/useThaiDate'
```

---

## Quick Reference — Thai Labels

```typescript
const PRIORITY_LABELS = {
  urgent: 'เร่งด่วน',
  high: 'สูง',
  normal: 'ปกติ',
  low: 'ต่ำ',
}

const PROJECT_STATUS_LABELS = {
  planning: 'วางแผน',
  active: 'กำลังดำเนินการ',
  on_hold: 'ระงับชั่วคราว',
  completed: 'เสร็จสิ้น',
  cancelled: 'ยกเลิก',
}
```
