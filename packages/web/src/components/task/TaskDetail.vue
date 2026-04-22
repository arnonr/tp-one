<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  NDrawer, NDrawerContent, NDescriptions, NDescriptionsItem, NButton,
  NSpace, NIcon, NInput, NPopconfirm, NSpin, NTag, NCheckbox,
  NDatePicker, NDivider,
  useMessage, useDialog,
} from 'naive-ui'
import {
  CreateOutline, TrashOutline, CopyOutline, SendOutline, AddOutline,
  TimeOutline, CheckmarkCircleOutline, ChatbubbleOutline,
} from '@vicons/ionicons5'
import PriorityBadge from '@/components/common/PriorityBadge.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import ThaiDate from '@/components/common/ThaiDate.vue'
import { useTaskStore } from '@/stores/task'
import { useClipboard } from '@/composables/useClipboard'
import { relativeTime } from '@/utils/thai'
import { taskService } from '@/services/task'
import type { WaitingItem, FollowUpItem } from '@/services/task'
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

const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)
function handleResize() { windowWidth.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', handleResize))
onUnmounted(() => window.removeEventListener('resize', handleResize))
const isMobile = computed(() => windowWidth.value < 640)
const drawerWidth = computed(() => isMobile.value ? windowWidth.value : 560)

const commentText = ref('')
const newSubtaskTitle = ref('')
const addingSubtask = ref(false)

// Waiting for others
const waitingList = ref<WaitingItem[]>([])
const loadingWaiting = ref(false)
const showAddWaiting = ref(false)
const addingWaiting = ref(false)
const newWaiting = ref({ waitingFor: '', contactPerson: '', contactInfo: '' })
const newWaitingDateTs = ref<number | null>(null)
const followUpNotes = ref<Record<string, string>>({})
const addingFollowUp = ref<Record<string, boolean>>({})

const activeWaiting = computed(() => waitingList.value.filter(w => !w.isResolved))
const resolvedWaiting = computed(() => waitingList.value.filter(w => w.isResolved))

async function fetchWaiting(taskId: string) {
  loadingWaiting.value = true
  try {
    waitingList.value = await taskService.getWaiting(taskId)
  } finally {
    loadingWaiting.value = false
  }
}

async function handleAddWaiting() {
  if (!props.taskId || !newWaiting.value.waitingFor.trim()) return
  addingWaiting.value = true
  try {
    const expectedDate = newWaitingDateTs.value
      ? new Date(newWaitingDateTs.value).toISOString().split('T')[0]
      : undefined
    const item = await taskService.setWaiting(props.taskId, {
      waitingFor: newWaiting.value.waitingFor.trim(),
      contactPerson: newWaiting.value.contactPerson.trim() || undefined,
      contactInfo: newWaiting.value.contactInfo.trim() || undefined,
      expectedDate,
    })
    waitingList.value.push(item)
    newWaiting.value = { waitingFor: '', contactPerson: '', contactInfo: '' }
    newWaitingDateTs.value = null
    showAddWaiting.value = false
    message.success('เพิ่มรายการรอสำเร็จ')
  } catch {
    message.error('เพิ่มรายการรอไม่สำเร็จ')
  } finally {
    addingWaiting.value = false
  }
}

async function handleResolveWaiting(waitingId: string) {
  if (!props.taskId) return
  try {
    await taskService.resolveWaiting(props.taskId, waitingId)
    const idx = waitingList.value.findIndex(w => w.id === waitingId)
    if (idx !== -1) {
      waitingList.value[idx].isResolved = true
      waitingList.value[idx].resolvedAt = new Date().toISOString()
    }
    message.success('บันทึกว่าได้รับแล้ว')
  } catch {
    message.error('อัปเดตไม่สำเร็จ')
  }
}

async function handleAddFollowUp(waitingId: string) {
  if (!props.taskId || !followUpNotes.value[waitingId]?.trim()) return
  addingFollowUp.value[waitingId] = true
  try {
    const followUp = await taskService.addFollowUp(props.taskId, waitingId, followUpNotes.value[waitingId].trim())
    const item = waitingList.value.find(w => w.id === waitingId)
    if (item) item.followUps.push(followUp)
    followUpNotes.value[waitingId] = ''
  } catch {
    message.error('บันทึก follow-up ไม่สำเร็จ')
  } finally {
    addingFollowUp.value[waitingId] = false
  }
}

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
    await fetchWaiting(id)
  }
})

