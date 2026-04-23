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
  NTag,
} from "naive-ui";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { PieChart, BarChart, LineChart } from "echarts/charts";
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
  AlertCircleOutline,
} from "@vicons/ionicons5";
import { useFiscalYear } from "@/composables/useFiscalYear";
import { useWorkspaceStore, ALL_WORKSPACES_ID } from "@/stores/workspace";
import {
  dashboardService,
  type DashboardStats,
  type TaskChartData,
  type ProjectProgress,
  type WorkloadData,
  type KpiData,
  type OverdueTask,
  type MonthlyTrendItem,
  type DeadlineHeatmapItem,
  type MonthlyStatusBreakdownItem,
} from "@/services/dashboard";
import { formatThaiDate } from "@/utils/thai";
import PageHeader from "@/components/common/PageHeader.vue";

use([
  CanvasRenderer,
  PieChart,
  BarChart,
  LineChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
]);

const { selectedFY, fyLabel, fyOptions } = useFiscalYear();
const workspaceStore = useWorkspaceStore();

// Convert __ALL__ or null to null for API calls (both mean "all workspaces")
const workspaceIdForApi = computed(() => {
  const id = workspaceStore.currentWorkspaceId;
  return (id === ALL_WORKSPACES_ID || id === null) ? null : id;
});

// Map status type to color
const STATUS_TYPE_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  in_progress: '#3b82f6',
  review: '#8b5cf6',
  completed: '#10b981',
};

const STATUS_TYPE_LABELS: Record<string, string> = {
  pending: 'รอทำ',
  in_progress: 'อยู่ระหว่างทำ',
  review: 'อยู่ระหว่างตรวจ',
  completed: 'เสร็จสิ้น',
};

const PROJECT_STATUS_COLORS: Record<string, string> = {
  planning: "#f59e0b",
  active: "#3b82f6",
  on_hold: "#6b7280",
  completed: "#10b981",
  cancelled: "#ef4444",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f59e0b",
  normal: "#3b82f6",
  low: "#6b7280",
};

// Workspace color palette for pie charts
const WORKSPACE_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1",
];

// Loading state
const loading = ref(false);
const error = ref<string | null>(null);

// Dashboard data
const stats = ref<DashboardStats | null>(null);
const taskChart = ref<TaskChartData | null>(null);
const projectData = ref<ProjectProgress | null>(null);
const workloadData = ref<WorkloadData | null>(null);
const kpiData = ref<KpiData | null>(null);
const overdueData = ref<{ count: number; tasks: OverdueTask[] } | null>(null);
const trendData = ref<MonthlyTrendItem[] | null>(null);
const deadlineData = ref<DeadlineHeatmapItem[] | null>(null);
const statusBreakdownData = ref<MonthlyStatusBreakdownItem[] | null>(null);

// Stat cards derived from API data
const statCards = computed(() => {
  if (!stats.value) return [];
  const s = stats.value;
  const successRate = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
  const cards = [
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

  // Add overdue card if available
  if (overdueData.value) {
    cards.push({
      label: "เลยกำหนด",
      value: overdueData.value.count,
      icon: AlertCircleOutline,
      color: "var(--color-error)",
      bg: "var(--color-error-bg)",
      trend: `${overdueData.value.tasks.length} งานที่ต้องติดตาม`,
      trendUp: false,
    });
  }

  return cards;
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
            color: ["#ef4444", "#f59e0b", "#3b82f6", "#6b7280"][i],
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

// Workspace breakdown pie chart option
const workspaceChartOption = computed(() => {
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
        data: taskChart.value.byWorkspace.map((item, i) => ({
          value: item.value,
          name: item.label,
          itemStyle: {
            color: WORKSPACE_COLORS[i % WORKSPACE_COLORS.length],
          },
        })),
      },
    ],
  };
});

// Status distribution pie chart option
const statusChartOption = computed(() => {
  if (!taskChart.value) return {};
  const entries = taskChart.value.byStatusType;

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
          formatter: "{b}: {c}",
        },
        data: entries,
      },
    ],
  };
});

