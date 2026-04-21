<script setup lang="ts">
import { ref, computed, h } from "vue";
import {
  NCard,
  NDataTable,
  NButton,
  NIcon,
  NSelect,
  NSpace,
  NInput,
  NTag,
  NText,
  NSpin,
  NTabPane,
  NTabs,
} from "naive-ui";
import {
  AddCircleOutline,
  FilterOutline,
  GridOutline,
  ListOutline,
  CalendarOutline,
} from "@vicons/ionicons5";
import { useRouter } from "vue-router";
import type { DataTableColumns } from "naive-ui";
import PageHeader from "@/components/common/PageHeader.vue";

const router = useRouter();
const loading = ref(false);
const activeTab = ref("list");
const statusFilter = ref<string | null>(null);
const priorityFilter = ref<string | null>(null);

const PRIORITY_CONFIG: Record<string, { label: string, color: string, bg: string }> = {
  urgent: { label: "เร่งด่วน", color: "var(--color-priority-urgent)", bg: "var(--color-priority-urgent-bg)" },
  high: { label: "สูง", color: "var(--color-priority-high)", bg: "var(--color-priority-high-bg)" },
  normal: { label: "ปกติ", color: "var(--color-priority-normal)", bg: "var(--color-priority-normal-bg)" },
  low: { label: "ต่ำ", color: "var(--color-priority-low)", bg: "var(--color-priority-low-bg)" },
};

const STATUS_CONFIG: Record<string, { label: string, color: string, bg: string }> = {
  in_progress: { label: "กำลังดำเนินการ", color: "var(--color-primary)", bg: "var(--color-primary-bg)" },
  pending: { label: "รอดำเนินการ", color: "var(--color-warning)", bg: "var(--color-warning-bg)" },
  completed: { label: "เสร็จสิ้น", color: "var(--color-success)", bg: "var(--color-success-bg)" },
  on_hold: { label: "ระงับชั่วคราว", color: "var(--color-text-secondary)", bg: "var(--color-surface-variant)" },
};

interface Task {
  id: string
  key: string
  title: string
  project: string
  status: string
  priority: string
  assignee: string
  dueDate: string
}

const mockTasks: Task[] = [
  { id: "1", key: "TP-001", title: "จัดเตรียมเอกสารสัญญาเช่า", project: "เช่าพื้นที่", status: "in_progress", priority: "urgent", assignee: "สมชาย", dueDate: "22 เม.ย. 2569" },
  { id: "2", key: "TP-002", title: "ติดตามผลการอบรม AI Workshop", project: "อบรม/สัมนา", status: "pending", priority: "high", assignee: "วิภา", dueDate: "25 เม.ย. 2569" },
  { id: "3", key: "TP-003", title: "ประเมินผลโครงการบ่มเพาะฯ Q2", project: "บ่มเพาะสตาร์ทอัป", status: "in_progress", priority: "normal", assignee: "ประเสริฐ", dueDate: "30 เม.ย. 2569" },
  { id: "4", key: "TP-004", title: "จัดทำรายงานให้คำปรึกษาภาคเรียน 2", project: "ที่ปรึกษา/วิจัย", status: "pending", priority: "low", assignee: "สุนีย์", dueDate: "15 พ.ค. 2569" },
  { id: "5", key: "TP-005", title: "อัปเดตแผนปฏิบัติการ Q3", project: "แผนปฏิบัติการ", status: "in_progress", priority: "high", assignee: "สมชาย", dueDate: "28 เม.ย. 2569" },
  { id: "6", key: "TP-006", title: "ตรวจสอบสัญญาเช่าห้อง 201-210", project: "เช่าพื้นที่", status: "completed", priority: "normal", assignee: "วิภา", dueDate: "18 เม.ย. 2569" },
  { id: "7", key: "TP-007", title: "จัดหาวิทยากร Data Science", project: "อบรม/สัมนา", status: "on_hold", priority: "normal", assignee: "ประเสริฐ", dueDate: "10 พ.ค. 2569" },
  { id: "8", key: "TP-008", title: "สรุปผลการให้คำปรึกษา SME", project: "ที่ปรึกษา/วิจัย", status: "completed", priority: "high", assignee: "สุนีย์", dueDate: "15 เม.ย. 2569" },
];

const statusOptions = [
  { label: "ทั้งหมด", value: "" },
  { label: "กำลังดำเนินการ", value: "in_progress" },
  { label: "รอดำเนินการ", value: "pending" },
  { label: "เสร็จสิ้น", value: "completed" },
  { label: "ระงับชั่วคราว", value: "on_hold" },
];

