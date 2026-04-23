<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import {
  NCard,
  NGrid,
  NGi,
  NIcon,
  NText,
  NSpin,
  NButton,
  NSelect,
  NProgress,
} from "naive-ui";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { PieChart, BarChart } from "echarts/charts";
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from "echarts/components";
import VChart from "vue-echarts";
import {
  CheckmarkCircleOutline,
  TimeOutline,
  CheckmarkDoneOutline,
  FolderOutline,
  TrendingUpOutline,
} from "@vicons/ionicons5";
import { useFiscalYear } from "@/composables/useFiscalYear";
import {
  dashboardService,
  type DashboardStats,
  type TaskChartData,
  type ProjectProgress,
  type WorkloadData,
  type KpiData,
} from "@/services/dashboard";
import PageHeader from "@/components/common/PageHeader.vue";

use([
  CanvasRenderer,
  PieChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
]);

const { selectedFY, fyLabel, fyOptions } = useFiscalYear();

// Loading state
const loading = ref(false);
const error = ref<string | null>(null);

// Dashboard data
const stats = ref<DashboardStats | null>(null);
const taskChart = ref<TaskChartData | null>(null);
const projectData = ref<ProjectProgress | null>(null);
const workloadData = ref<WorkloadData | null>(null);
const kpiData = ref<KpiData | null>(null);

// Stat cards derived from API data
const statCards = computed(() => {
  if (!stats.value) return [];
  const s = stats.value;
  const successRate = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
  return [
    {
      label: "งานทั้งหมด",
      value: s.total,
      icon: CheckmarkCircleOutline,
      color: "var(--color-primary)",
      bg: "var(--color-primary-bg)",
      trend: `${s.total} งานในปีงบนี้`,
      trendUp: true,
    },
    {
      label: "กำลังดำเนินการ",
      value: s.inProgress,
      icon: TimeOutline,
      color: "var(--color-warning)",
      bg: "var(--color-warning-bg)",
      trend: `${Math.round((s.inProgress / s.total) * 100) || 0}% ของงานทั้งหมด`,
      trendUp: true,
    },
    {
      label: "เสร็จสิ้น",
      value: s.completed,
      icon: CheckmarkDoneOutline,
      color: "var(--color-success)",
      bg: "var(--color-success-bg)",
      trend: `อัตราสำเร็จ ${successRate}%`,
      trendUp: true,
    },
    {
      label: "โครงการ",
      value: projectData.value?.projects.length || 0,
      icon: FolderOutline,
      color: "var(--color-info)",
      bg: "var(--color-info-bg)",
      trend: `${projectData.value?.projects.filter(p => p.progress >= 80).length || 0} โครงการใกล้เสร็จ`,
      trendUp: true,
    },
  ];
});

// Priority chart option
const priorityChartOption = computed(() => {
  if (!taskChart.value) return {};
  return {
    tooltip: {
      trigger: "item",
      formatter: "{b}: {c} งาน ({d}%)",
    },
    legend: {
      orient: "horizontal",
      bottom: 0,
      textStyle: { fontSize: 12 },
    },
    series: [
      {
        type: "pie",
        radius: ["40%", "70%"],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 4,
          borderColor: "#fff",
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: "{b}\n{c}",
        },
        data: taskChart.value.byPriority.map((item, i) => ({
          value: item.value,
          name: item.label,
          itemStyle: {
            color: ["var(--color-priority-urgent)", "var(--color-priority-high)", "var(--color-priority-normal)", "var(--color-priority-low)"][i],
          },
        })),
      },
    ],
  };
});