// Monthly trend line chart option
const trendChartOption = computed(() => {
  if (!trendData.value || trendData.value.length === 0) return {};
  return {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "line" },
      formatter: (params: any) => {
        const month = params[0].name;
        let result = `${month}<br/>`;
        params.forEach((p: any) => {
          result += `${p.marker} ${p.seriesName}: ${p.value} งาน<br/>`;
        });
        return result;
      },
    },
    legend: {
      orient: "horizontal",
      bottom: 0,
      textStyle: { fontSize: 12 },
    },
    grid: { left: 50, right: 20, top: 20, bottom: 40 },
    xAxis: {
      type: "category",
      data: trendData.value.map(t => t.month),
      axisLabel: { fontSize: 11 },
    },
    yAxis: {
      type: "value",
      axisLabel: { fontSize: 11 },
    },
    series: [
      {
        name: "งานใหม่",
        type: "line",
        data: trendData.value.map(t => t.created),
        itemStyle: { color: "var(--color-primary)" },
        lineStyle: { width: 2 },
        smooth: true,
        areaStyle: {
          color: {
            type: "linear",
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(59, 130, 246, 0.3)" },
              { offset: 1, color: "rgba(59, 130, 246, 0.05)" },
            ],
          },
        },
      },
      {
        name: "งานเสร็จ",
        type: "line",
        data: trendData.value.map(t => t.completed),
        itemStyle: { color: "var(--color-success)" },
        lineStyle: { width: 2 },
        smooth: true,
        areaStyle: {
          color: {
            type: "linear",
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(16, 185, 129, 0.3)" },
              { offset: 1, color: "rgba(16, 185, 129, 0.05)" },
            ],
          },
        },
      },
    ],
  };
});

// Status breakdown bar chart option
const statusBreakdownChartOption = computed(() => {
  if (!statusBreakdownData.value || statusBreakdownData.value.length === 0) return {};
  const groups = ['รอทำ', 'อยู่ระหว่างทำ', 'อยู่ระหว่างตรวจ', 'เสร็จสิ้น'];
  const colors = ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'];
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        let result = params[0].name + '<br/>';
        params.forEach((p: any) => {
          result += `${p.marker} ${p.seriesName}: ${p.value} งาน<br/>`;
        });
        return result;
      },
    },
    legend: { orient: 'horizontal', bottom: 0, textStyle: { fontSize: 12 } },
    grid: { left: 80, right: 40, top: 10, bottom: 40 },
    xAxis: {
      type: 'category',
      data: statusBreakdownData.value.map(d => d.month),
      axisLabel: { fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 11 },
    },
    series: groups.map((name, i) => ({
      name,
      type: 'bar',
      data: statusBreakdownData.value!.map(d => d.statuses[i]?.count || 0),
      itemStyle: { color: colors[i], borderRadius: [4, 4, 0, 0] },
      barMaxWidth: 32,
    })),
  };
});
const deadlineChartOption = computed(() => {
  if (!deadlineData.value || deadlineData.value.length === 0) return {};
  return {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: any) => {
        const d = params[0];
        return `${d.name}<br/>งาน: ${d.value} งาน`;
      },
    },
    grid: { left: 80, right: 40, top: 10, bottom: 30 },
    xAxis: {
      type: "value",
      axisLabel: { fontSize: 11 },
    },
    yAxis: {
      type: "category",
      data: deadlineData.value.map(d => d.month).reverse(),
      axisLabel: { fontSize: 11 },
    },
    series: [
      {
        type: "bar",
        data: deadlineData.value.map(d => d.count).reverse(),
        itemStyle: {
          color: {
            type: "linear",
            x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: "#fbbf24" },
              { offset: 1, color: "#ef4444" },
            ],
          },
          borderRadius: [0, 4, 4, 0],
        },
        barMaxWidth: 24,
        label: {
          show: true,
          position: "right",
          formatter: "{c}",
          fontSize: 11,
        },
      },
    ],
  };
});

