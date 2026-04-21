<script setup lang="ts">
import { ref } from "vue";
import {
  NCard,
  NGrid,
  NGi,
  NIcon,
  NText,
  NSpin,
  NButton,
  NSpace,
} from "naive-ui";
import {
  CheckmarkCircleOutline,
  TimeOutline,
  CheckmarkDoneOutline,
  FolderOutline,
  TrendingUpOutline,
  ArrowForwardOutline,
} from "@vicons/ionicons5";
import { useFiscalYear } from "@/composables/useFiscalYear";

const { fyLabel } = useFiscalYear();
const loading = ref(false);

interface StatCard {
  label: string
  value: number
  icon: any
  color: string
  bg: string
  trend: string
  trendUp: boolean
}

const stats: StatCard[] = [
  {
    label: "งานทั้งหมด",
    value: 128,
    icon: CheckmarkCircleOutline,
    color: "var(--color-primary)",
    bg: "var(--color-primary-bg)",
    trend: "+12% จากเดือนก่อน",
    trendUp: true,
  },
  {
    label: "กำลังดำเนินการ",
    value: 34,
    icon: TimeOutline,
    color: "var(--color-warning)",
    bg: "var(--color-warning-bg)",
    trend: "+5 งานสัปดาห์นี้",
    trendUp: true,
  },
  {
    label: "เสร็จสิ้น",
    value: 89,
    icon: CheckmarkDoneOutline,
    color: "var(--color-success)",
    bgColor: "var(--color-success-bg)",
    trend: "อัตราสำเร็จ 69%",
    trendUp: true,
  },
  {
    label: "โครงการ",
    value: 12,
    icon: FolderOutline,
    color: "var(--color-info)",
    bgColor: "var(--color-info-bg)",
    trend: "3 โครงการใกล้เสร็จ",
    trendUp: false,
  },
];

interface RecentTask {
  id: string
  title: string
  project: string
  priority: "urgent" | "high" | "normal" | "low"
  dueDate: string
  status: string
}

const PRIORITY_CONFIG: Record<string, { label: string, color: string, bg: string }> = {
  urgent: { label: "เร่งด่วน", color: "var(--color-priority-urgent)", bg: "var(--color-priority-urgent-bg)" },
  high: { label: "สูง", color: "var(--color-priority-high)", bg: "var(--color-priority-high-bg)" },
  normal: { label: "ปกติ", color: "var(--color-priority-normal)", bg: "var(--color-priority-normal-bg)" },
  low: { label: "ต่ำ", color: "var(--color-priority-low)", bg: "var(--color-priority-low-bg)" },
};

const recentTasks: RecentTask[] = [
  { id: "1", title: "จัดเตรียมเอกสารสัญญาเช่า", project: "เช่าพื้นที่", priority: "urgent", dueDate: "22 เม.ย. 2569", status: "กำลังดำเนินการ" },
  { id: "2", title: "ติดตามผลการอบรม AI Workshop", project: "อบรม/สัมนา", priority: "high", dueDate: "25 เม.ย. 2569", status: "รอดำเนินการ" },
  { id: "3", title: "ประเมินผลโครงการบ่มเพาะฯ Q2", project: "บ่มเพาะสตาร์ทอัป", priority: "normal", dueDate: "30 เม.ย. 2569", status: "กำลังดำเนินการ" },
  { id: "4", title: "จัดทำรายงานให้คำปรึกษาภาคเรียน 2", project: "ที่ปรึกษา/วิจัย", priority: "low", dueDate: "15 พ.ค. 2569", status: "รอดำเนินการ" },
  { id: "5", title: "อัปเดตแผนปฏิบัติการ Q3", project: "แผนปฏิบัติการ", priority: "high", dueDate: "28 เม.ย. 2569", status: "กำลังดำเนินการ" },
];

const STATUS_COLORS: Record<string, string> = {
  "กำลังดำเนินการ": "var(--color-primary)",
  "รอดำเนินการ": "var(--color-warning)",
  "เสร็จสิ้น": "var(--color-success)",
};
</script>

