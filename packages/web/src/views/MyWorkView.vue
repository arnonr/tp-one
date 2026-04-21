<script setup lang="ts">
import { ref } from "vue";
import { NCard, NText, NIcon, NButton, NSpace, NTag, NSpin } from "naive-ui";
import {
  TodayOutline,
  AlertCircleOutline,
  HourglassOutline,
  ChevronForwardOutline,
  AddCircleOutline,
} from "@vicons/ionicons5";
import { useRouter } from "vue-router";
import PageHeader from "@/components/common/PageHeader.vue";

const router = useRouter();
const loading = ref(false);

const PRIORITY_CONFIG: Record<string, { label: string, color: string, bg: string }> = {
  urgent: { label: "เร่งด่วน", color: "var(--color-priority-urgent)", bg: "var(--color-priority-urgent-bg)" },
  high: { label: "สูง", color: "var(--color-priority-high)", bg: "var(--color-priority-high-bg)" },
  normal: { label: "ปกติ", color: "var(--color-priority-normal)", bg: "var(--color-priority-normal-bg)" },
  low: { label: "ต่ำ", color: "var(--color-priority-low)", bg: "var(--color-priority-low-bg)" },
};

interface TaskItem {
  id: string
  title: string
  project: string
  priority: "urgent" | "high" | "normal" | "low"
  dueDate: string
  assignee?: string
}

const todayTasks: TaskItem[] = [
  { id: "1", title: "จัดเตรียมเอกสารสัญญาเช่า สำนักงาน A", project: "เช่าพื้นที่", priority: "urgent", dueDate: "วันนี้" },
  { id: "2", title: "ตรวจสอบรายงานการเงิน Q2", project: "แผนปฏิบัติการ", priority: "high", dueDate: "วันนี้" },
  { id: "3", title: "ประสานงานวิทยากร AI Workshop", project: "อบรม/สัมนา", priority: "normal", dueDate: "วันนี้" },
];

const overdueTasks: TaskItem[] = [
  { id: "4", title: "ส่งรายงานให้คำปรึกษาภาคเรียน 2/2568", project: "ที่ปรึกษา/วิจัย", priority: "urgent", dueDate: "เลย 3 วัน" },
  { id: "5", title: "อัปเดตข้อมูลผู้เช่าห้อง 301-305", project: "เช่าพื้นที่", priority: "high", dueDate: "เลย 1 วัน" },
];

const upcomingTasks: TaskItem[] = [
  { id: "6", title: "ประเมินผลโครงการบ่มเพาะฯ รุ่นที่ 5", project: "บ่มเพาะสตาร์ทอัป", priority: "high", dueDate: "อีก 2 วัน" },
  { id: "7", title: "จัดทำแผนดำเนินงาน Q3", project: "แผนปฏิบัติการ", priority: "normal", dueDate: "อีก 5 วัน" },
  { id: "8", title: "ติดตามผลการอบรม Data Analytics", project: "อบรม/สัมนา", priority: "low", dueDate: "อีก 7 วัน" },
  { id: "9", title: "เตรียมเอกสารประชุมคณะกรรมการ", project: "แผนปฏิบัติการ", priority: "normal", dueDate: "อีก 3 วัน" },
];
</script>