// Workload chart option
const workloadChartOption = computed(() => {
  if (!workloadData.value) return {};
  const sorted = [...workloadData.value.users].sort((a, b) => b.taskCount - a.taskCount);
  return {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: any) => {
        const d = params[0];
        return `${d.name}<br/>งาน: ${d.value} งาน`;
      },
    },
    grid: { left: 120, right: 40, top: 10, bottom: 30 },
    xAxis: {
      type: "value",
      axisLabel: { fontSize: 11 },
    },
    yAxis: {
      type: "category",
      data: sorted.map(u => u.displayName),
      axisLabel: { fontSize: 11, width: 100, overflow: "truncate" },
    },
    series: [
      {
        type: "bar",
        data: sorted.map(u => u.taskCount),
        itemStyle: {
          color: "var(--color-primary)",
          borderRadius: [0, 4, 4, 0],
        },
        barMaxWidth: 24,
      },
    ],
  };
});

// Fetch all dashboard data
async function fetchDashboardData() {
  loading.value = true;
  error.value = null;
  try {
    const fy = selectedFY.value;
    const [statsData, chartData, projectsData, workload, kpis] = await Promise.all([
      dashboardService.getStats(fy),
      dashboardService.getTaskChart(fy),
      dashboardService.getProjects(fy),
      dashboardService.getWorkload(fy),
      dashboardService.getKpi(fy),
    ]);
    stats.value = statsData;
    taskChart.value = chartData;
    projectData.value = projectsData;
    workloadData.value = workload;
    kpiData.value = kpis;
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || "เกิดข้อผิดพลาด";
    console.error("Dashboard fetch error:", e);
  } finally {
    loading.value = false;
  }
}

// Watch fiscal year changes
watch(selectedFY, () => {
  fetchDashboardData();
});

onMounted(() => {
  fetchDashboardData();
});
</script>

