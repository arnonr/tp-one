<script setup lang="ts">
import { ref, onMounted } from "vue";
import {
  NCard,
  NText,
  NIcon,
  NButton,
  NGrid,
  NGi,
  NTag,
  NSpin,
  NProgress,
  NPagination,
  NEmpty,
  NModal,
  NSelect,
  NInput,
  NForm,
  NFormItem,
  NSpace,
  useMessage,
} from "naive-ui";
import {
  AddCircleOutline,
  FolderOutline,
  PeopleOutline,
  TimeOutline,
  RefreshOutline,
} from "@vicons/ionicons5";
import { useRouter } from "vue-router";
import { useFiscalYear } from "@/composables/useFiscalYear";
import PageHeader from "@/components/common/PageHeader.vue";
import { projectService } from "@/services/project";
import { workspaceService } from "@/services/workspace";

const router = useRouter();
const message = useMessage();
const { fyLabel } = useFiscalYear();

const loading = ref(false);
const projects = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);

const workspaces = ref<any[]>([]);
const workspaceOptions = ref<{ label: string; value: string }[]>([]);
const statusFilter = ref<string | null>(null);
const searchFilter = ref("");
const selectedWorkspaceId = ref<string | null>(null);

const showCreateModal = ref(false);
const creating = ref(false);
const createForm = ref({
  workspaceId: "",
  name: "",
  description: "",
});

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: "กำลังดำเนินการ", color: "var(--color-primary)", bg: "var(--color-primary-bg)" },
  planning: { label: "วางแผน", color: "var(--color-info)", bg: "var(--color-info-bg)" },
  on_hold: { label: "ระงับชั่วคราว", color: "var(--color-warning)", bg: "var(--color-warning-bg)" },
  completed: { label: "เสร็จสิ้น", color: "var(--color-success)", bg: "var(--color-success-bg)" },
  cancelled: { label: "ยกเลิก", color: "var(--color-text-secondary)", bg: "var(--color-surface-variant)" },
};

const statusOptions = [
  { label: "ทุกสถานะ", value: "" },
  { label: "กำลังดำเนินการ", value: "active" },
  { label: "วางแผน", value: "planning" },
  { label: "ระงับชั่วคราว", value: "on_hold" },
  { label: "เสร็จสิ้น", value: "completed" },
  { label: "ยกเลิก", value: "cancelled" },
];

async function fetchProjects() {
  loading.value = true;
  try {
    const res = await projectService.list({
      workspaceId: selectedWorkspaceId.value || undefined,
      status: statusFilter.value || undefined,
      search: searchFilter.value || undefined,
      page: page.value,
      pageSize: pageSize.value,
    });
    projects.value = res.data ?? res;
    total.value = res.total ?? projects.value.length;
  } catch (e) {
    message.error("โหลดรายการโครงการไม่สำเร็จ");
  } finally {
    loading.value = false;
  }
}

async function loadWorkspaces() {
  try {
    workspaces.value = await workspaceService.list();
    workspaceOptions.value = workspaces.value.map(w => ({
      label: w.name,
      value: w.id,
    }));
  } catch (e) {
    message.error("โหลดพื้นที่ทำงานไม่สำเร็จ");
  }
}

async function handleCreateProject() {
  if (!createForm.value.workspaceId || !createForm.value.name.trim()) {
    message.warning("กรุณากรอกชื่อโครงการและเลือกพื้นที่ทำงาน");
    return;
  }
  creating.value = true;
  try {
    const project = await projectService.create({
      workspaceId: createForm.value.workspaceId,
      name: createForm.value.name.trim(),
      description: createForm.value.description.trim(),
    });
    showCreateModal.value = false;
    createForm.value = { workspaceId: "", name: "", description: "" };
    message.success("สร้างโครงการแล้ว");
    router.push({ name: "project-detail", params: { id: project.id } });
  } catch (e: any) {
    message.error(e?.message ?? "เกิดข้อผิดพลาด");
  } finally {
    creating.value = false;
  }
}

function onPageChange(p: number) {
  page.value = p;
  fetchProjects();
}

onMounted(() => {
  loadWorkspaces();
  fetchProjects();
});
</script>