<template>
  <NSpin :show="loading">
    <div class="my-work">
      <PageHeader title="งานของฉัน" subtitle="งานที่มอบหมายให้คุณทั้งหมด">
        <template #actions>
          <NButton type="primary">
            <template #icon>
              <NIcon><AddCircleOutline /></NIcon>
            </template>
            สร้างงาน
          </NButton>
        </template>
      </PageHeader>

      <!-- Summary -->
      <div class="summary-bar">
        <div class="summary-item">
          <span class="summary-num urgent">{{ todayTasks.length }}</span>
          <NText depth="3">วันนี้</NText>
        </div>
        <div class="summary-divider" />
        <div class="summary-item">
          <span class="summary-num danger">{{ overdueTasks.length }}</span>
          <NText depth="3">เลยกำหนด</NText>
        </div>
        <div class="summary-divider" />
        <div class="summary-item">
          <span class="summary-num">{{ upcomingTasks.length }}</span>
          <NText depth="3">กำลังจะมาถึง</NText>
        </div>
      </div>

      <!-- Today Tasks -->
      <NCard class="section-card" :bordered="false">
        <template #header>
          <div class="section-header">
            <div class="section-header-left">
              <NIcon :size="20" color="var(--color-primary)"><TodayOutline /></NIcon>
              <NText class="section-title">วันนี้</NText>
              <NTag :bordered="false" size="small" type="info">{{ todayTasks.length }}</NTag>
            </div>
          </div>
        </template>
        <div class="task-list">
          <div v-for="task in todayTasks" :key="task.id" class="task-row">
            <div class="task-main">
              <div class="task-priority-dot" :style="{ background: PRIORITY_CONFIG[task.priority]?.color }" />
              <div class="task-info">
                <div class="task-title">{{ task.title }}</div>
                <NText depth="3" class="task-project">{{ task.project }}</NText>
              </div>
            </div>
            <div class="task-meta">
              <span class="priority-chip" :style="{ color: PRIORITY_CONFIG[task.priority]?.color, background: PRIORITY_CONFIG[task.priority]?.bg }">
                {{ PRIORITY_CONFIG[task.priority]?.label }}
              </span>
              <NText depth="3" class="task-due">{{ task.dueDate }}</NText>
            </div>
          </div>
        </div>
      </NCard>

      <!-- Overdue Tasks -->
      <NCard class="section-card section-card--danger" :bordered="false">
        <template #header>
          <div class="section-header">
            <div class="section-header-left">
              <NIcon :size="20" color="var(--color-danger)"><AlertCircleOutline /></NIcon>
              <NText class="section-title" style="color: var(--color-danger)">เลยกำหนด</NText>
              <NTag :bordered="false" size="small" type="error">{{ overdueTasks.length }}</NTag>
            </div>
          </div>
        </template>
        <div class="task-list">
          <div v-for="task in overdueTasks" :key="task.id" class="task-row">
            <div class="task-main">
              <div class="task-priority-dot" :style="{ background: PRIORITY_CONFIG[task.priority]?.color }" />
              <div class="task-info">
                <div class="task-title">{{ task.title }}</div>
                <NText depth="3" class="task-project">{{ task.project }}</NText>
              </div>
            </div>
            <div class="task-meta">
              <span class="priority-chip" :style="{ color: PRIORITY_CONFIG[task.priority]?.color, background: PRIORITY_CONFIG[task.priority]?.bg }">
                {{ PRIORITY_CONFIG[task.priority]?.label }}
              </span>
              <NText depth="3" class="task-due task-due--overdue">{{ task.dueDate }}</NText>
            </div>
          </div>
        </div>
      </NCard>

      <!-- Upcoming Tasks -->
      <NCard class="section-card" :bordered="false">
        <template #header>
          <div class="section-header">
            <div class="section-header-left">
              <NIcon :size="20" color="var(--color-text-secondary)"><HourglassOutline /></NIcon>
              <NText class="section-title">กำลังจะมาถึง</NText>
              <NTag :bordered="false" size="small">{{ upcomingTasks.length }}</NTag>
            </div>
            <NButton text size="small" type="primary" @click="router.push({ name: 'tasks' })">
              ดูทั้งหมด
              <template #icon>
                <NIcon><ChevronForwardOutline /></NIcon>
              </template>
            </NButton>
          </div>
        </template>
        <div class="task-list">
          <div v-for="task in upcomingTasks" :key="task.id" class="task-row">
            <div class="task-main">
              <div class="task-priority-dot" :style="{ background: PRIORITY_CONFIG[task.priority]?.color }" />
              <div class="task-info">
                <div class="task-title">{{ task.title }}</div>
                <NText depth="3" class="task-project">{{ task.project }}</NText>
              </div>
            </div>
            <div class="task-meta">
              <span class="priority-chip" :style="{ color: PRIORITY_CONFIG[task.priority]?.color, background: PRIORITY_CONFIG[task.priority]?.bg }">
                {{ PRIORITY_CONFIG[task.priority]?.label }}
              </span>
              <NText depth="3" class="task-due">{{ task.dueDate }}</NText>
            </div>
          </div>
        </div>
      </NCard>
    </div>
  </NSpin>
</template>

<style scoped>
.my-work {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

/* ── Summary Bar ── */
.summary-bar {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  padding: var(--space-md) var(--space-lg);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.summary-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.summary-num {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--color-text);
}

.summary-num.urgent {
  color: var(--color-primary);
}

.summary-num.danger {
  color: var(--color-danger);
}

.summary-divider {
  width: 1px;
  height: 24px;
  background: var(--color-border);
}

/* ── Section Card ── */
.section-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.section-card--danger {
  border-left: 3px solid var(--color-danger);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.section-header-left {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.section-title {
  font-size: var(--text-md);
  font-weight: 600;
}

/* ── Task List ── */
.task-list {
  display: flex;
  flex-direction: column;
}

.task-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-sm) 0;
  border-bottom: 1px solid var(--color-border-light);
  transition: background var(--duration-fast) var(--ease-out);
}

.task-row:last-child {
  border-bottom: none;
}

.task-main {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex: 1;
  min-width: 0;
}

.task-priority-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.task-info {
  min-width: 0;
}

.task-title {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-project {
  font-size: var(--text-xs);
}

.task-meta {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-shrink: 0;
  margin-left: var(--space-md);
}

.priority-chip {
  font-size: var(--text-xs);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-weight: 500;
  white-space: nowrap;
}

.task-due {
  font-size: var(--text-xs);
  white-space: nowrap;
}

.task-due--overdue {
  color: var(--color-danger) !important;
  font-weight: 500;
}

/* ── Mobile Responsive ── */
@media (max-width: 767px) {
  .page-header {
    flex-wrap: wrap;
    gap: var(--space-sm);
  }

  .page-title {
    font-size: var(--text-xl);
  }

  .summary-bar {
    flex-wrap: wrap;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
  }

  .summary-divider {
    display: none;
  }

  .summary-item {
    flex: 1;
    min-width: 80px;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }

  .summary-num {
    font-size: var(--text-lg);
  }

  .task-row {
    flex-wrap: wrap;
    gap: var(--space-xs);
  }

  .task-meta {
    flex-wrap: wrap;
    margin-left: calc(var(--space-sm) + 8px);
  }
}
</style>
