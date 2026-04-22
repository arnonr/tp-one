<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  NModal, NCard, NForm, NFormItem, NInput, NInputNumber, NSelect,
  NButton, NSpace, NIcon, NSpin, useMessage,
} from 'naive-ui'
import { CloseOutline } from '@vicons/ionicons5'
import { useTaskStore } from '@/stores/task'
import { workspaceService } from '@/services/workspace'
import { getFiscalYear } from '@/utils/thai'
import ThaiDatePicker from '@/components/common/ThaiDatePicker.vue'
import type { TaskPriority } from '@/types'

const props = defineProps<{
  show: boolean
  taskId?: string
  defaultWorkspaceId?: string
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'created'): void
  (e: 'updated'): void
}>()

const message = useMessage()
const taskStore = useTaskStore()

const saving = ref(false)
const loadingTask = ref(false)
const skipWorkspaceWatch = ref(false)
const workspaces = ref<any[]>([])
const workspaceStatuses = ref<any[]>([])
const workspaceMembers = ref<any[]>([])

const isEdit = computed(() => !!props.taskId)

const currentFY = getFiscalYear()

const formValue = ref({
  title: '',
  description: '',
  workspaceId: props.defaultWorkspaceId || null as string | null,
  projectId: null as string | null,
  statusId: null as string | null,
  priority: 'normal' as TaskPriority,
  assigneeIds: [] as string[],
  fiscalYear: currentFY as number,
  budget: null as number | null,
  estimatedHours: null as number | null,
  startDate: null as number | null,
  dueDate: null as number | null,
})

const fiscalYearOptions = computed(() => {
  const options: { label: string; value: number }[] = []
  for (let y = currentFY - 3; y <= currentFY + 1; y++) {
    options.push({ label: `ปีงบประมาณ ${y}`, value: y })
  }
  return options.reverse()
})

const priorityOptions = [
  { label: 'เร่งด่วน', value: 'urgent' },
  { label: 'สูง', value: 'high' },
  { label: 'ปกติ', value: 'normal' },
  { label: 'ต่ำ', value: 'low' },
]

const workspaceOptions = computed(() =>
  workspaces.value.map(ws => ({ label: ws.name, value: ws.id }))
)

const statusOptions = computed(() =>
  workspaceStatuses.value.map(s => ({ label: s.name, value: s.id }))
)

const memberOptions = computed(() =>
  workspaceMembers.value.map(m => ({
    label: m.name || m.email,
    value: m.userId,
  }))
)

const rules = {
  title: { required: true, message: 'กรุณาระบุชื่องาน', trigger: 'blur' },
  workspaceId: { required: true, message: 'กรุณาเลือกพื้นที่งาน', trigger: 'change' },
}

const formRef = ref<any>(null)

function formatDate(ts: number) {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

async function loadWorkspaces() {
  try {
    workspaces.value = await workspaceService.list()
  } catch {
    message.error('โหลดรายการพื้นที่งานไม่สำเร็จ')
  }
}

async function loadWorkspaceData(workspaceId: string) {
  try {
    const [statuses, members] = await Promise.all([
      workspaceService.getStatuses(workspaceId),
      workspaceService.getMembers(workspaceId),
    ])
    workspaceStatuses.value = statuses
    workspaceMembers.value = members

    if (statuses.length > 0 && !formValue.value.statusId) {
      const defaultStatus = statuses.find((s: any) => s.isDefault) || statuses[0]
      formValue.value.statusId = defaultStatus.id
    }
  } catch {
    workspaceStatuses.value = []
    workspaceMembers.value = []
  }
}

async function loadTask() {
  if (!props.taskId) return
  loadingTask.value = true
  skipWorkspaceWatch.value = true
  try {
    await taskStore.fetchTaskById(props.taskId)
    const task = taskStore.currentTask
    if (task) {
      formValue.value = {
        title: task.title || '',
        description: task.description || '',
        workspaceId: task.workspaceId || null,
        projectId: task.projectId || null,
        statusId: task.statusId || null,
        priority: task.priority || 'normal',
        assigneeIds: (task as any).assignees?.map((a: any) => a.userId) || [],
        fiscalYear: task.fiscalYear || currentFY,
        budget: task.budget ? Number(task.budget) : null,
        estimatedHours: task.estimatedHours ? Number(task.estimatedHours) : null,
        startDate: task.startDate ? new Date(task.startDate).getTime() : null,
        dueDate: task.dueDate ? new Date(task.dueDate).getTime() : null,
      }
      if (task.workspaceId) {
        await loadWorkspaceData(task.workspaceId)
      }
    }
  } catch {
    message.error('โหลดข้อมูลงานไม่สำเร็จ')
  } finally {
    loadingTask.value = false
    skipWorkspaceWatch.value = false
  }
}

watch(() => formValue.value.workspaceId, async (wsId) => {
  if (skipWorkspaceWatch.value) return
  if (wsId) {
    formValue.value.statusId = null
    formValue.value.assigneeIds = []
    await loadWorkspaceData(wsId)
  }
})

watch(() => props.show, async (show) => {
  if (show) {
    await loadWorkspaces()
    if (props.taskId) {
      await loadTask()
    } else {
      const generalWs = workspaces.value.find((ws: any) => ws.type === 'general')
      const defaultWsId = props.defaultWorkspaceId || generalWs?.id || null
      formValue.value = {
        title: '',
        description: '',
        workspaceId: defaultWsId,
        projectId: null,
        statusId: null,
        priority: 'normal',
        assigneeIds: [],
        fiscalYear: currentFY,
        budget: null,
        estimatedHours: null,
        startDate: new Date().setHours(0, 0, 0, 0),
        dueDate: null,
      }
      if (defaultWsId) {
        await loadWorkspaceData(defaultWsId)
      }
    }
  }
})

async function handleSubmit() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  saving.value = true
  try {
    const body: any = {
      title: formValue.value.title,
      description: formValue.value.description || undefined,
      workspaceId: formValue.value.workspaceId!,
      projectId: formValue.value.projectId || undefined,
      statusId: formValue.value.statusId || undefined,
      priority: formValue.value.priority,
      assigneeIds: formValue.value.assigneeIds?.length ? formValue.value.assigneeIds : undefined,
      fiscalYear: formValue.value.fiscalYear || undefined,
      budget: formValue.value.budget != null ? String(formValue.value.budget) : undefined,
      estimatedHours: formValue.value.estimatedHours != null ? String(formValue.value.estimatedHours) : undefined,
      startDate: formValue.value.startDate ? formatDate(formValue.value.startDate) : undefined,
      dueDate: formValue.value.dueDate ? formatDate(formValue.value.dueDate) : undefined,
    }

    if (isEdit.value && props.taskId) {
      await taskStore.updateTask(props.taskId, body)
      message.success('อัปเดตงานสำเร็จ')
      emit('updated')
    } else {
      await taskStore.createTask(body)
      message.success('สร้างงานสำเร็จ')
      emit('created')
    }
    handleClose()
  } catch {
    message.error(isEdit.value ? 'อัปเดตงานไม่สำเร็จ' : 'สร้างงานไม่สำเร็จ')
  } finally {
    saving.value = false
  }
}

