<script setup lang="ts">
import { ref, h, computed, onMounted } from "vue";
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
  NModal,
  NForm,
  NFormItem,
  NInput,
  NTabs,
  NTabPane,
  NStatistic,
  useMessage,
} from "naive-ui";
import {
  AddCircleOutline,
  FilterOutline,
  EyeOutline,
  CreateOutline,
  TrashOutline,
} from "@vicons/ionicons5";
import { useRouter } from "vue-router";
import { useFiscalYear } from "@/composables/useFiscalYear";
import PageHeader from "@/components/common/PageHeader.vue";
import PlanOverviewCharts from "@/components/plan/PlanOverviewCharts.vue";
import { getPlanProgress } from "@/services/planApi";
import type { PlanProgress } from "@/types/plan";
import { listPlans, createPlan, updatePlan, deletePlan, type PlanListItem } from "@/services/plan";
import type { DataTableColumns } from "naive-ui";

const router = useRouter();
const message = useMessage();
const loading = ref(false);
const { fyLabel, fyOptions, selectedFY } = useFiscalYear();

const plans = ref<PlanListItem[]>([]);
const progressMap = ref<Map<string, PlanProgress>>(new Map());
const showModal = ref(false);
const modalLoading = ref(false);
const formData = ref({ year: selectedFY.value, name: "", description: "" });
const showEditModal = ref(false);
const editingPlan = ref<PlanListItem | null>(null);
const editForm = ref({ name: "", description: "", status: "" as "" | "draft" | "active" | "completed" });
const activeTab = ref("overview");

const STATUS_CONFIG: Record<string, { label: string; type: "success" | "warning" | "info" | "default" }> = {
  active: { label: "กำลังดำเนินการ", type: "info" },
  draft: { label: "ร่าง", type: "warning" },
  completed: { label: "เสร็จสิ้น", type: "success" },
};

const stats = computed(() => {
  const total = plans.value.length;
  const active = plans.value.filter(p => p.status === "active").length;
  const completed = plans.value.filter(p => p.status === "completed").length;
  const progressValues = Array.from(progressMap.value.values());
  const avgProgress = progressValues.length > 0
    ? Math.round(progressValues.reduce((sum, p) => sum + p.overallProgress, 0) / progressValues.length)
    : 0;
  return { total, active, completed, avgProgress };
});

function getPlanProgressPct(planId: string): number | null {
  const p = progressMap.value.get(planId);
  return p ? Math.round(p.overallProgress) : null;
}

function progressColor(pct: number): string {
  if (pct >= 75) return "#18A058";
  if (pct >= 50) return "#2080F0";
  if (pct >= 25) return "#F0A020";
  return "#D03050";
}

const columns: DataTableColumns<PlanListItem> = [
  {
    title: "แผนปฏิบัติการ",
    key: "name",
    width: 280,
    render: (row) =>
      h("div", { style: "min-width: 250px" }, [
        h("div", { style: "font-weight: 500; color: var(--color-text)" }, row.name),
        h("span", { style: "font-size: var(--text-xs); color: var(--color-text-secondary)" }, `ปี ${row.year}`),
      ]),
  },
  {
    title: "สถานะ",
    key: "status",
    width: 140,
    render: (row) => {
      const cfg = STATUS_CONFIG[row.status];
      return h(NTag, { bordered: false, size: "small", type: cfg?.type || "default" }, { default: () => cfg?.label || row.status });
    },
  },
  {
    title: "ความก้าวหน้า",
    key: "progress",
    width: 180,
    render: (row) => {
      const pct = getPlanProgressPct(row.id);
      if (pct === null) return h("span", { style: "color: var(--color-text-tertiary)" }, "-");
      return h("div", { style: "display: flex; align-items: center; gap: 8px" }, [
        h(NProgress, {
          type: "line",
          percentage: pct,
          indicatorPlacement: "inside",
          color: progressColor(pct),
          railColor: "var(--color-border)",
          height: 16,
          borderRadius: 4,
        }),
      ]);
    },
  },
  {
    title: "หมวดหมู่",
    key: "categoryCount",
    width: 100,
    render: (row) => h("span", { style: "font-weight: 500" }, `${row.categoryCount} หมวด`),
  },
  {
    title: "ตัวชี้วัด",
    key: "indicatorCount",
    width: 100,
    render: (row) => h("span", { style: "font-weight: 500" }, `${row.indicatorCount} ตัว`),
  },
  {
    title: "ผู้สร้าง",
    key: "creatorName",
    width: 120,
    render: (row) => h("span", {}, row.creatorName || "-"),
  },
  {
    title: "",
    key: "actions",
    width: 100,
    render: (row) =>
      h(NSpace, { size: 6, noWrap: true }, {
        default: () => [
          h(NButton, {
            text: true,
            size: "small",
            type: "primary",
            onClick: () => router.push({ name: "plan-detail", params: { id: row.id } }),
          }, { icon: () => h(NIcon, null, { default: () => h(EyeOutline) }) }),
          h(NButton, {
            text: true,
            size: "small",
            onClick: () => openEditModal(row),
          }, { icon: () => h(NIcon, null, { default: () => h(CreateOutline) }) }),
          h(NButton, {
            text: true,
            size: "small",
            type: "error",
            onClick: () => confirmDelete(row),
          }, { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) }),
        ],
      }),
  },
];

