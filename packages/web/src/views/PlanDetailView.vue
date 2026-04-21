<script setup lang="ts">
import { ref, h } from "vue";
import {
  NCard,
  NText,
  NIcon,
  NButton,
  NSpin,
  NTag,
  NProgress,
  NGrid,
  NGi,
  NSpace,
} from "naive-ui";
import {
  ArrowBackOutline,
  TrendingUpOutline,
  CheckmarkDoneOutline,
  TimeOutline,
} from "@vicons/ionicons5";
import { useRouter } from "vue-router";

const router = useRouter();
const loading = ref(false);

interface QuarterTarget {
  quarter: string
  target: number
  actual: number
}

interface Indicator {
  id: string
  name: string
  unit: string
  target: number
  actual: number
  quarters: QuarterTarget[]
}

interface PlanSection {
  id: string
  title: string
  progress: number
  indicators: Indicator[]
}

const sections: PlanSection[] = [
  {
    id: "1",
    title: "หมวด 1: การบริการวิชาการ",
    progress: 65,
    indicators: [
      { id: "1.1", name: "จำนวนผู้เช่าพื้นที่", unit: "ราย", target: 30, actual: 25, quarters: [
        { quarter: "Q1", target: 8, actual: 7 },
        { quarter: "Q2", target: 8, actual: 8 },
        { quarter: "Q3", target: 7, actual: 6 },
        { quarter: "Q4", target: 7, actual: 4 },
      ]},
      { id: "1.2", name: "รายได้จากการเช่า", unit: "ล้านบาท", target: 15, actual: 9.8, quarters: [
        { quarter: "Q1", target: 3.5, actual: 3.2 },
        { quarter: "Q2", target: 4, actual: 3.5 },
        { quarter: "Q3", target: 4, actual: 3.1 },
        { quarter: "Q4", target: 3.5, actual: 0 },
      ]},
      { id: "1.3", name: "ความพึงพอใจผู้เช่า", unit: "%", target: 85, actual: 82, quarters: [
        { quarter: "Q1", target: 85, actual: 80 },
        { quarter: "Q2", target: 85, actual: 84 },
        { quarter: "Q3", target: 85, actual: 82 },
        { quarter: "Q4", target: 85, actual: 0 },
      ]},
    ],
  },
  {
    id: "2",
    title: "หมวด 2: การให้คำปรึกษาและวิจัย",
    progress: 50,
    indicators: [
      { id: "2.1", name: "จำนวนโครงการให้คำปรึกษา", unit: "โครงการ", target: 12, actual: 7, quarters: [
        { quarter: "Q1", target: 3, actual: 2 },
        { quarter: "Q2", target: 3, actual: 3 },
        { quarter: "Q3", target: 3, actual: 2 },
        { quarter: "Q4", target: 3, actual: 0 },
      ]},
      { id: "2.2", name: "จำนวนงานวิจัยที่สนับสนุน", unit: "เรื่อง", target: 8, actual: 4, quarters: [
        { quarter: "Q1", target: 2, actual: 1 },
        { quarter: "Q2", target: 2, actual: 2 },
        { quarter: "Q3", target: 2, actual: 1 },
        { quarter: "Q4", target: 2, actual: 0 },
      ]},
    ],
  },
];

function getPercent(actual: number, target: number): number {
  if (target === 0) return 0;
  return Math.min(Math.round((actual / target) * 100), 100);
}

function getStatusType(actual: number, target: number): "success" | "warning" | "error" {
  const pct = getPercent(actual, target);
  if (pct >= 80) return "success";
  if (pct >= 50) return "warning";
  return "error";
}
</script>