<template>
  <NSpin :show="loading">
    <div class="project-page">
      <PageHeader
        title="โครงการ"
        :subtitle="`${fyLabel} — ${total} โครงการ`"
      >
        <template #actions>
          <NButton type="primary" @click="showCreateModal = true">
            <template #icon>
              <NIcon><AddCircleOutline /></NIcon>
            </template>
            สร้างโครงการ
          </NButton>
        </template>
      </PageHeader>

      <!-- Filters -->
      <div class="filter-bar">
        <NSelect
          v-model:value="selectedWorkspaceId"
          :options="[{ label: 'ทุกพื้นที่ทำงาน', value: '' }, ...workspaceOptions]"
          placeholder="เลือกพื้นที่ทำงาน"
          clearable
          style="width: 200px"
          @update:value="fetchProjects"
        />
        <NSelect
          v-model:value="statusFilter"
          :options="statusOptions"
          placeholder="สถานะ"
          clearable
          style="width: 160px"
          @update:value="fetchProjects"
        />
        <NInput
          v-model:value="searchFilter"
          placeholder="ค้นหาชื่อโครงการ..."
          clearable
          style="width: 240px"
          @update:value="fetchProjects"
        />
        <NButton quaternary circle @click="fetchProjects">
          <template #icon><NIcon><RefreshOutline /></NIcon></template>
        </NButton>
      </div>

      <!-- Project Grid -->
      <NGrid v-if="projects.length" :cols="2" :x-gap="16" :y-gap="16" responsive="screen" item-responsive>
        <NGi v-for="project in projects" :key="project.id" span="2 l:1">
          <NCard
            class="project-card"
            :bordered="false"
            hoverable
            @click="router.push({ name: 'project-detail', params: { id: project.id } })"
          >
            <div class="project-card-inner">
              <div class="project-card-header">
                <div class="project-workspace">
                  <NIcon :size="14" color="var(--color-primary)"><FolderOutline /></NIcon>
                  <NText depth="3" class="workspace-name">{{ project.workspaceName }}</NText>
                </div>
                <span
                  class="status-chip"
                  :style="{
                    color: STATUS_CONFIG[project.status]?.color,
                    background: STATUS_CONFIG[project.status]?.bg,
                  }"
                >
                  {{ STATUS_CONFIG[project.status]?.label }}
                </span>
              </div>

              <div class="project-name">{{ project.name }}</div>
              <NText v-if="project.description" depth="3" class="project-desc">
                {{ project.description }}
              </NText>

              <div class="project-progress">
                <div class="progress-header">
                  <NText depth="3" class="progress-label">ความคืบหน้า</NText>
                  <NText class="progress-value">{{ project.progress }}%</NText>
                </div>
                <NProgress
                  type="line"
                  :percentage="Number(project.progress ?? 0)"
                  :show-indicator="false"
                  :height="6"
                  :border-radius="3"
                  color="var(--color-primary)"
                  rail-color="var(--color-border-light)"
                />
              </div>

              <div class="project-card-footer">
                <div class="project-meta">
                  <div class="meta-item">
                    <NIcon :size="14" color="var(--color-text-tertiary)"><PeopleOutline /></NIcon>
                    <NText depth="3">{{ project.memberCount ?? 0 }} คน</NText>
                  </div>
                  <div v-if="project.endDate" class="meta-item">
                    <NIcon :size="14" color="var(--color-text-tertiary)"><TimeOutline /></NIcon>
                    <NText depth="3">{{ project.endDate }}</NText>
                  </div>
                </div>
              </div>
            </div>
          </NCard>
        </NGi>
      </NGrid>

      <NEmpty v-else-if="!loading" description="ยังไม่มีโครงการ" style="padding: var(--space-xl)">
        <template #extra>
          <NButton size="small" type="primary" @click="showCreateModal = true">
            สร้างโครงการแรก
          </NButton>
        </template>
      </NEmpty>

      <div v-if="total > pageSize" class="pagination-wrap">
        <NPagination
          v-model:page="page"
          :page-size="pageSize"
          :total="total"
          @update:page="onPageChange"
        />
      </div>
    </div>
  </NSpin>

  <!-- Create Modal -->
  <NModal v-model:show="showCreateModal" preset="card" title="สร้างโครงการใหม่" style="width: 480px">
    <NForm label-placement="top" @submit.prevent="handleCreateProject">
      <NFormItem label="พื้นที่ทำงาน" required>
        <NSelect
          v-model:value="createForm.workspaceId"
          :options="workspaceOptions"
          placeholder="เลือกพื้นที่ทำงาน"
        />
      </NFormItem>
      <NFormItem label="ชื่อโครงการ" required>
        <NInput v-model:value="createForm.name" placeholder="เช่น บริการเช่าพื้นที่สำนักงาน" />
      </NFormItem>
      <NFormItem label="รายละเอียด">
        <NInput
          v-model:value="createForm.description"
          type="textarea"
          :rows="3"
          placeholder="คำอธิบายโครงการ (ไม่บังคับ)"
        />
      </NFormItem>
      <NSpace justify="end" style="margin-top: var(--space-md)">
        <NButton @click="showCreateModal = false">ยกเลิก</NButton>
        <NButton type="primary" :loading="creating" attr-type="submit">สร้างโครงการ</NButton>
      </NSpace>
    </NForm>
  </NModal>
</template>

<style scoped>
.project-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.filter-bar {
  display: flex;
  gap: var(--space-sm);
  align-items: center;
  flex-wrap: wrap;
}

.project-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: box-shadow var(--duration-normal) var(--ease-out);
}

.project-card:hover {
  box-shadow: var(--shadow-md);
}

.project-card-inner {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.project-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.project-workspace {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.workspace-name {
  font-size: var(--text-xs);
}

.status-chip {
  font-size: var(--text-xs);
  padding: 2px 10px;
  border-radius: var(--radius-full);
  font-weight: 500;
  white-space: nowrap;
}

.project-name {
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--color-text);
}

.project-desc {
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2xs);
}

.progress-label {
  font-size: var(--text-xs);
}

.progress-value {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-primary);
}

.project-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: var(--space-sm);
  border-top: 1px solid var(--color-border-light);
}

.project-meta {
  display: flex;
  gap: var(--space-md);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: var(--space-2xs);
  font-size: var(--text-xs);
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  margin-top: var(--space-md);
}

@media (max-width: 767px) {
  .project-name {
    font-size: var(--text-base);
  }
}
</style>