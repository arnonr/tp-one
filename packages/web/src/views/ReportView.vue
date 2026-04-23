<script setup lang="ts">
import { ref, computed, watch } from "vue";
import {
  NCard,
  NGrid,
  NGi,
  NText,
  NIcon,
  NButton,
  NSpin,
  NSelect,
  NSpace,
  NProgress,
} from "naive-ui";
import {
  DownloadOutline,
  PrintOutline,
  BarChartOutline,
  PieChartOutline,
  TrendingUpOutline,
  DocumentTextOutline,
} from "@vicons/ionicons5";
import { useFiscalYear } from "@/composables/useFiscalYear";
import { useWorkspaceStore } from "@/stores/workspace";
import { reportService, type ReportSummary } from "@/services/report";
import PageHeader from "@/components/common/PageHeader.vue";

const loading = ref(false);
const reportData = ref<ReportSummary | null>(null);
const { selectedFY, fyLabel, fyOptions } = useFiscalYear();
const workspaceStore = useWorkspaceStore();

async function fetchReport() {
  loading.value = true;
  try {
    const wsId = workspaceStore.currentWorkspaceId || undefined;
    reportData.value = await reportService.getSummary(selectedFY.value, wsId);
  } catch (e) {
    console.error('Failed to fetch report', e);
  } finally {
    loading.value = false;
  }
}

watch([selectedFY, () => workspaceStore.currentWorkspaceId], fetchReport, { immediate: true });

function exportPDF() {
  const wsId = workspaceStore.currentWorkspaceId || undefined
  reportService.exportPDF(selectedFY.value, 'summary', wsId)
}

function exportExcel() {
  const wsId = workspaceStore.currentWorkspaceId || undefined
  reportService.exportExcel(selectedFY.value, 'summary', wsId)
}

const successRate = computed(() => {
  if (!reportData.value || reportData.value.totalTasks === 0) return 0;
  return Math.round((reportData.value.tasksByStatusType.completed / reportData.value.totalTasks) * 100);
});

const STATUS_TYPE_COLORS: Record<string, string> = {
  pending: 'var(--color-warning)',
  in_progress: 'var(--color-info)',
  review: '#8b5cf6',
  completed: 'var(--color-success)',
};

const STATUS_TYPE_LABELS: Record<string, string> = {
  pending: 'รอทำ',
  in_progress: 'อยู่ระหว่างทำ',
  review: 'อยู่ระหว่างตรวจ',
  completed: 'เสร็จสิ้น',
};
</script>