const tableData = computed(() => plans.value);

async function fetchPlans() {
  loading.value = true;
  try {
    plans.value = await listPlans(selectedFY.value);
    await fetchAllProgress();
  } catch (e) {
    message.error("โหลดแผนไม่สำเร็จ");
  } finally {
    loading.value = false;
  }
}

async function fetchAllProgress() {
  const activePlans = plans.value.filter(p => p.status === "active" || p.status === "completed");
  const results = await Promise.allSettled(
    activePlans.map(p => getPlanProgress(p.id))
  );
  const map = new Map<string, PlanProgress>();
  results.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value) {
      map.set(activePlans[i].id, r.value);
    }
  });
  progressMap.value = map;
}

async function handleCreate() {
  if (!formData.value.name.trim()) {
    message.warning("กรุณากรอกชื่อแผน");
    return;
  }
  modalLoading.value = true;
  try {
    await createPlan({ ...formData.value, year: selectedFY.value });
    message.success("สร้างแผนสำเร็จ");
    showModal.value = false;
    formData.value = { year: selectedFY.value, name: "", description: "" };
    await fetchPlans();
  } catch (e) {
    message.error("สร้างแผนไม่สำเร็จ");
  } finally {
    modalLoading.value = false;
  }
}

function openEditModal(plan: PlanListItem) {
  editingPlan.value = plan;
  editForm.value = { name: plan.name, description: plan.description || "", status: plan.status };
  showEditModal.value = true;
}

async function handleEdit() {
  if (!editingPlan.value || !editForm.value.name.trim()) return;
  modalLoading.value = true;
  try {
    await updatePlan(editingPlan.value.id, { name: editForm.value.name, description: editForm.value.description, status: editForm.value.status });
    message.success("แก้ไขแผนสำเร็จ");
    showEditModal.value = false;
    editingPlan.value = null;
    await fetchPlans();
  } catch (e) {
    message.error("แก้ไขแผนไม่สำเร็จ");
  } finally {
    modalLoading.value = false;
  }
}

function confirmDelete(plan: PlanListItem) {
  if (window.confirm(`ยืนยันลบแผน "${plan.name}" หรือไม่?`)) {
    handleDelete(plan.id);
  }
}

async function handleDelete(planId: string) {
  try {
    await deletePlan(planId);
    message.success("ลบแผนสำเร็จ");
    await fetchPlans();
  } catch (e) {
    message.error("ลบแผนไม่สำเร็จ");
  }
}

onMounted(fetchPlans);
</script>