// Get project status color
function getProjectStatusColor(status: string): string {
  return PROJECT_STATUS_COLORS[status.toLowerCase()] || "var(--color-primary)";
}

// Get priority color
function getPriorityColor(priority: string): string {
  return PRIORITY_COLORS[priority.toLowerCase()] || "var(--color-primary)";
}

// Format overdue due date
function formatOverdueDate(dateStr: string): string {
  return formatThaiDate(dateStr);
}

// Fetch all dashboard data
async function fetchDashboardData() {
  loading.value = true;
  error.value = null;
  try {
    const fy = selectedFY.value;
    const wsId = workspaceIdForApi.value;
    const [statsData, chartData, projectsData, workload, kpis, overdue, trend, deadline, statusBreakdown] = await Promise.all([
      dashboardService.getStats(fy, wsId),
      dashboardService.getTaskChart(fy, wsId),
      dashboardService.getProjects(fy, wsId),
      dashboardService.getWorkload(fy, wsId),
      dashboardService.getKpi(fy, wsId),
      dashboardService.getOverdue(fy, wsId),
      dashboardService.getTrend(fy, wsId),
      dashboardService.getDeadlineHeatmap(fy, wsId),
      dashboardService.getMonthlyStatusBreakdown(fy, wsId),
    ]);
    stats.value = statsData;
    taskChart.value = chartData;
    projectData.value = projectsData;
    workloadData.value = workload;
    kpiData.value = kpis;
    overdueData.value = overdue?.overdue ?? null;
    trendData.value = trend?.monthlyTrend ?? null;
    deadlineData.value = deadline?.deadlineHeatmap ?? null;
    statusBreakdownData.value = statusBreakdown?.monthlyStatusBreakdown ?? null;
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || "เกิดข้อผิดพลาด";
    console.error("Dashboard fetch error:", e);
  } finally {
    loading.value = false;
  }
}

// Watch fiscal year and workspace changes
watch([selectedFY, () => workspaceStore.currentWorkspaceId], () => {
  fetchDashboardData();
});