<template>
  <NSpin :show="loading">
    <div class="report-page">
      <PageHeader title="รายงาน" :subtitle="fyLabel">
        <template #actions>
          <NButton @click="exportPDF">
            <template #icon>
              <NIcon><PrintOutline /></NIcon>
            </template>
            พิมพ์ PDF
          </NButton>
          <NButton type="primary" @click="exportExcel">
            <template #icon>
              <NIcon><DownloadOutline /></NIcon>
            </template>
            ส่งออก Excel
          </NButton>
        </template>
      </PageHeader>

      <!-- Filters -->
      <NCard class="filter-card" :bordered="false">
        <NSpace :size="12" align="center">
          <NText class="filter-label">ตัวกรอง:</NText>
          <NSelect v-model:value="selectedFY" :options="fyOptions" size="small" style="width: 160px" />
        </NSpace>
      </NCard>

      <!-- Summary Cards -->
      <NGrid :cols="4" :x-gap="16" :y-gap="16" responsive="screen" item-responsive>
        <NGi span="4 m:2 l:1">
          <NCard class="stat-card" :bordered="false">
            <div class="stat-label">งานทั้งหมด</div>
            <div class="stat-value" style="color: var(--color-primary)">{{ reportData?.totalTasks?.toLocaleString() ?? '-' }}</div>
            <div class="stat-sub">งานในปีงบนี้</div>
          </NCard>
        </NGi>
        <NGi span="4 m:2 l:1">
          <NCard class="stat-card" :bordered="false">
            <div class="stat-label">เสร็จสิ้น</div>
            <div class="stat-value" style="color: var(--color-success)">{{ reportData?.tasksByStatusType.completed?.toLocaleString() ?? '-' }}</div>
            <div class="stat-sub">งานเสร็จสิ้น</div>
          </NCard>
        </NGi>
        <NGi span="4 m:2 l:1">
          <NCard class="stat-card" :bordered="false">
            <div class="stat-label">อัตราสำเร็จ</div>
            <div class="stat-value" style="color: var(--color-success)">{{ successRate }}%</div>
            <div class="stat-sub">ของงานทั้งหมด</div>
          </NCard>
        </NGi>
        <NGi span="4 m:2 l:1">
          <NCard class="stat-card" :bordered="false">
            <div class="stat-label">โครงการ</div>
            <div class="stat-value" style="color: var(--color-info)">{{ reportData?.projectStats.total?.toLocaleString() ?? '-' }}</div>
            <div class="stat-sub">{{ reportData?.projectStats.inProgress ?? 0 }} กำลังดำเนินการ</div>
          </NCard>
        </NGi>
      </NGrid>

      <!-- Status Type Breakdown -->
      <NCard class="section-card" :bordered="false">
        <template #header>
          <NText class="section-title">สถานะงานตามประเภท</NText>
        </template>
        <div class="status-type-grid">
          <div v-for="(count, type) in reportData?.tasksByStatusType" :key="type" class="status-type-item">
            <div class="status-type-dot" :style="{ background: STATUS_TYPE_COLORS[type] }" />
            <div class="status-type-name">{{ STATUS_TYPE_LABELS[type] }}</div>
            <div class="status-type-count">{{ count?.toLocaleString() ?? 0 }}</div>
          </div>
        </div>
      </NCard>

      <!-- Monthly Trend -->
      <NCard class="section-card" :bordered="false">
        <template #header>
          <NText class="section-title">สถานะงานรายเดือน</NText>
        </template>
        <div class="monthly-list">
          <div v-for="m in reportData?.monthlyData" :key="m.month" class="monthly-row">
            <div class="monthly-label">{{ m.month }}</div>
            <div class="monthly-bar-wrap">
              <div class="monthly-bar" :style="{
                width: (m.created > 0 ? (m.completed / m.created) * 100 : 0) + '%',
                background: 'var(--color-success)'
              }" />
            </div>
            <div class="monthly-stats">{{ m.completed }}/{{ m.created }}</div>
          </div>
        </div>
      </NCard>

      <!-- Workspace Breakdown -->
      <NCard v-if="reportData?.tasksByWorkspace?.length" class="section-card" :bordered="false">
        <template #header>
          <NText class="section-title">ผลการดำเนินงานตามพื้นที่</NText>
        </template>
        <div class="category-list">
          <div v-for="ws in reportData.tasksByWorkspace" :key="ws.name" class="category-row">
            <div class="category-info">
              <div class="category-dot" style="background: var(--color-primary)" />
              <div>
                <div class="category-name">{{ ws.name }}</div>
                <NText depth="3" class="category-sub">{{ ws.completed }}/{{ ws.count }} งาน</NText>
              </div>
            </div>
            <div class="category-bar-wrap">
              <div class="category-bar" :style="{
                '--target-width': (ws.count > 0 ? (ws.completed / ws.count) * 100 : 0) + '%',
                background: 'var(--color-primary)'
              }" />
            </div>
            <div class="category-percent" style="color: var(--color-primary)">
              {{ ws.count > 0 ? Math.round((ws.completed / ws.count) * 100) : 0 }}%
            </div>
          </div>
        </div>
      </NCard>
    </div>
  </NSpin>
</template>

<style scoped>
.report-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.filter-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xs);
}

.filter-label {
  font-size: var(--text-sm);
  font-weight: 500;
}

/* ── Stat Cards ── */
.stat-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: var(--space-md);
}

.stat-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-xs);
}

.stat-value {
  font-size: var(--text-2xl);
  font-weight: 700;
  line-height: var(--leading-tight);
}

.stat-sub {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--space-xs);
}

/* ── Section Card ── */
.section-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.section-title {
  font-size: var(--text-md);
  font-weight: 600;
}

/* ── Status Type Grid ── */
.status-type-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-md);
}

.status-type-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-light);
}

.status-type-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-type-name {
  flex: 1;
  font-size: var(--text-sm);
}

.status-type-count {
  font-size: var(--text-lg);
  font-weight: 700;
}

/* ── Monthly List ── */
.monthly-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.monthly-row {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.monthly-label {
  width: 50px;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.monthly-bar-wrap {
  flex: 1;
  height: 8px;
  background: var(--color-border-light);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.monthly-bar {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width var(--duration-slow);
}

.monthly-stats {
  width: 70px;
  text-align: right;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* ── Category List ── */
.category-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.category-row {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.category-info {
  width: 180px;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-shrink: 0;
}

.category-dot {
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.category-name {
  font-size: var(--text-sm);
  font-weight: 500;
}

.category-sub {
  font-size: var(--text-xs);
}

.category-bar-wrap {
  flex: 1;
  height: 8px;
  background: var(--color-border-light);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.category-bar {
  height: 100%;
  width: var(--target-width);
  border-radius: var(--radius-full);
  transition: width var(--duration-slow) var(--ease-out);
}

.category-percent {
  width: 50px;
  text-align: right;
  font-size: var(--text-sm);
  font-weight: 600;
  flex-shrink: 0;
}
</style>