<template>
  <NSpin :show="loading">
    <div class="plan-detail">
      <div class="page-header">
        <div class="header-left">
          <NButton quaternary circle @click="router.push({ name: 'plans' })">
            <template #icon><NIcon><ArrowBackOutline /></NIcon></template>
          </NButton>
          <div>
            <h1 class="page-title">แผนปฏิบัติการบริการเช่าพื้นที่ 2569</h1>
            <NText depth="3" class="page-subtitle">ปีงบประมาณ 2569 | 12 ตัวชี้วัด</NText>
          </div>
        </div>
        <NTag :bordered="false" type="info">กำลังดำเนินการ</NTag>
      </div>

      <!-- Overview Stats -->
      <div class="overview-bar">
        <div class="overview-stat">
          <NIcon :size="20" color="var(--color-primary)"><TrendingUpOutline /></NIcon>
          <div>
            <NText depth="3" class="overview-label">ความคืบหน้ารวม</NText>
            <div class="overview-value">65%</div>
          </div>
        </div>
        <div class="overview-divider" />
        <div class="overview-stat">
          <NIcon :size="20" color="var(--color-success)"><CheckmarkDoneOutline /></NIcon>
          <div>
            <NText depth="3" class="overview-label">ตัวชี้วัดที่ผ่านเป้า</NText>
            <div class="overview-value">5 / 12</div>
          </div>
        </div>
        <div class="overview-divider" />
        <div class="overview-stat">
          <NIcon :size="20" color="var(--color-warning)"><TimeOutline /></NIcon>
          <div>
            <NText depth="3" class="overview-label">ไตรมาสปัจจุบัน</NText>
            <div class="overview-value">Q3 (เม.ย.-มิ.ย.)</div>
          </div>
        </div>
      </div>

      <!-- Overall Progress -->
      <NCard class="progress-card" :bordered="false">
        <NText class="progress-title">ความคืบหน้ารวมทั้งแผน</NText>
        <NProgress type="line" :percentage="65" :height="12" :border-radius="6" indicator-placement="inside">
          65%
        </NProgress>
      </NCard>

      <!-- Sections -->
      <div v-for="section in sections" :key="section.id" class="plan-section">
        <NCard class="section-card" :bordered="false">
          <template #header>
            <div class="section-header">
              <div>
                <NText class="section-title">{{ section.title }}</NText>
                <NText depth="3" class="section-subtitle">{{ section.indicators.length }} ตัวชี้วัด</NText>
              </div>
              <div class="section-progress">
                <NProgress type="circle" :percentage="section.progress" :size="48" :stroke-width="6">
                  {{ section.progress }}%
                </NProgress>
              </div>
            </div>
          </template>
          <div class="indicator-list">
            <div v-for="ind in section.indicators" :key="ind.id" class="indicator-row">
              <div class="indicator-header">
                <div class="indicator-id">{{ ind.id }}</div>
                <div class="indicator-info">
                  <div class="indicator-name">{{ ind.name }}</div>
                  <NText depth="3" class="indicator-target">
                    เป้าหมาย: {{ ind.target }} {{ ind.unit }} | ผล: {{ ind.actual }} {{ ind.unit }}
                  </NText>
                </div>
                <NTag
                  :bordered="false"
                  size="small"
                  :type="getStatusType(ind.actual, ind.target)"
                >
                  {{ getPercent(ind.actual, ind.target) }}%
                </NTag>
              </div>
              <div class="quarter-grid">
                <div v-for="q in ind.quarters" :key="q.quarter" class="quarter-cell">
                  <div class="quarter-label">{{ q.quarter }}</div>
                  <div class="quarter-values">
                    <span class="quarter-target">เป้า {{ q.target }}</span>
                    <span class="quarter-actual">ผล {{ q.actual }}</span>
                  </div>
                  <div class="quarter-bar">
                    <div
                      class="quarter-bar-fill"
                      :style="{
                        width: getPercent(q.actual, q.target) + '%',
                        background: q.actual >= q.target ? 'var(--color-success)' : q.actual >= q.target * 0.5 ? 'var(--color-warning)' : 'var(--color-danger)',
                      }"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </NCard>
      </div>
    </div>
  </NSpin>
</template>

<style scoped>
.plan-detail {
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

/* ── Overview Bar ── */
.overview-bar {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  padding: var(--space-md) var(--space-lg);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.overview-stat {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.overview-label {
  font-size: var(--text-xs);
  display: block;
}

.overview-value {
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--color-text);
}

.overview-divider {
  width: 1px;
  height: 36px;
  background: var(--color-border);
}

/* ── Progress Card ── */
.progress-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.progress-title {
  font-size: var(--text-sm);
  font-weight: 500;
  margin-bottom: var(--space-md);
  display: block;
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

.section-subtitle {
  font-size: var(--text-xs);
  display: block;
  margin-top: 2px;
}

/* ── Indicator List ── */
.indicator-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.indicator-row {
  padding: var(--space-md);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  transition: border-color var(--duration-fast) var(--ease-out);
}

.indicator-row:hover {
  border-color: var(--color-border);
}

.indicator-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}

.indicator-id {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-primary);
  background: var(--color-primary-bg);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.indicator-info {
  flex: 1;
  min-width: 0;
}

.indicator-name {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text);
}

.indicator-target {
  font-size: var(--text-xs);
}

/* ── Quarter Grid ── */
.quarter-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-sm);
}

.quarter-cell {
  padding: var(--space-sm);
  background: var(--color-surface-variant);
  border-radius: var(--radius-sm);
}

.quarter-label {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-xs);
}

.quarter-values {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-xs);
  margin-bottom: var(--space-xs);
}

.quarter-target {
  color: var(--color-text-secondary);
}

.quarter-actual {
  font-weight: 600;
  color: var(--color-text);
}

.quarter-bar {
  height: 4px;
  background: var(--color-border-light);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.quarter-bar-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width var(--duration-slow) var(--ease-out);
}
</style>