watch(() => props.show, async (show) => {
  if (show && props.taskId) {
    await taskStore.fetchTaskById(props.taskId)
    await fetchWaiting(props.taskId)
  }
  if (!show) {
    taskStore.clearCurrent()
    waitingList.value = []
    showAddWaiting.value = false
    newWaitingDateTs.value = null
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

async function handleAddSubtask() {
  if (!props.taskId || !newSubtaskTitle.value.trim()) return
  addingSubtask.value = true
  try {
    await taskStore.addSubtask(props.taskId, newSubtaskTitle.value.trim())
    newSubtaskTitle.value = ''
  } catch {
    message.error('เพิ่มงานย่อยไม่สำเร็จ')
  } finally {
    addingSubtask.value = false
  }
}

async function handleToggleSubtask(subtaskId: string, done: boolean) {
  try {
    await taskStore.toggleSubtask(subtaskId, done)
  } catch {
    message.error('อัปเดตงานย่อยไม่สำเร็จ')
  }
}

async function handleDeleteSubtask(subtaskId: string) {
  try {
    await taskStore.removeSubtask(subtaskId)
  } catch {
    message.error('ลบงานย่อยไม่สำเร็จ')
  }
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
  <NDrawer :show="show" :width="drawerWidth" placement="right" :mask-closable="true" @update:show="emit('update:show', $event)">
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
          <NDescriptions :label-placement="isMobile ? 'top' : 'left'" :column="1" bordered size="small" class="detail-info">
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

          <!-- Tags -->
          <div v-if="task.tags?.length" class="detail-section">
            <h4 class="section-title">แท็ก</h4>
            <NSpace size="small" wrap>
              <NTag
                v-for="tag in task.tags"
                :key="tag.id"
                size="small"
                round
                :color="tag.color ? { color: tag.color, borderColor: tag.color, textColor: '#fff' } : undefined"
              >
                {{ tag.name }}
              </NTag>
            </NSpace>
          </div>

          <!-- Waiting for Others -->
          <div class="detail-section">
            <div class="section-header">
              <h4 class="section-title">
                <NIcon :size="15" class="section-icon warning-icon"><TimeOutline /></NIcon>
                รอหน่วยงานอื่น
                <NTag v-if="activeWaiting.length" type="warning" size="tiny" round :bordered="false" style="margin-left:6px">
                  {{ activeWaiting.length }}
                </NTag>
              </h4>
              <NButton size="tiny" quaternary @click="showAddWaiting = !showAddWaiting">
                <template #icon><NIcon><AddOutline /></NIcon></template>
                เพิ่มรายการรอ
              </NButton>
            </div>

            <NSpin :show="loadingWaiting">
              <div v-if="activeWaiting.length" class="waiting-list">
                <div v-for="item in activeWaiting" :key="item.id" class="waiting-item">
                  <div class="waiting-main">
                    <div class="waiting-who">
                      <NIcon :size="13" class="warning-icon"><TimeOutline /></NIcon>
                      <span class="waiting-name">{{ item.waitingFor }}</span>
                    </div>
                    <div class="waiting-meta">
                      <span v-if="item.contactPerson" class="meta-chip">{{ item.contactPerson }}</span>
                      <span v-if="item.expectedDate" class="meta-chip">
                        คาดว่าได้รับ: <ThaiDate :date="item.expectedDate" format="short" />
                      </span>
                      <span class="meta-chip muted">รอมา: {{ relativeTime(item.createdAt) }}</span>
                    </div>
                    <div class="waiting-actions">
                      <NButton size="tiny" type="success" ghost @click="handleResolveWaiting(item.id)">
                        <template #icon><NIcon :size="12"><CheckmarkCircleOutline /></NIcon></template>
                        ได้รับแล้ว
                      </NButton>
                    </div>
                  </div>
                  <div v-if="item.followUps.length" class="follow-up-list">
                    <div v-for="fu in item.followUps" :key="fu.id" class="follow-up-entry">
                      <NIcon :size="11" class="fu-icon"><ChatbubbleOutline /></NIcon>
                      <span class="fu-note">{{ fu.note }}</span>
                      <span class="fu-time">{{ relativeTime(fu.createdAt) }}</span>
                    </div>
                  </div>
                  <div class="follow-up-row">
                    <NInput
                      v-model:value="followUpNotes[item.id]"
                      size="tiny"
                      placeholder="บันทึก follow-up..."
                      @keyup.enter="handleAddFollowUp(item.id)"
                    />
                    <NButton
                      size="tiny"
                      quaternary
                      :loading="addingFollowUp[item.id]"
                      :disabled="!followUpNotes[item.id]?.trim()"
                      @click="handleAddFollowUp(item.id)"
                    >
                      <template #icon><NIcon :size="12"><ChatbubbleOutline /></NIcon></template>
                    </NButton>
                  </div>
                </div>
              </div>
              <p v-else-if="!showAddWaiting && !resolvedWaiting.length" class="empty-hint">ไม่มีรายการรอ</p>
            </NSpin>

            <!-- Resolved history -->
            <div v-if="resolvedWaiting.length" class="waiting-history">
              <div class="history-label">ได้รับแล้ว ({{ resolvedWaiting.length }})</div>
              <div v-for="item in resolvedWaiting" :key="item.id" class="waiting-item waiting-item--resolved">
                <div class="waiting-main">
                  <div class="waiting-who">
                    <NIcon :size="13" class="resolved-icon"><CheckmarkCircleOutline /></NIcon>
                    <span class="waiting-name resolved-name">{{ item.waitingFor }}</span>
                  </div>
                  <div class="waiting-meta">
                    <span v-if="item.contactPerson" class="meta-chip">{{ item.contactPerson }}</span>
                    <span class="meta-chip muted">
                      ได้รับ: {{ relativeTime(item.resolvedAt!) }}
                    </span>
                  </div>
                </div>
                <div v-if="item.followUps.length" class="follow-up-list">
                  <div v-for="fu in item.followUps" :key="fu.id" class="follow-up-entry">
                    <NIcon :size="11" class="fu-icon"><ChatbubbleOutline /></NIcon>
                    <span class="fu-note">{{ fu.note }}</span>
                    <span class="fu-time">{{ relativeTime(fu.createdAt) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="showAddWaiting" class="waiting-form">
              <NDivider style="margin: 8px 0" />
              <NInput
                v-model:value="newWaiting.waitingFor"
                size="small"
                placeholder="รอจากหน่วยงาน / บุคคล *"
                style="margin-bottom:6px"
              />
              <NSpace :size="6" :vertical="isMobile" style="margin-bottom:6px">
                <NInput
                  v-model:value="newWaiting.contactPerson"
                  size="small"
                  placeholder="ผู้ติดต่อ"
                  style="flex:1"
                />
                <NInput
                  v-model:value="newWaiting.contactInfo"
                  size="small"
                  placeholder="เบอร์โทร / อีเมล"
                  style="flex:1"
                />
              </NSpace>
              <NDatePicker
                v-model:value="newWaitingDateTs"
                type="date"
                size="small"
                placeholder="วันที่คาดว่าจะได้รับ"
                clearable
                style="width:100%; margin-bottom:8px"
              />
              <NSpace justify="end" :size="6">
                <NButton size="small" @click="showAddWaiting = false">ยกเลิก</NButton>
                <NButton
                  size="small"
                  type="warning"
                  :loading="addingWaiting"
                  :disabled="!newWaiting.waitingFor.trim()"
                  @click="handleAddWaiting"
                >
                  เพิ่มรายการรอ
                </NButton>
              </NSpace>
            </div>
          </div>

          <!-- Subtasks -->
          <div class="detail-section">
            <h4 class="section-title">งานย่อย ({{ subtasks.length }})</h4>
            <div v-if="subtasks.length" class="subtask-list">
              <div v-for="st in subtasks" :key="st.id" class="subtask-item">
                <NCheckbox
                  :checked="!!(st as any).completedAt"
                  @update:checked="handleToggleSubtask(st.id, $event)"
                />
                <span class="subtask-title" :class="{ 'subtask-done': !!(st as any).completedAt }">
                  {{ st.title }}
                </span>
                <NButton
                  size="tiny"
                  quaternary
                  type="error"
                  class="subtask-delete"
                  @click="handleDeleteSubtask(st.id)"
                >
                  <template #icon><NIcon><TrashOutline /></NIcon></template>
                </NButton>
              </div>
            </div>
            <p v-else class="empty-hint">ยังไม่มีงานย่อย</p>
            <div class="subtask-add">
              <NInput
                v-model:value="newSubtaskTitle"
                size="small"
                placeholder="เพิ่มงานย่อย..."
                @keyup.enter="handleAddSubtask"
              />
              <NButton
                size="small"
                type="primary"
                ghost
                :loading="addingSubtask"
                :disabled="!newSubtaskTitle.trim()"
                @click="handleAddSubtask"
              >
                <template #icon><NIcon><AddOutline /></NIcon></template>
                เพิ่ม
              </NButton>
            </div>
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
  padding: 4px 0;
}

.subtask-title {
  font-size: 0.875rem;
  flex: 1;
}

.subtask-done {
  text-decoration: line-through;
  color: var(--color-text-tertiary);
}

.subtask-delete {
  opacity: 0;
  transition: opacity 0.15s ease;
}

.subtask-item:hover .subtask-delete {
  opacity: 1;
}

.subtask-add {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
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

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-sm);
}

.section-header .section-title {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 0;
}

.section-icon {
  flex-shrink: 0;
}

.warning-icon {
  color: var(--n-color-warning, #f0a020);
}

.waiting-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.waiting-item {
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 1px solid #fde9c0;
  background: #fffbf0;
}

.waiting-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.waiting-who {
  display: flex;
  align-items: center;
  gap: 5px;
}

.waiting-name {
  font-size: 0.875rem;
  font-weight: 600;
}

.waiting-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
}

.meta-chip {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  background: rgba(0, 0, 0, 0.04);
  padding: 1px 6px;
  border-radius: 4px;
}

.meta-chip.muted {
  color: var(--color-text-tertiary);
}

.waiting-actions {
  margin-top: 6px;
}

.follow-up-list {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px dashed #fde9c0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.follow-up-entry {
  display: flex;
  align-items: baseline;
  gap: 5px;
  font-size: 0.78rem;
  line-height: 1.4;
}

.fu-icon {
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.fu-note {
  flex: 1;
  color: var(--color-text-secondary);
}

.fu-time {
  color: var(--color-text-tertiary);
  font-size: 0.7rem;
  white-space: nowrap;
  flex-shrink: 0;
}

.follow-up-row {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px dashed #fde9c0;
}

.follow-up-row :deep(.n-input) {
  flex: 1;
}

.waiting-history {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.history-label {
  font-size: 0.72rem;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 4px 0 2px;
}

.waiting-item--resolved {
  background: #f8faf8;
  border-color: #c8e6c9;
  opacity: 0.85;
}

.resolved-icon {
  color: #4caf50;
}

.resolved-name {
  text-decoration: line-through;
  color: var(--color-text-tertiary);
  font-weight: 400;
}

.waiting-form {
  padding-top: 4px;
}

@media (max-width: 640px) {
  .detail-actions {
    flex-wrap: wrap;
    gap: 4px;
    justify-content: flex-start;
  }

  .detail-info {
    overflow-x: hidden;
  }

  .section-content {
    word-break: break-word;
    overflow-wrap: break-word;
  }

  .section-header {
    flex-wrap: wrap;
    gap: 6px;
  }

  .waiting-meta {
    flex-direction: column;
    gap: 4px;
  }

  .waiting-name {
    word-break: break-word;
  }

  .follow-up-entry {
    flex-wrap: wrap;
  }

  .fu-note {
    min-width: 0;
    word-break: break-word;
  }

  .follow-up-row {
    flex-wrap: wrap;
  }

  .subtask-add {
    flex-direction: column;
    align-items: stretch;
  }

  .subtask-add :deep(.n-button) {
    align-self: flex-end;
  }

  .comment-input {
    flex-direction: column;
    align-items: stretch;
  }

  .comment-input :deep(.n-button) {
    align-self: flex-end;
  }

  .comment-body {
    word-break: break-word;
    overflow-wrap: break-word;
  }

  .due-relative {
    display: block;
    margin-left: 0;
    margin-top: 2px;
  }
}
</style>
