<script setup lang="ts">
import { ref, computed } from "vue";
import { NCard, NText, NIcon, NButton, NSpin, NTag, NProgress } from "naive-ui";
import { ArrowBackOutline, PeopleOutline } from "@vicons/ionicons5";
import { useRouter } from "vue-router";

const router = useRouter();
const loading = ref(false);

const months = ["ต.ค.", "พ.ย.", "ธ.ค.", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย."];

interface TimelinePhase {
  name: string
  start: number
  end: number
  color: string
}

interface TimelineTask {
  id: string
  name: string
  assignee: string
  progress: number
  phases: TimelinePhase[]
}

const phases: TimelineTask[] = [
  {
    id: "1",
    name: "จัดเตรียมสัญญาเช่า",
    assignee: "สมชาย",
    progress: 75,
    phases: [{ name: "ดำเนินการ", start: 0, end: 4, color: "var(--color-primary)" }],
  },
  {
    id: "2",
    name: "ให้คำปรึกษา SME",
    assignee: "สุนีย์",
    progress: 60,
    phases: [{ name: "ดำเนินการ", start: 1, end: 6, color: "var(--color-success)" }],
  },
  {
    id: "3",
    name: "จัดอบรม AI Workshop",
    assignee: "วิภา",
    progress: 40,
    phases: [{ name: "ดำเนินการ", start: 3, end: 7, color: "var(--color-warning)" }],
  },
  {
    id: "4",
    name: "คัดเลือกสตาร์ทอัป",
    assignee: "ประเสริฐ",
    progress: 90,
    phases: [{ name: "ดำเนินการ", start: 0, end: 3, color: "var(--color-info)" }],
  },
  {
    id: "5",
    name: "ประเมินผลบ่มเพาะฯ",
    assignee: "ประเสริฐ",
    progress: 30,
    phases: [{ name: "ดำเนินการ", start: 5, end: 9, color: "var(--color-primary)" }],
  },
  {
    id: "6",
    name: "จัดทำรายงานประจำปี",
    assignee: "สมชาย",
    progress: 10,
    phases: [{ name: "ดำเนินการ", start: 8, end: 11, color: "var(--color-danger)" }],
  },
];
</script>

<template>
  <NSpin :show="loading">
    <div class="gantt-page">
      <div class="page-header">
        <div class="header-left">
          <NButton quaternary circle @click="router.push({ name: 'projects' })">
            <template #icon><NIcon><ArrowBackOutline /></NIcon></template>
          </NButton>
          <div>
            <h1 class="page-title">บริการเช่าพื้นที่สำนักงาน</h1>
            <NText depth="3" class="page-subtitle">ปีงบประมาณ 2569</NText>
          </div>
        </div>
        <div class="header-actions">
          <NTag :bordered="false" type="info">กำลังดำเนินการ</NTag>
          <div class="member-count">
            <NIcon :size="16" color="var(--color-text-tertiary)"><PeopleOutline /></NIcon>
            <NText depth="3">5 คน</NText>
          </div>
        </div>
      </div>

      <!-- Overview Stats -->
      <div class="overview-bar">
        <div class="overview-stat">
          <NText depth="3" class="overview-label">งานทั้งหมด</NText>
          <NText class="overview-value">32</NText>
        </div>
        <div class="overview-stat">
          <NText depth="3" class="overview-label">เสร็จสิ้น</NText>
          <NText class="overview-value" style="color: var(--color-success)">24</NText>
        </div>
        <div class="overview-stat">
          <NText depth="3" class="overview-label">กำลังดำเนินการ</NText>
          <NText class="overview-value" style="color: var(--color-primary)">6</NText>
        </div>
        <div class="overview-stat">
          <NText depth="3" class="overview-label">เลยกำหนด</NText>
          <NText class="overview-value" style="color: var(--color-danger)">2</NText>
        </div>
        <div class="overview-progress">
          <NText depth="3" class="overview-label">ความคืบหน้ารวม</NText>
          <div class="progress-wrap">
            <NProgress type="line" :percentage="75" :height="8" :border-radius="4" :show-indicator="false" />
            <NText class="progress-text">75%</NText>
          </div>
        </div>
      </div>

      <!-- Gantt Chart -->
      <NCard class="gantt-card" :bordered="false">
        <div class="gantt-chart">
          <!-- Header -->
          <div class="gantt-header">
            <div class="gantt-label-header">งาน</div>
            <div class="gantt-timeline-header">
              <div v-for="(month, idx) in months" :key="idx" class="gantt-month">
                {{ month }}
              </div>
            </div>
          </div>

          <!-- Rows -->
          <div v-for="task in phases" :key="task.id" class="gantt-row">
            <div class="gantt-label">
              <div class="gantt-task-name">{{ task.name }}</div>
              <NText depth="3" class="gantt-task-assignee">{{ task.assignee }}</NText>
            </div>
            <div class="gantt-timeline">
              <div
                v-for="(phase, pIdx) in task.phases"
                :key="pIdx"
                class="gantt-bar"
                :style="{
                  left: `${(phase.start / 12) * 100}%`,
                  width: `${((phase.end - phase.start) / 12) * 100}%`,
                  background: phase.color,
                }"
              >
                <div class="gantt-bar-fill" :style="{ width: `${task.progress}%` }" />
                <span class="gantt-bar-text">{{ phase.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </NCard>
    </div>
  </NSpin>
</template>

<style scoped>
.gantt-page {
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

/* ── Overview Bar ── */
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

/* ── Gantt Chart ── */
.gantt-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.gantt-chart {
  overflow-x: auto;
}

.gantt-header {
  display: flex;
  border-bottom: 2px solid var(--color-border);
  background: var(--color-surface-variant);
}

.gantt-label-header {
  width: 220px;
  min-width: 220px;
  padding: var(--space-sm) var(--space-md);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
}

.gantt-timeline-header {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  min-width: 600px;
}

.gantt-month {
  padding: var(--space-sm);
  text-align: center;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-secondary);
  border-left: 1px solid var(--color-border-light);
}

.gantt-row {
  display: flex;
  border-bottom: 1px solid var(--color-border-light);
  min-height: 52px;
  align-items: center;
}

.gantt-row:hover {
  background: var(--color-surface-variant);
}

.gantt-label {
  width: 220px;
  min-width: 220px;
  padding: var(--space-sm) var(--space-md);
}

.gantt-task-name {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text);
}

.gantt-task-assignee {
  font-size: var(--text-xs);
}

.gantt-timeline {
  flex: 1;
  position: relative;
  height: 52px;
  min-width: 600px;
  display: grid;
  grid-template-columns: repeat(12, 1fr);
}

.gantt-bar {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  height: 28px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  padding: 0 var(--space-sm);
  overflow: hidden;
  opacity: 0.9;
}

.gantt-bar-fill {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.3);
  border-radius: var(--radius-sm);
}

.gantt-bar-text {
  position: relative;
  z-index: 1;
  font-size: var(--text-xs);
  color: white;
  font-weight: 500;
  white-space: nowrap;
}
</style>