<template>
  <NSpin :show="loading">
    <div class="dashboard">
      <PageHeader title="แดชบอร์ด" :subtitle="fyLabel">
        <template #actions>
          <NSelect
            v-model:value="selectedFY"
            :options="fyOptions"
            size="small"
            style="width: 140px"
          />
        </template>
      </PageHeader>

      <!-- Error message -->
      <div v-if="error" class="error-banner">
        <NText>{{ error }}</NText>
        <NButton size="small" @click="fetchDashboardData">ลองใหม่</NButton>
      </div>

      <!-- Stat Cards -->
      <NGrid :cols="4" :x-gap="16" :y-gap="16" responsive="screen" item-responsive>
        <NGi v-for="stat in statCards" :key="stat.label" span="4 m:2 l:1">
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

      <!-- Middle Section: Charts -->
      <NGrid :cols="2" :x-gap="16" :y-gap="16" responsive="screen" item-responsive>
        <!-- Task Priority Pie Chart -->
        <NGi span="2 l:1">
          <NCard class="section-card" :bordered="false">
            <template #header>
              <NText class="section-title">สถานะงานตามความสำคัญ</NText>
            </template>
            <div v-if="taskChart && taskChart.byPriority.length > 0" class="chart-container">
              <VChart :option="priorityChartOption" autoresize style="height: 260px" />
            </div>
            <div v-else class="empty-chart">
              <NText depth="3">ไม่มีข้อมูล</NText>
            </div>
          </NCard>
        </NGi>

        <!-- Workload Bar Chart -->
        <NGi span="2 l:1">
          <NCard class="section-card" :bordered="false">
            <template #header>
              <NText class="section-title">ภาระงานตามผู้รับผิดชอบ</NText>
            </template>
            <div v-if="workloadData && workloadData.users.length > 0" class="chart-container">
              <VChart :option="workloadChartOption" autoresize style="height: 260px" />
            </div>
            <div v-else class="empty-chart">
              <NText depth="3">ไม่มีข้อมูล</NText>
            </div>
          </NCard>
        </NGi>
      </NGrid>

      <!-- Projects Progress -->
      <NCard class="section-card" :bordered="false">
        <template #header>
          <NText class="section-title">ความก้าวหน้าโครงการ</NText>
        </template>
        <div v-if="projectData && projectData.projects.length > 0" class="project-list">
          <div v-for="project in projectData.projects" :key="project.id" class="project-row">
            <div class="project-info">
              <div class="project-dot" :style="{ background: 'var(--color-primary)' }" />
              <div>
                <div class="project-name">{{ project.name }}</div>
                <NText depth="3" class="project-stat">{{ project.status }}</NText>
              </div>
            </div>
            <div class="project-progress-wrap">
              <NProgress
                type="line"
                :percentage="project.progress"
                :show-indicator="true"
                :height="8"
                :border-radius="4"
                :fill-border-radius="4"
                style="width: 160px"
              />
            </div>
          </div>
        </div>
        <div v-else class="empty-chart">
          <NText depth="3">ไม่มีข้อมูลโครงการ</NText>
        </div>
      </NCard>

      <!-- KPI Achievement -->
      <NCard class="section-card" :bordered="false">
        <template #header>
          <NText class="section-title">ผลความสำเร็จ KPI</NText>
        </template>
        <div v-if="kpiData && kpiData.kpis.length > 0" class="kpi-grid">
          <div v-for="kpi in kpiData.kpis" :key="kpi.name" class="kpi-card">
            <div class="kpi-header">
              <NText class="kpi-name">{{ kpi.name }}</NText>
              <NText class="kpi-achievement" :style="{ color: kpi.achievement >= 100 ? 'var(--color-success)' : kpi.achievement >= 50 ? 'var(--color-warning)' : 'var(--color-error)' }">
                {{ kpi.achievement }}%
              </NText>
            </div>
            <div class="kpi-progress">
              <NProgress
                type="line"
                :percentage="Math.min(kpi.achievement, 100)"
                :show-indicator="false"
                :height="6"
                :border-radius="3"
                :fill-border-radius="3"
              />
            </div>
            <div class="kpi-values">
              <NText depth="3">{{ kpi.current.toLocaleString() }} / {{ kpi.target.toLocaleString() }} {{ kpi.unit }}</NText>
            </div>
          </div>
        </div>
        <div v-else class="empty-chart">
          <NText depth="3">ไม่มีข้อมูล KPI</NText>
        </div>
      </NCard>

      <!-- Task by Status breakdown -->
      <NCard v-if="stats && Object.keys(stats.byStatus).length > 0" class="section-card" :bordered="false">
        <template #header>
          <NText class="section-title">สถานะงานทั้งหมด</NText>
        </template>
        <div class="status-grid">
          <div v-for="(count, status) in stats.byStatus" :key="status" class="status-item">
            <div class="status-name">{{ status }}</div>
            <div class="status-count">{{ count }}</div>
          </div>
        </div>
      </NCard>
    </div>
  </NSpin>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.error-banner {
  padding: var(--space-md);
  background: var(--color-error-bg);
  border-radius: var(--radius-md);
  display: flex;
  justify-content: space-between;
  align-items: center;
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

/* ── Chart ── */
.chart-container {
  padding: var(--space-sm) 0;
}

.empty-chart {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

/* ── Project List ── */
.project-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

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

.project-progress-wrap {
  flex-shrink: 0;
}

/* ── KPI Grid ── */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-md);
}

.kpi-card {
  padding: var(--space-md);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-light);
}

.kpi-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-sm);
}

.kpi-name {
  font-size: var(--text-sm);
  font-weight: 500;
  flex: 1;
}

.kpi-achievement {
  font-size: var(--text-lg);
  font-weight: 700;
}

.kpi-progress {
  margin-bottom: var(--space-xs);
}

.kpi-values {
  font-size: var(--text-xs);
}

/* ── Status Grid ── */
.status-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-md);
}

.status-item {
  padding: var(--space-sm) var(--space-md);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-light);
  min-width: 120px;
}

.status-name {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-xs);
}

.status-count {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--color-text);
}

/* ── Mobile Responsive ── */
@media (max-width: 767px) {
  .project-row {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-sm);
  }

  .project-progress-wrap {
    width: 100%;
  }

  .project-progress-wrap :deep(.n-progress) {
    width: 100% !important;
  }
}
</style>