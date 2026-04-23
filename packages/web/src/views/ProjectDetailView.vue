<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  NCard,
  NButton,
  NIcon,
  NSpin,
  NTag,
  NProgress,
  NGrid,
  NGi,
  NText,
  NAvatar,
  NModal,
  NTabs,
  NTabPane,
  useMessage,
} from 'naive-ui'
import {
  ArrowBackOutline,
  PeopleOutline,
  TrashOutline,
  RefreshOutline,
  AddCircleOutline,
} from '@vicons/ionicons5'
import { useRouter, useRoute } from 'vue-router'
import KpiCard from '@/components/project/KpiCard.vue'
import KpiForm from '@/components/project/KpiForm.vue'
import MemberForm from '@/components/project/MemberForm.vue'
import ProjectTaskTab from '@/components/project/ProjectTaskTab.vue'
import { projectService } from '@/services/project'
import { getFiscalYear } from '@/utils/thai'

const router = useRouter()
const route = useRoute()
const message = useMessage()
const projectId = route.params.id as string
const currentFY = getFiscalYear()

// State
const loading = ref(false)
const project = ref<any>(null)
const kpis = ref<any[]>([])
const members = ref<any[]>([])

const showKpiForm = ref(false)
const showMemberForm = ref(false)
const editingKpi = ref<any>(null)
const activeTab = ref('overview')