onMounted(async () => {
  await workspaceStore.fetchWorkspaces();
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
      <NGrid :cols="4" :x-gap="12" :y-gap="12" responsive="screen" item-responsive>
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
                  <NIcon :size="14" :color="stat.trendUp ? 'var(--color-success)' : 'var(--color-error)'">
                    <TrendingUpOutline />
                  </NIcon>
                  <NText depth="3" class="stat-trend-text">{{ stat.trend }}</NText>
                </div>
              </div>
            </div>
          </NCard>
        </NGi>
      </NGrid>

      <!-- Overdue Tasks Section -->
      <NCard v-if="overdueData && overdueData.tasks.length > 0" class="section-card" :bordered="false">
        <template #header>
          <NText class="section-title">งานเลยกำหนด</NText>
        </template>
        <div class="overdue-list">
          <div v-for="task in overdueData.tasks.slice(0, 5)" :key="task.id" class="overdue-item">
            <div class="overdue-info">
              <div class="overdue-title">{{ task.title }}</div>
              <div class="overdue-meta">
                <NText depth="3" class="overdue-workspace">{{ task.workspaceName }}</NText>
                <NTag
                  size="small"
                  :color="{ color: getPriorityColor(task.priority), textColor: '#fff' }"
                >
                  {{ task.priority }}
                </NTag>
              </div>
            </div>
            <div class="overdue-date">
              <NText depth="3">{{ formatOverdueDate(task.dueDate) }}</NText>
            </div>
          </div>
        </div>
      </NCard>

      <!-- Monthly Status Breakdown Bar Chart -->
      <NCard class="section-card" :bordered="false">
        <template #header>
          <NText class="section-title">จำนวนงานรายเดือนตามสถานะ</NText>
        </template>
        <div v-if="statusBreakdownData && statusBreakdownData.length > 0" class="chart-container">
          <VChart :option="statusBreakdownChartOption" autoresize style="height: 260px" />
        </div>
        <div v-else class="empty-chart">
          <NText depth="3">ไม่มีข้อมูล</NText>
        </div>
      </NCard>

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

      <!-- Workspace & Status Pie Charts -->
      <NGrid :cols="2" :x-gap="16" :y-gap="16" responsive="screen" item-responsive>
        <!-- Workspace Breakdown Pie Chart -->
        <NGi span="2 l:1">
          <NCard class="section-card" :bordered="false">
            <template #header>
              <NText class="section-title">งานตามพื้นที่</NText>
            </template>
            <div v-if="taskChart && taskChart.byWorkspace.length > 0" class="chart-container">
              <VChart :option="workspaceChartOption" autoresize style="height: 260px" />
            </div>
            <div v-else class="empty-chart">
              <NText depth="3">ไม่มีข้อมูล</NText>
            </div>
          </NCard>
        </NGi>

        <!-- Status Distribution Pie Chart -->
        <NGi span="2 l:1">
          <NCard class="section-card" :bordered="false">
            <template #header>
              <NText class="section-title">สถานะงาน</NText>
            </template>
            <div v-if="taskChart && taskChart.byStatusType.length > 0" class="chart-container">
              <VChart :option="statusChartOption" autoresize style="height: 260px" />
            </div>
            <div v-else class="empty-chart">
              <NText depth="3">ไม่มีข้อมูล</NText>
            </div>
          </NCard>
        </NGi>
      </NGrid>

      <!-- Monthly Trend Line Chart -->
      <NCard class="section-card" :bordered="false">
        <template #header>
          <NText class="section-title">แนวโน้มงานรายเดือน</NText>
        </template>
        <div v-if="trendData && trendData.length > 0" class="chart-container">
          <VChart :option="trendChartOption" autoresize style="height: 260px" />
        </div>
        <div v-else class="empty-chart">
          <NText depth="3">ไม่มีข้อมูล</NText>
        </div>
      </NCard>

      <!-- Deadline Heatmap Bar Chart -->
      <NCard class="section-card" :bordered="false">
        <template #header>
          <NText class="section-title">กำหนดส่งงานรายเดือน</NText>
        </template>
        <div v-if="deadlineData && deadlineData.length > 0" class="chart-container">
          <VChart :option="deadlineChartOption" autoresize style="height: 260px" />
        </div>
        <div v-else class="empty-chart">
          <NText depth="3">ไม่มีข้อมูล</NText>
        </div>
      </NCard>

      <!-- Projects Progress -->
      <NCard class="section-card" :bordered="false">
        <template #header>
          <NText class="section-title">ความก้าวหน้าโครงการ</NText>
        </template>
        <div v-if="projectData && projectData.projects.length > 0" class="project-list">
          <div v-for="project in projectData.projects" :key="project.id" class="project-row">
            <div class="project-info">
              <div class="project-dot" :style="{ background: getProjectStatusColor(project.status) }" />
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
      <NCard v-if="stats && Object.keys(stats.byStatusType).length > 0" class="section-card" :bordered="false">
        <template #header>
          <NText class="section-title">สถานะงานทั้งหมด</NText>
        </template>
        <div class="status-grid">
          <div v-for="(count, statusType) in stats.byStatusType" :key="statusType" class="status-item">
            <div class="status-dot" :style="{ background: STATUS_TYPE_COLORS[statusType] || '#6b7280' }" />
            <div class="status-name">{{ STATUS_TYPE_LABELS[statusType] || statusType }}</div>
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

/* ── Overdue List ── */
.overdue-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.overdue-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-sm) var(--space-md);
  background: var(--color-error-bg);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--color-error);
}

.overdue-info {
  flex: 1;
  min-width: 0;
}

.overdue-title {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.overdue-meta {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-top: var(--space-xs);
}

.overdue-workspace {
  font-size: var(--text-xs);
}

.overdue-date {
  flex-shrink: 0;
  color: var(--color-error);
  font-size: var(--text-sm);
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
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-light);
  min-width: 120px;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-name {
  flex: 1;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
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

  .overdue-item {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-sm);
  }

  .overdue-date {
    align-self: flex-end;
  }
}
</style>