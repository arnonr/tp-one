<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  NDrawer, NDrawerContent, NDescriptions, NDescriptionsItem, NButton,
  NSpace, NIcon, NInput, NAvatar, NDivider, NPopconfirm, NSpin,
  useMessage, useDialog,
} from 'naive-ui'
import {
  CreateOutline, TrashOutline, CopyOutline, AddCircleOutline,
  SendOutline,
} from '@vicons/ionicons5'
import PriorityBadge from '@/components/common/PriorityBadge.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import ThaiDate from '@/components/common/ThaiDate.vue'
import { useTaskStore } from '@/stores/task'
import { useClipboard } from '@/composables/useClipboard'
import { relativeTime } from '@/utils/thai'
import type { TaskPriority } from '@/types'

const props = defineProps<{
  show: boolean
  taskId: string | null
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'edit', taskId: string): void
  (e: 'deleted'): void
}>()

const message = useMessage()
const dialog = useDialog()
const taskStore = useTaskStore()
const { copy, formatTaskFull } = useClipboard()

const commentText = ref('')

const loading = computed(() => taskStore.loading)
const task = computed(() => taskStore.currentTask)
const subtasks = computed(() => taskStore.subtasks)
const comments = computed(() => taskStore.comments)

const priorityLabels: Record<TaskPriority, string> = {
  urgent: 'เร่งด่วน',
  high: 'สูง',
  normal: 'ปกติ',
  low: 'ต่ำ',
}

watch(() => props.taskId, async (id) => {
  if (id && props.show) {
    await taskStore.fetchTaskById(id)
  }
})

watch(() => props.show, async (show) => {
  if (show && props.taskId) {
    await taskStore.fetchTaskById(props.taskId)
  }
  if (!show) {
    taskStore.clearCurrent()
  }
})

async function handleDelete() {
  if (!props.taskId) return
  try {
    await taskStore.deleteTask(props.taskId)
    message.success('ลบงานสำเร็จ')
    emit('update:show', false)
    emit('deleted')
  } catch {
    message.error('ลบงานไม่สำเร็จ')
  }
}

function handleCopy() {
  if (!task.value) return
  const text = formatTaskFull({
    title: task.value.title,
    description: task.value.description,
    statusName: (task.value as any).statusName,
    priority: task.value.priority,
    dueDate: task.value.dueDate,
    startDate: task.value.startDate,
    assigneeName: (task.value as any).assignees?.map((a: any) => a.name).join(', '),
    reporterName: (task.value as any).reporterName,
    workspaceName: (task.value as any).workspaceName,
    projectName: (task.value as any).projectName,
    fiscalYear: task.value.fiscalYear,
    budget: (task.value as any).budget,
    estimatedHours: (task.value as any).estimatedHours,
    subtasks: subtasks.value.map(st => ({
      title: st.title,
      statusName: (st as any).statusName,
    })),
  })
  copy(text)
  message.success('คัดลอกไปยังคลิปบอร์ดแล้ว')
}

async function handleAddComment() {
  if (!props.taskId || !commentText.value.trim()) return
  try {
    await taskStore.addComment(props.taskId, commentText.value.trim())
    commentText.value = ''
    message.success('เพิ่มความคิดเห็นสำเร็จ')
  } catch {
    message.error('เพิ่มความคิดเห็นไม่สำเร็จ')
  }
}

function handleEdit() {
  if (!props.taskId) return
  emit('edit', props.taskId)
}

function handleClose() {
  emit('update:show', false)
}
</script>