function handleClose() {
  emit('update:show', false)
}
</script>

<template>
  <NModal :show="show" preset="card" :title="isEdit ? 'แก้ไขงาน' : 'สร้างงานใหม่'"
    :style="{ width: '600px', maxWidth: '95vw' }" :mask-closable="!saving" :close-on-esc="!saving"
    @update:show="emit('update:show', $event)">
    <NSpin :show="loadingTask">
      <NForm ref="formRef" :model="formValue" :rules="rules" label-placement="top">
        <NFormItem label="ชื่องาน" path="title">
          <NInput v-model:value="formValue.title" placeholder="ระบุชื่องาน" />
        </NFormItem>

        <NFormItem label="รายละเอียด">
          <NInput v-model:value="formValue.description" type="textarea" placeholder="รายละเอียดงาน (ถ้ามี)" :rows="3" />
        </NFormItem>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <NFormItem label="พื้นที่งาน" path="workspaceId">
            <NSelect v-model:value="formValue.workspaceId" :options="workspaceOptions" placeholder="เลือกพื้นที่งาน"
              :disabled="isEdit" />
          </NFormItem>

          <NFormItem label="สถานะ">
            <NSelect v-model:value="formValue.statusId" :options="statusOptions" placeholder="เลือกสถานะ" />
          </NFormItem>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <NFormItem label="ความสำคัญ">
            <NSelect v-model:value="formValue.priority" :options="priorityOptions" />
          </NFormItem>

          <NFormItem label="ผู้รับผิดชอบ">
            <NSelect v-model:value="formValue.assigneeIds" :options="memberOptions" placeholder="เลือกผู้รับผิดชอบ"
              multiple clearable filterable />
          </NFormItem>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
          <NFormItem label="ปีงบประมาณ">
            <NSelect v-model:value="formValue.fiscalYear" :options="fiscalYearOptions" placeholder="เลือกปีงบประมาณ" />
          </NFormItem>

          <NFormItem label="งบประมาณ (บาท)">
            <NInputNumber v-model:value="formValue.budget" :min="0" :precision="2" placeholder="0.00"
              style="width: 100%" clearable />
          </NFormItem>

          <NFormItem label="ชั่วโมงงาน (ชม.)">
            <NInputNumber v-model:value="formValue.estimatedHours" :min="0" :precision="2" placeholder="0.00"
              style="width: 100%" clearable />
          </NFormItem>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <NFormItem label="วันเริ่มต้น">
            <ThaiDatePicker v-model:value="formValue.startDate" placeholder="เลือกวันเริ่มต้น" />
          </NFormItem>

          <NFormItem label="กำหนดส่ง">
            <ThaiDatePicker v-model:value="formValue.dueDate" placeholder="เลือกวันกำหนดส่ง" />
          </NFormItem>
        </div>
      </NForm>
    </NSpin>

    <template #footer>
      <NSpace justify="end">
        <NButton @click="handleClose" :disabled="saving">ยกเลิก</NButton>
        <NButton type="primary" @click="handleSubmit" :loading="saving">
          {{ isEdit ? 'บันทึก' : 'สร้างงาน' }}
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>
