<script setup lang="ts">
import { ref } from "vue";
import { NCard, NText, NIcon, NButton, NGrid, NGi, NTag, NSpin, NProgress } from "naive-ui";
import {
  AddCircleOutline,
  FolderOutline,
  PeopleOutline,
  TimeOutline,
  ChevronForwardOutline,
} from "@vicons/ionicons5";
import { useRouter } from "vue-router";
import { useFiscalYear } from "@/composables/useFiscalYear";

const router = useRouter();
const loading = ref(false);
const { fyLabel } = useFiscalYear();

const STATUS_CONFIG: Record<string, { label: string, color: string, bg: string }> = {
  active: { label: "กำลังดำเนินการ", color: "var(--color-primary)", bg: "var(--color-primary-bg)" },
  planning: { label: "วางแผน", color: "var(--color-info)", bg: "var(--color-info-bg)" },
  on_hold: { label: "ระงับชั่วคราว", color: "var(--color-warning)", bg: "var(--color-warning-bg)" },
  completed: { label: "เสร็จสิ้น", color: "var(--color-success)", bg: "var(--color-success-bg)" },
  cancelled: { label: "ยกเลิก", color: "var(--color-text-secondary)", bg: "var(--color-surface-variant)" },
};

interface Project {
  id: string
  name: string
  description: string
  status: string
  memberCount: number
  taskCount: number
  completedTasks: number
  dueDate: string
  category: string
}

const projects: Project[] = [
  { id: "1", name: "บริการเช่าพื้นที่สำนักงาน", description: "จัดการสัญญาเช่า บำรุงรักษาพื้นที่ และบริการผู้เช่า", status: "active", memberCount: 5, taskCount: 32, completedTasks: 24, dueDate: "30 ก.ย. 2569", category: "เช่าพื้นที่" },
  { id: "2", name: "บริการให้คำปรึกษาและวิจัย", description: "ให้คำปรึกษาวิชาการ สนับสนุนงานวิจัย และถ่ายทอดเทคโนโลยี", status: "active", memberCount: 4, taskCount: 18, completedTasks: 12, dueDate: "30 ก.ย. 2569", category: "ที่ปรึกษา/วิจัย" },
  { id: "3", name: "อบรมและสัมนาวิชาการ", description: "จัดอบรม สัมนา และเวิร์คช็อปด้านเทคโนโลยี", status: "active", memberCount: 3, taskCount: 15, completedTasks: 8, dueDate: "30 ก.ย. 2569", category: "อบรม/สัมนา" },
  { id: "4", name: "บ่มเพาะสตาร์ทอัปรุ่นที่ 5", description: "คัดเลือก ให้คำปรึกษา และสนับสนุนสตาร์ทอัปใหม่", status: "active", memberCount: 6, taskCount: 22, completedTasks: 14, dueDate: "30 ก.ย. 2569", category: "บ่มเพาะสตาร์ทอัป" },
  { id: "5", name: "ปรับปรุงระบบจัดการภายใน", description: "พัฒนาระบบ IT เพื่อเพิ่มประสิทธิภาพการทำงาน", status: "planning", memberCount: 2, taskCount: 8, completedTasks: 2, dueDate: "31 ธ.ค. 2569", category: "พัฒนาระบบ" },
];
</script>

<template>
  <NSpin :show="loading">
    <div class="project-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">โครงการ</h1>
          <NText depth="3" class="page-subtitle">{{ fyLabel }} — {{ projects.length }} โครงการ</NText>
        </div>
        <NButton type="primary">
          <template #icon>
            <NIcon><AddCircleOutline /></NIcon>
          </template>
          สร้างโครงการ
        </NButton>
      </div>

      <NGrid :cols="2" :x-gap="16" :y-gap="16" responsive="screen" item-responsive>
        <NGi v-for="project in projects" :key="project.id" span="2 l:1">
          <NCard class="project-card" :bordered="false" hoverable @click="router.push({ name: 'project-detail', params: { id: project.id } })">
            <div class="project-card-inner">
              <div class="project-card-header">
                <div class="project-category">
                  <NIcon :size="16" color="var(--color-primary)"><FolderOutline /></NIcon>
                  <NText depth="3">{{ project.category }}</NText>
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
              <NText depth="3" class="project-desc">{{ project.description }}</NText>
              <div class="project-progress">
                <div class="progress-bar">
                  <div class="progress-header">
                    <NText depth="3" class="progress-label">ความคืบหน้า</NText>
                    <NText class="progress-value">{{ Math.round((project.completedTasks / project.taskCount) * 100) }}%</NText>
                  </div>
                  <NProgress
                    type="line"
                    :percentage="Math.round((project.completedTasks / project.taskCount) * 100)"
                    :show-indicator="false"
                    :height="6"
                    :border-radius="3"
                    color="var(--color-primary)"
                    rail-color="var(--color-border-light)"
                  />
                </div>
              </div>
              <div class="project-card-footer">
                <div class="project-meta">
                  <div class="meta-item">
                    <NIcon :size="14" color="var(--color-text-tertiary)"><PeopleOutline /></NIcon>
                    <NText depth="3">{{ project.memberCount }} คน</NText>
                  </div>
                  <div class="meta-item">
                    <NIcon :size="14" color="var(--color-text-tertiary)"><TimeOutline /></NIcon>
                    <NText depth="3">{{ project.taskCount }} งาน</NText>
                  </div>
                </div>
                <div class="project-due">
                  <NText depth="3" class="due-label">กำหนด</NText>
                  <NText class="due-value">{{ project.dueDate }}</NText>
                </div>
              </div>
            </div>
          </NCard>
        </NGi>
      </NGrid>
    </div>
  </NSpin>
</template>

<style scoped>
.project-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.page-title {
  font-size: var(--text-hero);
  font-weight: 700;
  color: var(--color-text);
  line-height: var(--leading-tight);
}

.page-subtitle {
  font-size: var(--text-sm);
  margin-top: var(--space-2xs);
}

.project-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--duration-normal) var(--ease-out), transform var(--duration-normal) var(--ease-out);
  cursor: pointer;
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

.project-category {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
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

.project-due {
  text-align: right;
}

.due-label {
  font-size: var(--text-xs);
  margin-right: var(--space-xs);
}

.due-value {
  font-size: var(--text-xs);
  font-weight: 500;
}
</style>
