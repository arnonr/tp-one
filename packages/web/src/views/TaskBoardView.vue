<script setup lang="ts">
import { ref } from 'vue'
import { NButton, NButtonGroup, NIcon } from 'naive-ui'
import { AddCircleOutline, GridOutline, ListOutline, CalendarOutline } from '@vicons/ionicons5'
import PageHeader from '@/components/common/PageHeader.vue'
import TaskKanban from '@/components/task/TaskKanban.vue'
import TaskForm from '@/components/task/TaskForm.vue'
import TaskDetail from '@/components/task/TaskDetail.vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const showTaskForm = ref(false)
const editingTaskId = ref<string | undefined>(undefined)
const showDetail = ref(false)
const detailTaskId = ref<string | null>(null)

function openCreateForm() {
  editingTaskId.value = undefined
  showTaskForm.value = true
}

function openDetail(taskId: string) {
  detailTaskId.value = taskId
  showDetail.value = true
}
</script>

<template>
  <div class="board-page">
    <PageHeader title="บอร์ดงาน" subtitle="ลากเพื่อเปลี่ยนสถานะงาน">
      <template #actions>
        <NButtonGroup>
          <NButton size="small" @click="router.push('/tasks')">
            <template #icon><NIcon :size="15"><ListOutline /></NIcon></template>
            รายการ
          </NButton>
          <NButton size="small" type="primary">
            <template #icon><NIcon :size="15"><GridOutline /></NIcon></template>
            กระดาน
          </NButton>
          <NButton size="small" @click="router.push('/tasks/calendar')">
            <template #icon><NIcon :size="15"><CalendarOutline /></NIcon></template>
            ปฏิทิน
          </NButton>
        </NButtonGroup>
        <NButton type="primary" @click="openCreateForm">
          <template #icon>
            <NIcon><AddCircleOutline /></NIcon>
          </template>
          สร้างงาน
        </NButton>
      </template>
    </PageHeader>

    <TaskKanban @task-click="openDetail" />
  </div>

  <TaskForm
    v-model:show="showTaskForm"
    :task-id="editingTaskId"
    @created="() => router.go(0)"
    @updated="() => router.go(0)"
  />

  <TaskDetail
    v-model:show="showDetail"
    :task-id="detailTaskId"
    @edit="(id) => { editingTaskId = id; showTaskForm = true }"
    @deleted="() => router.go(0)"
  />
</template>

<style scoped>
.board-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}
</style>