<template>
  <NSpin :show="loading">
    <div class="dashboard">
      <div class="page-header">
        <div>
          <h1 class="page-title">แดชบอร์ด</h1>
          <NText depth="3" class="page-subtitle">{{ fyLabel }}</NText>
        </div>
      </div>

      <!-- Stat Cards -->
      <NGrid :cols="4" :x-gap="16" :y-gap="16" responsive="screen" item-responsive>
        <NGi v-for="stat in stats" :key="stat.label" span="4 m:2 l:1">
          <NCard class="stat-card" :bordered="false">
            <div class="stat-card-inner">
              <div class="stat-icon-wrap" :style="{ background: stat.bg }">
                <NIcon :size="24" :color="stat.color" :component="stat.icon" />
              </div>
              <div class="stat-content">
                <NText depth="3" class="stat-label">{{ stat.label }}</NText>
                <div class="stat-value">{{ stat.value.toLocaleString() }}</div>
                <div class="stat-trend">
                  <NIcon :size="14" :color="stat.trendUp ? 'var(--color-success)' : 'var(--color-info)'">
                    <TrendingUpOutline />
                  </NIcon>
                  <NText depth="3" class="stat-trend-text">{{ stat.trend }}</NText>
                </div>
              </div>
            </div>
          </NCard>
        </NGi>
      </NGrid>

      <!-- Recent Tasks -->
      <NCard class="section-card" :bordered="false">
        <template #header>
          <div class="section-header">
            <NText class="section-title">งานล่าสุด</NText>
            <NButton text size="small" type="primary">
              ดูทั้งหมด
              <template #icon>
                <NIcon><ArrowForwardOutline /></NIcon>
              </template>
            </NButton>
          </div>
        </template>
        <div class="task-list">
          <div v-for="task in recentTasks" :key="task.id" class="task-row">
            <div class="task-main">
              <div class="task-priority-dot" :style="{ background: PRIORITY_CONFIG[task.priority]?.color }" />
              <div class="task-info">
                <div class="task-title">{{ task.title }}</div>
                <NText depth="3" class="task-project">{{ task.project }}</NText>
              </div>
            </div>
            <div class="task-meta">
              <span
                class="status-chip"
                :style="{
                  color: STATUS_COLORS[task.status] || 'var(--color-text-secondary)',
                  background: task.status === 'กำลังดำเนินการ' ? 'var(--color-primary-bg)' : task.status === 'รอดำเนินการ' ? 'var(--color-warning-bg)' : 'var(--color-success-bg)',
                }"
              >
                {{ task.status }}
              </span>
              <span
                class="priority-chip"
                :style="{
                  color: PRIORITY_CONFIG[task.priority]?.color,
                  background: PRIORITY_CONFIG[task.priority]?.bg,
                }"
              >
                {{ PRIORITY_CONFIG[task.priority]?.label }}
              </span>
              <NText depth="3" class="task-date">{{ task.dueDate }}</NText>
            </div>
          </div>
        </div>
      </NCard>

      <!-- Quick Actions -->
      <NGrid :cols="2" :x-gap="16" :y-gap="16" responsive="screen" item-responsive>
        <NGi span="2 l:1">
          <NCard class="section-card" :bordered="false">
            <template #header>
              <NText class="section-title">ภาพรวมโครงการ</NText>
            </template>
            <NSpace vertical :size="12">
              <div v-for="i in 3" :key="i" class="project-row">
                <div class="project-info">
                  <div class="project-dot" :style="{ background: ['var(--color-primary)', 'var(--color-success)', 'var(--color-warning)'][i - 1] }" />
                  <div>
                    <div class="project-name">{{ ["เช่าพื้นที่", "อบรม/สัมนา", "บ่มเพาะสตาร์ทอัป"][i - 1] }}</div>
                    <NText depth="3" class="project-stat">{{ [12, 8, 5][i - 1] }} งาน</NText>
                  </div>
                </div>
                <NText class="project-progress">{{ [75, 60, 40][i - 1] }}%</NText>
              </div>
            </NSpace>
          </NCard>
        </NGi>
        <NGi span="2 l:1">
          <NCard class="section-card" :bordered="false">
            <template #header>
              <NText class="section-title">กิจกรรมล่าสุด</NText>
            </template>
            <NSpace vertical :size="12">
              <div v-for="i in 4" :key="i" class="activity-item">
                <div class="activity-dot" />
                <div class="activity-content">
                  <div class="activity-text">
                    {{ ["สมชาย อัปเดตสถานะงาน", "วิภา สร้างงานใหม่", "ประเสริฐ เพิ่มความคิดเห็น", "สุนีย์ อนุมัติแผนปฏิบัติการ"][i - 1] }}
                  </div>
                  <NText depth="3" class="activity-time">{{ ["5 นาทีก่อน", "1 ชั่วโมงก่อน", "2 ชั่วโมงก่อน", "3 ชั่วโมงก่อน"][i - 1] }}</NText>
                </div>
              </div>
            </NSpace>
          </NCard>
        </NGi>
      </NGrid>
    </div>
  </NSpin>
</template>

<style scoped>
.dashboard {
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

/* ── Stat Cards ── */
.stat-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--duration-normal) var(--ease-out);
}

.stat-card:hover {
  box-shadow: var(--shadow-md);
}

.stat-card-inner {
  display: flex;
  gap: var(--space-md);
  align-items: flex-start;
}

.stat-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-content {
  flex: 1;
  min-width: 0;
}

.stat-label {
  font-size: var(--text-sm);
}

.stat-value {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--color-text);
  line-height: var(--leading-tight);
  margin-top: 2px;
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: var(--space-2xs);
  margin-top: var(--space-xs);
}

.stat-trend-text {
  font-size: var(--text-xs);
}

/* ── Section Card ── */
.section-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
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

.status-chip {
  font-size: var(--text-xs);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-weight: 500;
  white-space: nowrap;
}

.priority-chip {
  font-size: var(--text-xs);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-weight: 500;
  white-space: nowrap;
}

.task-date {
  font-size: var(--text-xs);
  white-space: nowrap;
}

/* ── Project Row ── */
.project-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-xs) 0;
}

.project-info {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.project-dot {
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.project-name {
  font-size: var(--text-sm);
  font-weight: 500;
}

.project-stat {
  font-size: var(--text-xs);
}

.project-progress {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-primary);
}

/* ── Activity ── */
.activity-item {
  display: flex;
  gap: var(--space-sm);
  align-items: flex-start;
}

.activity-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--color-primary-light);
  flex-shrink: 0;
  margin-top: 6px;
}

.activity-content {
  flex: 1;
}

.activity-text {
  font-size: var(--text-sm);
  color: var(--color-text);
}

.activity-time {
  font-size: var(--text-xs);
}
</style>