<template>
  <NSpin :show="loading">
    <div class="plan-page">
      <PageHeader title="แผนปฏิบัติการรายปี" :subtitle="`${fyLabel} — ${plans.length} แผน`">
        <template #actions>
          <NSelect v-model:value="selectedFY" :options="fyOptions" size="small" style="width: 160px" @update:value="fetchPlans" />
          <NButton type="primary" @click="showModal = true">
            <template #icon>
              <NIcon><AddCircleOutline /></NIcon>
            </template>
            สร้างแผนใหม่
          </NButton>
        </template>
      </PageHeader>

      <!-- Stats Cards -->
      <div class="stats-row">
        <NCard :bordered="false" class="stat-card">
          <NStatistic label="แผนทั้งหมด" :value="stats.total" />
        </NCard>
        <NCard :bordered="false" class="stat-card">
          <NStatistic label="กำลังดำเนินการ" :value="stats.active">
            <template #suffix>
              <span class="stat-suffix">แผน</span>
            </template>
          </NStatistic>
        </NCard>
        <NCard :bordered="false" class="stat-card">
          <NStatistic label="เสร็จสิ้น" :value="stats.completed">
            <template #suffix>
              <span class="stat-suffix">แผน</span>
            </template>
          </NStatistic>
        </NCard>
        <NCard :bordered="false" class="stat-card">
          <NStatistic label="ความก้าวหน้าเฉลี่ย" :value="stats.avgProgress">
            <template #suffix>
              <span class="stat-suffix">%</span>
            </template>
          </NStatistic>
        </NCard>
      </div>

      <!-- Tabs: Overview / List -->
      <NTabs v-model:value="activeTab" type="line" animated>
        <NTabPane name="overview" tab="แผนภาพรวม">
          <PlanOverviewCharts :plans="plans" />
        </NTabPane>
        <NTabPane name="list" tab="รายการแผน">
          <NCard class="table-card" :bordered="false">
            <NDataTable
              :columns="columns"
              :data="tableData"
              :bordered="false"
              :single-line="false"
              :row-key="(row: PlanListItem) => row.id"
              :scroll-x="1100"
              size="small"
            />
          </NCard>
        </NTabPane>
      </NTabs>
    </div>

    <!-- Create Modal -->
    <NModal v-model:show="showModal" preset="card" title="สร้างแผนใหม่" style="width: 480px">
      <NForm label-placement="top">
        <NFormItem label="ปีงบประมาณ">
          <NSelect v-model:value="formData.year" :options="fyOptions" />
        </NFormItem>
        <NFormItem label="ชื่อแผน">
          <NInput v-model:value="formData.name" placeholder="เช่น แผนปฏิบัติการบริการเช่าพื้นที่ 2569" />
        </NFormItem>
        <NFormItem label="รายละเอียด">
          <NInput v-model:value="formData.description" type="textarea" placeholder="คำอธิบายแผน (ถ้ามี)" :rows="3" />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showModal = false">ยกเลิก</NButton>
          <NButton type="primary" :loading="modalLoading" @click="handleCreate">สร้างแผน</NButton>
        </NSpace>
      </template>
    </NModal>

    <!-- Edit Modal -->
    <NModal v-model:show="showEditModal" preset="card" title="แก้ไขแผน" style="width: 480px">
      <NForm label-placement="top">
        <NFormItem label="ชื่อแผน">
          <NInput v-model:value="editForm.name" />
        </NFormItem>
        <NFormItem label="รายละเอียด">
          <NInput v-model:value="editForm.description" type="textarea" :rows="3" />
        </NFormItem>
        <NFormItem label="สถานะ">
          <NSelect v-model:value="editForm.status" :options="[
            { label: 'ร่าง', value: 'draft' },
            { label: 'กำลังดำเนินการ', value: 'active' },
            { label: 'เสร็จสิ้น', value: 'completed' },
          ]" />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showEditModal = false">ยกเลิก</NButton>
          <NButton type="primary" :loading="modalLoading" @click="handleEdit">บันทึก</NButton>
        </NSpace>
      </template>
    </NModal>
  </NSpin>
</template>

<style scoped>
.plan-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-sm);
}

.stat-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xs);
  text-align: center;
}

.stat-suffix {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-left: 4px;
}

.table-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

@media (max-width: 1023px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 639px) {
  .stats-row {
    grid-template-columns: 1fr;
  }
}
</style>