<template>
  <NDrawer :show="show" :width="560" placement="right" :mask-closable="true" @update:show="emit('update:show', $event)">
    <NDrawerContent :title="task?.title || 'รายละเอียดงาน'" closable>
      <NSpin :show="loading">
        <template v-if="task">
          <!-- Header Actions -->
          <NSpace class="detail-actions" align="center" justify="end">
            <NButton size="small" quaternary @click="handleCopy">
              <template #icon>
                <NIcon>
                  <CopyOutline />
                </NIcon>
              </template>
              คัดลอก
            </NButton>
            <NButton size="small" quaternary @click="handleEdit">
              <template #icon>
                <NIcon>
                  <CreateOutline />
                </NIcon>
              </template>
              แก้ไข
            </NButton>
            <NPopconfirm @positive-click="handleDelete">
              <template #trigger>
                <NButton size="small" quaternary type="error">
                  <template #icon>
                    <NIcon>
                      <TrashOutline />
                    </NIcon>
                  </template>
                  ลบ
                </NButton>
              </template>
              ยืนยันลบงานนี้?
            </NPopconfirm>
          </NSpace>

          <!-- Task Info -->
          <NDescriptions label-placement="left" :column="1" bordered size="small" class="detail-info">
            <NDescriptionsItem label="ความสำคัญ">
              <PriorityBadge :priority="task.priority" />
            </NDescriptionsItem>
            <NDescriptionsItem label="สถานะ">
              <StatusBadge v-if="(task as any).statusName" :name="(task as any).statusName"
                :color="(task as any).statusColor" />
              <span v-else>—</span>
            </NDescriptionsItem>
            <NDescriptionsItem label="พื้นที่งาน">
              {{ (task as any).workspaceName || '—' }}
            </NDescriptionsItem>
            <NDescriptionsItem v-if="(task as any).projectName" label="โครงการ">
              {{ (task as any).projectName }}
            </NDescriptionsItem>
            <NDescriptionsItem label="ผู้รับผิดชอบ">
              <NSpace v-if="(task as any).assignees?.length" size="small" align="center">
                <span v-for="a in (task as any).assignees" :key="a.userId">{{ a.name }}, </span>
              </NSpace>
              <span v-else>—</span>
            </NDescriptionsItem>
            <NDescriptionsItem label="ผู้แจ้ง">
              {{ (task as any).reporterName || '—' }}
            </NDescriptionsItem>
            <NDescriptionsItem label="ปีงบประมาณ">
              {{ task.fiscalYear ? `${task.fiscalYear}` : '—' }}
            </NDescriptionsItem>
            <NDescriptionsItem label="งบประมาณ">
              {{ (task as any).budget ? `฿${Number((task as any).budget).toLocaleString()}` : '—' }}
            </NDescriptionsItem>
            <NDescriptionsItem label="เวลาที่ประเมิน">
              {{ (task as any).estimatedHours ? `${(task as any).estimatedHours} ชม.` : '—' }}
            </NDescriptionsItem>
            <NDescriptionsItem label="วันเริ่มต้น">
              <ThaiDate v-if="task.startDate" :date="task.startDate" format="short" />
              <span v-else>—</span>
            </NDescriptionsItem>
            <NDescriptionsItem label="กำหนดส่ง">
              <template v-if="task.dueDate">
                <ThaiDate :date="task.dueDate" format="short" />
                <span class="due-relative">{{ relativeTime(task.dueDate) }}</span>
              </template>
              <span v-else>—</span>
            </NDescriptionsItem>
            <NDescriptionsItem v-if="task.completedAt" label="วันที่เสร็จสิ้น">
              <ThaiDate :date="task.completedAt" format="short" />
            </NDescriptionsItem>
            <NDescriptionsItem label="สร้างเมื่อ">
              <ThaiDate v-if="(task as any).createdAt" :date="(task as any).createdAt" format="short" />
              <span class="due-relative">{{ relativeTime((task as any).createdAt) }}</span>
            </NDescriptionsItem>
            <NDescriptionsItem label="แก้ไขล่าสุด">
              <ThaiDate v-if="(task as any).updatedAt" :date="(task as any).updatedAt" format="short" />
              <span class="due-relative">{{ relativeTime((task as any).updatedAt) }}</span>
            </NDescriptionsItem>
          </NDescriptions>

          <!-- Description -->
          <div v-if="task.description" class="detail-section">
            <h4 class="section-title">รายละเอียด</h4>
            <p class="section-content">{{ task.description }}</p>
          </div>

          <!-- Subtasks -->
          <div class="detail-section">
            <h4 class="section-title">งานย่อย ({{ subtasks.length }})</h4>
            <div v-if="subtasks.length" class="subtask-list">
              <div v-for="st in subtasks" :key="st.id" class="subtask-item">
                <StatusBadge v-if="(st as any).statusName" :name="(st as any).statusName"
                  :color="(st as any).statusColor" />
                <span class="subtask-title">{{ st.title }}</span>
              </div>
            </div>
            <p v-else class="empty-hint">ยังไม่มีงานย่อย</p>
          </div>

          <!-- Comments -->
          <div class="detail-section">
            <h4 class="section-title">ความคิดเห็น ({{ comments.length }})</h4>

            <div class="comment-input">
              <NInput v-model:value="commentText" placeholder="เขียนความคิดเห็น..." type="textarea" :rows="2"
                @keyup.ctrl.enter="handleAddComment" />
              <NButton size="small" type="primary" :disabled="!commentText.trim()" @click="handleAddComment">
                <template #icon>
                  <NIcon>
                    <SendOutline />
                  </NIcon>
                </template>
                ส่ง
              </NButton>
            </div>

            <div v-if="comments.length" class="comment-list">
              <div v-for="comment in comments" :key="comment.id" class="comment-item">
                <div class="comment-header">
                  <span class="comment-author">{{ comment.userName || comment.userId }}</span>
                  <span class="comment-time">{{ relativeTime(comment.createdAt) }}</span>
                </div>
                <p class="comment-body">{{ comment.content }}</p>
              </div>
            </div>
            <p v-else class="empty-hint">ยังไม่มีความคิดเห็น</p>
          </div>
        </template>
      </NSpin>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped>
.detail-actions {
  margin-bottom: var(--space-md);
}

.detail-info {
  margin-bottom: var(--space-md);
}

.due-relative {
  margin-left: 8px;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.detail-section {
  margin-top: var(--space-md);
}

.section-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-sm);
}

.section-content {
  font-size: 0.9rem;
  line-height: 1.6;
  white-space: pre-wrap;
}

.subtask-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.subtask-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
}

.subtask-title {
  font-size: 0.875rem;
}

.comment-input {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  margin-bottom: var(--space-sm);
}

.comment-input :deep(.n-input) {
  flex: 1;
}

.comment-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.comment-item {
  padding: 10px 12px;
  background: var(--color-surface-variant, #f8fafc);
  border-radius: var(--radius-md);
}

.comment-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.comment-author {
  font-size: 0.8rem;
  font-weight: 600;
}

.comment-time {
  font-size: 0.7rem;
  color: var(--color-text-tertiary);
}

.comment-body {
  font-size: 0.85rem;
  line-height: 1.5;
  white-space: pre-wrap;
}

.empty-hint {
  font-size: 0.8rem;
  color: var(--color-text-tertiary);
}
</style>