// Computed
const completedTasks = computed(() =>
  project.value?.completedTaskCount ?? 0
)
const inProgressTasks = computed(() =>
  project.value?.inProgressTaskCount ?? 0
)
const overdueTasks = computed(() =>
  project.value?.overdueTaskCount ?? 0
)
const taskTotal = computed(() =>
  project.value?.taskCount ?? 0
)

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'กำลังดำเนินการ', color: 'var(--color-primary)', bg: 'var(--color-primary-bg)' },
  planning: { label: 'วางแผน', color: 'var(--color-info)', bg: 'var(--color-info-bg)' },
  on_hold: { label: 'ระงับชั่วคราว', color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
  completed: { label: 'เสร็จสิ้น', color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  cancelled: { label: 'ยกเลิก', color: 'var(--color-text-secondary)', bg: 'var(--color-surface-variant)' },
}

// Load project data
async function loadProject() {
  loading.value = true
  try {
    const data = await projectService.getById(projectId)
    project.value = data.data
    kpis.value = data.data.kpis ?? []
    members.value = data.data.members ?? []
  } catch (e: any) {
    message.error('โหลดข้อมูลโครงการไม่สำเร็จ')
  } finally {
    loading.value = false
  }
}

// Recalculate progress
async function recalcProgress() {
  try {
    await projectService.recalculateProgress(projectId)
    await loadProject()
    message.success('คำนวณความคืบหน้าแล้ว')
  } catch (e: any) {
    message.error('เกิดข้อผิดพลาด')
  }
}

// KPI handlers
async function handleKpiSaved() {
  showKpiForm.value = false
  editingKpi.value = null
  await loadProject()
}

function openKpiEdit(kpi: any) {
  editingKpi.value = kpi
  showKpiForm.value = true
}

async function handleKpiDeleted(kpiId: string) {
  await projectService.deleteKpi(projectId, kpiId)
  await loadProject()
  message.success('ลบ KPI แล้ว')
}

// Member handlers
async function handleMemberAdded() {
  showMemberForm.value = false
  await loadProject()
}

async function handleMemberRemoved(userId: string) {
  await projectService.removeMember(projectId, userId)
  await loadProject()
  message.success('ลบสมาชิกแล้ว')
}

onMounted(() => {
  loadProject()
})
</script>

<template>
  <NSpin :show="loading">
    <div class="project-detail-page">
      <!-- Header -->
      <div class="page-header">
        <div class="header-left">
          <NButton quaternary circle @click="router.push({ name: 'projects' })">
            <template #icon><NIcon><ArrowBackOutline /></NIcon></template>
          </NButton>
          <div v-if="project">
            <h1 class="page-title">{{ project.name }}</h1>
            <NText depth="3" class="page-subtitle">
              {{ project.workspaceName }} · ปีงบ {{ currentFY }}
            </NText>
          </div>
        </div>
        <div v-if="project" class="header-actions">
          <span
            class="status-chip"
            :style="{ color: STATUS_CONFIG[project.status]?.color, background: STATUS_CONFIG[project.status]?.bg }"
          >
            {{ STATUS_CONFIG[project.status]?.label }}
          </span>
          <div class="member-count">
            <NIcon :size="16" color="var(--color-text-tertiary)"><PeopleOutline /></NIcon>
            <NText depth="3">{{ members.length }} คน</NText>
          </div>
          <NButton size="small" @click="recalcProgress">
            <template #icon><NIcon><RefreshOutline /></NIcon></template>
            คำนวณใหม่
          </NButton>
        </div>
      </div>

      <!-- Overview Bar -->
      <div v-if="project" class="overview-bar">
        <div class="overview-stat">
          <NText depth="3" class="overview-label">งานทั้งหมด</NText>
          <NText class="overview-value">{{ taskTotal }}</NText>
        </div>
        <div class="overview-stat">
          <NText depth="3" class="overview-label">เสร็จสิ้น</NText>
          <NText class="overview-value" style="color: var(--color-success)">{{ completedTasks }}</NText>
        </div>
        <div class="overview-stat">
          <NText depth="3" class="overview-label">กำลังดำเนินการ</NText>
          <NText class="overview-value" style="color: var(--color-primary)">{{ inProgressTasks }}</NText>
        </div>
        <div class="overview-stat">
          <NText depth="3" class="overview-label">เลยกำหนด</NText>
          <NText class="overview-value" style="color: var(--color-danger)">{{ overdueTasks }}</NText>
        </div>
        <div class="overview-progress">
          <NText depth="3" class="overview-label">ความคืบหน้ารวม</NText>
          <div class="progress-wrap">
            <NProgress type="line" :percentage="Number(project.progress)" :height="8" :border-radius="4" :show-indicator="false" />
            <NText class="progress-text">{{ project.progress }}%</NText>
          </div>
        </div>
      </div>

      <!-- Tabs: Overview | Tasks | KPIs | Members -->
      <NTabs v-model:value="activeTab" type="line" animated>
        <NTabPane name="overview" tab="ภาพรวม">
          <!-- Project Description -->
          <NCard v-if="project?.description" class="section-card" :bordered="false">
            <NText depth="2">{{ project.description }}</NText>
          </NCard>

          <!-- KPI Cards -->
          <div class="section-header">
            <NText class="section-title">KPI</NText>
            <NButton size="small" @click="editingKpi = null; showKpiForm = true">
              <template #icon><NIcon><AddCircleOutline /></NIcon></template>
              เพิ่ม KPI
            </NButton>
          </div>
          <div v-if="kpis.length === 0" class="empty-state">
            <NText depth="3">ยังไม่มี KPI</NText>
          </div>
          <NGrid v-else :cols="3" :x-gap="16" :y-gap="16" responsive="screen" item-responsive>
            <NGi v-for="kpi in kpis" :key="kpi.id" span="2 m:1">
              <KpiCard
                :kpi="kpi"
                @edit="openKpiEdit(kpi)"
                @delete="handleKpiDeleted(kpi.id)"
              />
            </NGi>
          </NGrid>
        </NTabPane>

        <NTabPane name="tasks" tab="รายการงาน">
          <ProjectTaskTab :project-id="projectId" />
        </NTabPane>

        <NTabPane name="members" tab="สมาชิก">
          <div class="section-header">
            <NText class="section-title">สมาชิกโครงการ ({{ members.length }})</NText>
            <NButton size="small" @click="showMemberForm = true">
              <template #icon><NIcon><AddCircleOutline /></NIcon></template>
              เพิ่มสมาชิก
            </NButton>
          </div>
          <NGrid v-if="members.length" :cols="3" :x-gap="12" :y-gap="12" responsive="screen" item-responsive>
            <NGi v-for="member in members" :key="member.userId" span="2 m:1">
              <NCard :bordered="false" class="member-card">
                <div class="member-row">
                  <NAvatar :size="36" round :src="member.avatarUrl">
                    {{ member.name?.[0] }}
                  </NAvatar>
                  <div class="member-info">
                    <NText class="member-name">{{ member.name }}</NText>
                    <NText depth="3" class="member-email">{{ member.email }}</NText>
                  </div>
                  <NTag :type="member.role === 'owner' ? 'primary' : member.role === 'viewer' ? 'warning' : 'default'" size="small">
                    {{ member.role === 'owner' ? 'เจ้าของ' : member.role === 'member' ? 'สมาชิก' : 'ผู้ชม' }}
                  </NTag>
                  <NButton
                    v-if="member.role !== 'owner'"
                    quaternary
                    size="tiny"
                    @click="handleMemberRemoved(member.userId)"
                  >
                    <template #icon><NIcon><TrashOutline /></NIcon></template>
                  </NButton>
                </div>
              </NCard>
            </NGi>
          </NGrid>
          <div v-else class="empty-state">
            <NText depth="3">ยังไม่มีสมาชิก</NText>
          </div>
        </NTabPane>
      </NTabs>
    </div>
  </NSpin>

  <!-- KPI Form Modal -->
  <NModal v-model:show="showKpiForm" preset="card" :title="editingKpi ? 'แก้ไข KPI' : 'เพิ่ม KPI'" style="width: 480px">
    <KpiForm
      :project-id="projectId"
      :kpi="editingKpi"
      @saved="handleKpiSaved"
      @cancel="showKpiForm = false"
    />
  </NModal>

  <!-- Member Form Modal -->
  <NModal v-model:show="showMemberForm" preset="card" title="เพิ่มสมาชิก" style="width: 480px">
    <MemberForm
      :project-id="projectId"
      @saved="handleMemberAdded"
      @cancel="showMemberForm = false"
    />
  </NModal>
</template>

<style scoped>
.project-detail-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-left {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
}

.page-title {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--color-text);
  line-height: var(--leading-tight);
}

.page-subtitle {
  font-size: var(--text-sm);
  margin-top: var(--space-2xs);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.member-count {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-sm);
}

.status-chip {
  padding: 2px 10px;
  border-radius: 12px;
  font-size: var(--text-xs);
  font-weight: 600;
}

/* Overview Bar */
.overview-bar {
  display: flex;
  gap: var(--space-xl);
  padding: var(--space-md) var(--space-lg);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  align-items: flex-end;
}

.overview-stat {
  display: flex;
  flex-direction: column;
}

.overview-label {
  font-size: var(--text-xs);
  margin-bottom: 2px;
}

.overview-value {
  font-size: var(--text-xl);
  font-weight: 700;
}

.overview-progress {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.progress-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.progress-text {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-primary);
  white-space: nowrap;
}

/* Sections */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: var(--space-md) 0 var(--space-sm);
}

.section-title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text);
}

.section-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.empty-state {
  padding: var(--space-xl);
  text-align: center;
}

/* Member Card */
.member-card {
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

.member-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.member-info {
  flex: 1;
  min-width: 0;
}

.member-name {
  font-size: var(--text-sm);
  font-weight: 500;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.member-email {
  font-size: var(--text-xs);
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  margin-top: var(--space-md);
}
</style>