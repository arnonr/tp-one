<script setup lang="ts">
import { ref, h } from "vue";
import {
  NCard,
  NDataTable,
  NButton,
  NIcon,
  NSelect,
  NSpace,
  NText,
  NSpin,
  NTag,
  NProgress,
} from "naive-ui";
import {
  AddCircleOutline,
  FilterOutline,
  EyeOutline,
} from "@vicons/ionicons5";
import { useRouter } from "vue-router";
import { useFiscalYear } from "@/composables/useFiscalYear";
import type { DataTableColumns } from "naive-ui";

const router = useRouter();
const loading = ref(false);
const { fyLabel, fyOptions, selectedFY } = useFiscalYear();

interface Plan {
  id: string
  name: string
  category: string
  status: string
  indicatorCount: number
  progress: number
  owner: string
  fiscalYear: number
}

const STATUS_CONFIG: Record<string, { label: string, type: "success" | "warning" | "info" | "default" }> = {
  active: { label: "กำลังดำเนินการ", type: "info" },
  draft: { label: "ร่าง", type: "warning" },
  completed: { label: "เสร็จสิ้น", type: "success" },
};

const plans: Plan[] = [
  { id: "1", name: "แผนปฏิบัติการบริการเช่าพื้นที่ 2569", category: "เช่าพื้นที่", status: "active", indicatorCount: 12, progress: 65, owner: "สมชาย", fiscalYear: 2569 },
  { id: "2", name: "แผนปฏิบัติการให้คำปรึกษา 2569", category: "ที่ปรึกษา/วิจัย", status: "active", indicatorCount: 8, progress: 50, owner: "สุนีย์", fiscalYear: 2569 },
  { id: "3", name: "แผนปฏิบัติการอบรมสัมนา 2569", category: "อบรม/สัมนา", status: "active", indicatorCount: 10, progress: 40, owner: "วิภา", fiscalYear: 2569 },
  { id: "4", name: "แผนปฏิบัติการบ่มเพาะสตาร์ทอัป 2569", category: "บ่มเพาะสตาร์ทอัป", status: "active", indicatorCount: 15, progress: 72, owner: "ประเสริฐ", fiscalYear: 2569 },
  { id: "5", name: "แผนปฏิบัติการบริการเช่าพื้นที่ 2568", category: "เช่าพื้นที่", status: "completed", indicatorCount: 12, progress: 100, owner: "สมชาย", fiscalYear: 2568 },
];

const columns: DataTableColumns<Plan> = [
  {
    title: "แผนปฏิบัติการ",
    key: "name",
    render: (row) =>
      h("div", { style: "min-width: 250px" }, [
        h("div", { style: "font-weight: 500; color: var(--color-text)" }, row.name),
        h("span", { style: "font-size: var(--text-xs); color: var(--color-text-secondary)" }, row.category),
      ]),
  },
  {
    title: "สถานะ",
    key: "status",
    width: 150,
    render: (row) => {
      const cfg = STATUS_CONFIG[row.status];
      return h(NTag, { bordered: false, size: "small", type: cfg?.type || "default" }, { default: () => cfg?.label || row.status });
    },
  },
  {
    title: "ตัวชี้วัด",
    key: "indicatorCount",
    width: 100,
    render: (row) => h("span", { style: "font-weight: 500" }, `${row.indicatorCount} ตัว`),
  },
  {
    title: "ความคืบหน้า",
    key: "progress",
    width: 180,
    render: (row) =>
      h("div", { style: "display: flex; align-items: center; gap: 8px" }, [
        h(NProgress, { type: "line", percentage: row.progress, height: 6, borderRadius: 3, showIndicator: false, style: "flex: 1" }),
        h("span", { style: "font-size: var(--text-xs); font-weight: 600; color: var(--color-primary); min-width: 36px; text-align: right" }, `${row.progress}%`),
      ]),
  },
  {
    title: "ผู้รับผิดชอบ",
    key: "owner",
    width: 120,
  },
  {
    title: "",
    key: "actions",
    width: 50,
    render: (row) =>
      h(NButton, {
        text: true,
        size: "small",
        type: "primary",
        onClick: () => router.push({ name: "plan-detail", params: { id: row.id } }),
      }, { icon: () => h(NIcon, null, { default: () => h(EyeOutline) }) }),
  },
];
</script>

<template>
  <NSpin :show="loading">
    <div class="plan-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">แผนปฏิบัติการรายปี</h1>
          <NText depth="3" class="page-subtitle">{{ fyLabel }} — {{ plans.length }} แผน</NText>
        </div>
        <NButton type="primary">
          <template #icon>
            <NIcon><AddCircleOutline /></NIcon>
          </template>
          สร้างแผนใหม่
        </NButton>
      </div>

      <!-- Filters -->
      <NCard class="filter-card" :bordered="false">
        <NSpace :size="12" align="center">
          <NIcon :size="18" color="var(--color-text-tertiary)"><FilterOutline /></NIcon>
          <NSelect v-model:value="selectedFY" :options="fyOptions" size="small" style="width: 160px" />
        </NSpace>
      </NCard>

      <!-- Plan Table -->
      <NCard class="table-card" :bordered="false">
        <NDataTable
          :columns="columns"
          :data="plans"
          :bordered="false"
          :single-line="false"
          :row-key="(row: Plan) => row.id"
          size="small"
        />
      </NCard>
    </div>
  </NSpin>
</template>

<style scoped>
.plan-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
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

.filter-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xs);
}

.table-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}
</style>