const priorityOptions = [
  { label: "ทุกระดับ", value: "" },
  { label: "เร่งด่วน", value: "urgent" },
  { label: "สูง", value: "high" },
  { label: "ปกติ", value: "normal" },
  { label: "ต่ำ", value: "low" },
];

const filteredTasks = computed(() => {
  return mockTasks.filter((t) => {
    if (statusFilter.value && t.status !== statusFilter.value) return false;
    if (priorityFilter.value && t.priority !== priorityFilter.value) return false;
    return true;
  });
});

const columns: DataTableColumns<Task> = [
  { title: "รหัส", key: "key", width: 90, render: (row) => h("span", { style: "font-family: monospace; font-size: var(--text-xs); color: var(--color-text-secondary)" }, row.key) },
  {
    title: "งาน",
    key: "title",
    render: (row) =>
      h("div", { style: "min-width: 200px" }, [
        h("div", { style: "font-weight: 500" }, row.title),
        h("span", { style: "font-size: var(--text-xs); color: var(--color-text-secondary)" }, row.project),
      ]),
  },
  {
    title: "สถานะ",
    key: "status",
    width: 150,
    render: (row) => {
      const cfg = STATUS_CONFIG[row.status];
      return h("span", {
        style: `font-size: var(--text-xs); padding: 2px 10px; border-radius: var(--radius-full); font-weight: 500; color: ${cfg?.color}; background: ${cfg?.bg}`,
      }, cfg?.label);
    },
  },
  {
    title: "ความสำคัญ",
    key: "priority",
    width: 110,
    render: (row) => {
      const cfg = PRIORITY_CONFIG[row.priority];
      return h("span", {
        style: `font-size: var(--text-xs); padding: 2px 10px; border-radius: var(--radius-full); font-weight: 500; color: ${cfg?.color}; background: ${cfg?.bg}`,
      }, cfg?.label);
    },
  },
  { title: "ผู้รับผิดชอบ", key: "assignee", width: 120 },
  { title: "กำหนดส่ง", key: "dueDate", width: 130 },
];

</script>

<template>
  <NSpin :show="loading">
    <div class="task-list-page">
      <PageHeader title="งานทั้งหมด" :subtitle="`${filteredTasks.length} งาน`">
        <template #actions>
          <NButton type="primary">
            <template #icon>
              <NIcon><AddCircleOutline /></NIcon>
            </template>
            สร้างงาน
          </NButton>
        </template>
      </PageHeader>

      <!-- View Tabs -->
      <NTabs v-model:value="activeTab" type="segment" class="view-tabs">
        <NTabPane name="list">
          <template #tab>
            <div class="tab-label">
              <NIcon :size="16"><ListOutline /></NIcon>
              รายการ
            </div>
          </template>
        </NTabPane>
        <NTabPane name="board">
          <template #tab>
            <div class="tab-label">
              <NIcon :size="16"><GridOutline /></NIcon>
              บอร์ด
            </div>
          </template>
        </NTabPane>
        <NTabPane name="calendar">
          <template #tab>
            <div class="tab-label">
              <NIcon :size="16"><CalendarOutline /></NIcon>
              ปฏิทิน
            </div>
          </template>
        </NTabPane>
      </NTabs>

      <!-- Filters -->
      <NCard class="filter-card" :bordered="false">
        <div class="filter-row">
          <NIcon :size="18" color="var(--color-text-tertiary)" class="filter-icon"><FilterOutline /></NIcon>
          <NSelect
            v-model:value="statusFilter"
            :options="statusOptions"
            placeholder="สถานะ"
            size="small"
            class="filter-select"
            clearable
          />
          <NSelect
            v-model:value="priorityFilter"
            :options="priorityOptions"
            placeholder="ความสำคัญ"
            size="small"
            class="filter-select"
            clearable
          />
          <NInput placeholder="ค้นหางาน..." size="small" class="filter-search" clearable />
        </div>
      </NCard>

      <!-- Task Table -->
      <NCard class="table-card" :bordered="false">
        <NDataTable
          :columns="columns"
          :data="filteredTasks"
          :bordered="false"
          :single-line="false"
          :row-key="(row: Task) => row.id"
          :scroll-x="800"
          size="small"
        />
      </NCard>
    </div>
  </NSpin>
</template>

<style scoped>
.task-list-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.view-tabs {
  margin-bottom: var(--space-xs);
}

.tab-label {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.filter-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xs);
}

.filter-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.filter-icon {
  flex-shrink: 0;
}

.filter-select {
  width: 160px;
}

.filter-search {
  width: 220px;
}

.table-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

@media (max-width: 767px) {
  .page-title {
    font-size: var(--text-xl);
  }

  .filter-icon {
    display: none;
  }

  .filter-select,
  .filter-search {
    width: 100%;
  }
}
</style>
