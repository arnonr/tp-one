<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import {
  NCard,
  NText,
  NIcon,
  NButton,
  NSpin,
  NTag,
  NProgress,
  NSpace,
  NModal,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NSelect,
  useMessage,
} from "naive-ui";
import {
  ArrowBackOutline,
  TrendingUpOutline,
  CheckmarkDoneOutline,
  TimeOutline,
  AddOutline,
  CreateOutline,
  TrashOutline,
  AddCircleOutline,
} from "@vicons/ionicons5";
import { useRoute, useRouter } from "vue-router";
import { getPlan, getPlanProgress, createUpdate, createCategory, updateCategory, deleteCategory, createIndicator, updateIndicator, deleteIndicator, type AnnualPlan, type PlanCategory, type PlanIndicator } from "@/services/plan";

const route = useRoute();
const router = useRouter();
const message = useMessage();
const loading = ref(false);

const plan = ref<AnnualPlan | null>(null);
const progressData = ref<{ progress: number; byCategory: Record<string, number> }>({ progress: 0, byCategory: {} });
const totalIndicators = ref(0);
const passedIndicators = ref(0);

// Update modal state
const showUpdateModal = ref(false);
const updateModalLoading = ref(false);
const selectedIndicator = ref<PlanIndicator | null>(null);
const updateForm = ref({ reportedMonth: 1, reportedYear: 2569, reportedValue: "", progressPct: "", note: "" });
const indicatorUpdates = ref<Record<string, { reportedMonth: number; reportedYear: number; reportedValue: string; progressPct: string | null }[]>>({});

// Category CRUD modal state
const showCategoryModal = ref(false);
const categoryModalLoading = ref(false);
const editingCategory = ref<PlanCategory | null>(null);
const categoryForm = ref({ code: "", name: "" });

// Indicator CRUD modal state
const showIndicatorModal = ref(false);
const indicatorModalLoading = ref(false);
const editingIndicator = ref<PlanIndicator | null>(null);
const selectedCategoryForIndicator = ref<PlanCategory | null>(null);
const indicatorForm = ref({ code: "", name: "", targetValue: "", unit: "", indicatorType: "amount", description: "" });

const INDICATOR_TYPE_OPTIONS = [
  { label: "จำนวน (amount)", value: "amount" },
  { label: "จำนวนนับ (count)", value: "count" },
  { label: "เปอร์เซ็นต์ (%)", value: "percentage" },
];

const currentQuarter = computed(() => {
  const m = new Date().getMonth() + 1;
  if (m >= 10) return "Q1";
  if (m >= 1 && m <= 3) return "Q2";
  if (m >= 4 && m <= 6) return "Q3";
  return "Q4";
});

const currentMonth = computed(() => new Date().getMonth() + 1);
const currentYear = new Date().getFullYear() + 543;

const STATUS_CONFIG: Record<string, { label: string; type: "success" | "warning" | "info" | "default" }> = {
  active: { label: "กำลังดำเนินการ", type: "info" },
  draft: { label: "ร่าง", type: "warning" },
  completed: { label: "เสร็จสิ้น", type: "success" },
};

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

function getCatProgress(catId: string): number {
  return progressData.value.byCategory[catId] || 0;
}

function getIndicatorUpdates(indId: string) {
  return indicatorUpdates.value[indId] || [];
}

async function fetchUpdatesForIndicator(planId: string, categoryId: string, indicatorId: string) {
  try {
    const { listUpdates } = await import("@/services/plan");
    const updates = await listUpdates(planId, categoryId, indicatorId);
    indicatorUpdates.value[indicatorId] = updates.map(u => ({
      reportedMonth: u.reportedMonth,
      reportedYear: u.reportedYear,
      reportedValue: u.reportedValue,
      progressPct: u.progressPct,
    }));
  } catch (e) {
    // ignore
  }
}

async function fetchPlan() {
  loading.value = true;
  try {
    const id = route.params.id as string;
    plan.value = await getPlan(id);
    document.title = `${plan.value.name} — TP-One`;

    // fetch progress
    try {
      progressData.value = await getPlanProgress(id);
    } catch (e) {
      // no progress yet
    }

    // count indicators + fetch updates
    let total = 0;
    let passed = 0;
    for (const cat of plan.value.categories || []) {
      for (const ind of cat.indicators || []) {
        total++;
        await fetchUpdates(id, cat.id, ind);
      }
    }
    totalIndicators.value = total;
    passedIndicators.value = passed;
  } catch (e) {
    message.error("โหลดแผนไม่สำเร็จ");
    router.push({ name: "plans" });
  } finally {
    loading.value = false;
  }
}

async function fetchUpdates(planId: string, categoryId: string, ind: PlanIndicator) {
  try {
    const { listUpdates } = await import("@/services/plan");
    const updates = await listUpdates(planId, categoryId, ind.id);
    indicatorUpdates.value[ind.id] = updates.map(u => ({
      reportedMonth: u.reportedMonth,
      reportedYear: u.reportedYear,
      reportedValue: u.reportedValue,
      progressPct: u.progressPct,
    }));
    // check if passed
    const latest = updates[updates.length - 1];
    if (latest && parseFloat(latest.progressPct || '0') >= 80) passedIndicators.value++;
  } catch (e) {
    // ignore
  }
}

function openUpdateModal(ind: PlanIndicator) {
  selectedIndicator.value = ind;
  updateForm.value = { reportedMonth: currentMonth.value, reportedYear: currentYear - 543, reportedValue: "", progressPct: "", note: "" };
  showUpdateModal.value = true;
}

async function handleCreateUpdate() {
  if (!selectedIndicator.value || !updateForm.value.reportedValue) {
    message.warning("กรุณากรอกข้อมูลให้ครบ");
    return;
  }
  updateModalLoading.value = true;
  try {
    const planId = route.params.id as string;
    const cat = plan.value?.categories?.find(c => c.indicators.some(i => i.id === selectedIndicator.value?.id));
    if (!cat) return;
    await createUpdate(planId, cat.id, selectedIndicator.value.id, {
      reportedMonth: updateForm.value.reportedMonth,
      reportedYear: updateForm.value.reportedYear,
      reportedValue: updateForm.value.reportedValue,
      progressPct: updateForm.value.progressPct || undefined,
      note: updateForm.value.note || undefined,
    });
    message.success("บันทึกรายงานสำเร็จ");
    showUpdateModal.value = false;
    await fetchPlan();
  } catch (e) {
    message.error("บันทึกไม่สำเร็จ");
  } finally {
    updateModalLoading.value = false;
  }
}

// ===== Category CRUD =====

function openAddCategoryModal() {
  editingCategory.value = null;
  categoryForm.value = { code: "", name: "" };
  showCategoryModal.value = true;
}

function openEditCategoryModal(cat: PlanCategory) {
  editingCategory.value = cat;
  categoryForm.value = { code: cat.code, name: cat.name };
  showCategoryModal.value = true;
}

async function handleSaveCategory() {
  const planId = route.params.id as string;
  if (!categoryForm.value.code.trim() || !categoryForm.value.name.trim()) {
    message.warning("กรุณากรอกข้อมูลให้ครบ");
    return;
  }
  categoryModalLoading.value = true;
  try {
    if (editingCategory.value) {
      await updateCategory(editingCategory.value.id, { code: categoryForm.value.code, name: categoryForm.value.name }, planId);
      message.success("แก้ไขหมวดหมู่สำเร็จ");
    } else {
      await createCategory(planId, { code: categoryForm.value.code, name: categoryForm.value.name });
      message.success("เพิ่มหมวดหมู่สำเร็จ");
    }
    showCategoryModal.value = false;
    await fetchPlan();
  } catch (e) {
    message.error("ไม่สำเร็จ");
  } finally {
    categoryModalLoading.value = false;
  }
}

function confirmDeleteCategory(cat: PlanCategory) {
  if (window.confirm(`ยืนยันลบหมวดหมู่ "${cat.name}" และตัวชี้วัดภายในหมวดนี้?`)) {
    handleDeleteCategory(cat.id);
  }
}

async function handleDeleteCategory(categoryId: string) {
  const planId = route.params.id as string;
  try {
    await deleteCategory(categoryId, planId);
    message.success("ลบหมวดหมู่สำเร็จ");
    await fetchPlan();
  } catch (e) {
    message.error("ลบไม่สำเร็จ");
  }
}

// ===== Indicator CRUD =====

function openAddIndicatorModal(cat: PlanCategory) {
  selectedCategoryForIndicator.value = cat;
  editingIndicator.value = null;
  indicatorForm.value = { code: "", name: "", targetValue: "", unit: "", indicatorType: "amount", description: "" };
  showIndicatorModal.value = true;
}

function openEditIndicatorModal(ind: PlanIndicator) {
  editingIndicator.value = ind;
  const cat = plan.value?.categories?.find(c => c.indicators.some(i => i.id === ind.id));
  selectedCategoryForIndicator.value = cat || null;
  indicatorForm.value = {
    code: ind.code,
    name: ind.name,
    targetValue: ind.targetValue,
    unit: ind.unit || "",
    indicatorType: ind.indicatorType,
    description: ind.description || "",
  };
  showIndicatorModal.value = true;
}

async function handleSaveIndicator() {
  if (!selectedCategoryForIndicator.value) return;
  const planId = route.params.id as string;
  const categoryId = selectedCategoryForIndicator.value.id;
  if (!indicatorForm.value.code.trim() || !indicatorForm.value.name.trim() || !indicatorForm.value.targetValue) {
    message.warning("กรุณากรอกข้อมูลให้ครบ");
    return;
  }
  indicatorModalLoading.value = true;
  try {
    if (editingIndicator.value) {
      await updateIndicator(planId, categoryId, editingIndicator.value.id, {
        code: indicatorForm.value.code,
        name: indicatorForm.value.name,
        targetValue: indicatorForm.value.targetValue,
        unit: indicatorForm.value.unit || undefined,
        indicatorType: indicatorForm.value.indicatorType,
        description: indicatorForm.value.description || undefined,
      });
      message.success("แก้ไขตัวชี้วัดสำเร็จ");
    } else {
      await createIndicator(categoryId, planId, {
        code: indicatorForm.value.code,
        name: indicatorForm.value.name,
        targetValue: indicatorForm.value.targetValue,
        unit: indicatorForm.value.unit || undefined,
        indicatorType: indicatorForm.value.indicatorType,
        description: indicatorForm.value.description || undefined,
      });
      message.success("เพิ่มตัวชี้วัดสำเร็จ");
    }
    showIndicatorModal.value = false;
    await fetchPlan();
  } catch (e) {
    message.error("ไม่สำเร็จ");
  } finally {
    indicatorModalLoading.value = false;
  }
}

function confirmDeleteIndicator(ind: PlanIndicator) {
  if (window.confirm(`ยืนยันลบตัวชี้วัด "${ind.name}"?`)) {
    handleDeleteIndicator(ind);
  }
}

async function handleDeleteIndicator(ind: PlanIndicator) {
  const planId = route.params.id as string;
  const cat = plan.value?.categories?.find(c => c.indicators.some(i => i.id === ind.id));
  if (!cat) return;
  try {
    await deleteIndicator(planId, cat.id, ind.id);
    message.success("ลบตัวชี้วัดสำเร็จ");
    await fetchPlan();
  } catch (e) {
    message.error("ลบไม่สำเร็จ");
  }
}

onMounted(fetchPlan);
</script>

<template>
  <NSpin :show="loading">
    <div v-if="plan" class="plan-detail">
      <div class="page-header">
        <div class="header-left">
          <NButton quaternary circle @click="router.push({ name: 'plans' })">
            <template #icon><NIcon><ArrowBackOutline /></NIcon></template>
          </NButton>
          <div>
            <h1 class="page-title">{{ plan.name }}</h1>
            <NText depth="3" class="page-subtitle">
              ปีงบประมาณ {{ plan.year }} | {{ totalIndicators }} ตัวชี้วัด
            </NText>
          </div>
        </div>
        <NTag :bordered="false" :type="STATUS_CONFIG[plan.status]?.type || 'default'">
          {{ STATUS_CONFIG[plan.status]?.label || plan.status }}
        </NTag>
      </div>

      <!-- Overview Stats -->
      <div class="overview-bar">
        <div class="overview-stat">
          <NIcon :size="20" color="var(--color-primary)"><TrendingUpOutline /></NIcon>
          <div>
            <NText depth="3" class="overview-label">ความคืบหน้ารวม</NText>
            <div class="overview-value">{{ progressData.progress }}%</div>
          </div>
        </div>
        <div class="overview-divider" />
        <div class="overview-stat">
          <NIcon :size="20" color="var(--color-success)"><CheckmarkDoneOutline /></NIcon>
          <div>
            <NText depth="3" class="overview-label">ตัวชี้วัดที่ผ่านเป้า</NText>
            <div class="overview-value">{{ passedIndicators }} / {{ totalIndicators }}</div>
          </div>
        </div>
        <div class="overview-divider" />
        <div class="overview-stat">
          <NIcon :size="20" color="var(--color-warning)"><TimeOutline /></NIcon>
          <div>
            <NText depth="3" class="overview-label">ไตรมาสปัจจุบัน</NText>
            <div class="overview-value">{{ currentQuarter }}</div>
          </div>
        </div>
      </div>

      <!-- Overall Progress -->
      <NCard class="progress-card" :bordered="false">
        <div class="progress-header">
          <NText class="progress-title">ความคืบหน้ารวมทั้งแผน</NText>
          <NButton size="small" type="primary" @click="openAddCategoryModal">
            <template #icon><NIcon><AddCircleOutline /></NIcon></template>
            เพิ่มหมวดหมู่
          </NButton>
        </div>
        <NProgress type="line" :percentage="progressData.progress" :height="12" :border-radius="6" indicator-placement="inside">
          {{ progressData.progress }}%
        </NProgress>
      </NCard>

      <!-- Sections -->
      <div v-for="(cat, catIdx) in plan.categories" :key="cat.id" class="plan-section">
        <NCard class="section-card" :bordered="false">
          <template #header>
            <div class="section-header">
              <div>
                <NText class="section-title">{{ cat.code }}: {{ cat.name }}</NText>
                <NText depth="3" class="section-subtitle">{{ cat.indicators.length }} ตัวชี้วัด</NText>
              </div>
              <NSpace :size="8" align="center">
                <NProgress v-if="getCatProgress(cat.id) > 0" type="circle" :percentage="getCatProgress(cat.id)" :size="48" :stroke-width="4">
                  {{ getCatProgress(cat.id) }}%
                </NProgress>
                <NButton size="tiny" quaternary @click="openAddIndicatorModal(cat)" :disabled="!plan || plan.status === 'completed'">
                  <template #icon><NIcon><AddOutline /></NIcon></template>
                </NButton>
                <NButton size="tiny" quaternary @click="openEditCategoryModal(cat)">
                  <template #icon><NIcon><CreateOutline /></NIcon></template>
                </NButton>
                <NButton size="tiny" quaternary type="error" @click="confirmDeleteCategory(cat)">
                  <template #icon><NIcon><TrashOutline /></NIcon></template>
                </NButton>
              </NSpace>
            </div>
          </template>
          <div class="indicator-list">
            <div v-for="(ind, indIdx) in cat.indicators" :key="ind.id" class="indicator-row">
              <div class="indicator-header">
                <div class="indicator-id">{{ ind.code }}</div>
                <div class="indicator-info">
                  <div class="indicator-name">{{ ind.name }}</div>
                  <NText depth="3" class="indicator-target">
                    เป้าหมาย: {{ ind.targetValue }} {{ ind.unit || '' }}
                  </NText>
                </div>
                <NSpace :size="4" no-wrap>
                  <NButton size="small" quaternary @click="openUpdateModal(ind)">
                    <template #icon><NIcon><AddOutline /></NIcon></template>
                    รายงาน
                  </NButton>
                  <NButton size="small" quaternary @click="openEditIndicatorModal(ind)">
                    <template #icon><NIcon><CreateOutline /></NIcon></template>
                  </NButton>
                  <NButton size="small" quaternary type="error" @click="confirmDeleteIndicator(ind)">
                    <template #icon><NIcon><TrashOutline /></NIcon></template>
                  </NButton>
                </NSpace>
              </div>
              <!-- Indicator updates -->
              <div v-if="getIndicatorUpdates(ind.id).length > 0" class="update-list">
                <div v-for="(upd, upIdx) in getIndicatorUpdates(ind.id)" :key="upIdx" class="update-item">
                  <div class="update-period">เดือน {{ upd.reportedMonth }} / {{ upd.reportedYear }}</div>
                  <div class="update-value">{{ upd.reportedValue }} {{ ind.unit || '' }}</div>
                  <NProgress v-if="upd.progressPct" type="line" :percentage="parseFloat(upd.progressPct)" :height="6" :border-radius="3" :show-indicator="false" />
                  <NText v-if="upd.progressPct" depth="3" class="update-pct">{{ upd.progressPct }}%</NText>
                </div>
              </div>
              <div v-else class="quarter-placeholder">
                <NText depth="3" class="placeholder-text">ยังไม่มีข้อมูลรายงานประจำไตรมาส</NText>
              </div>
            </div>
          </div>
        </NCard>
      </div>
    </div>
  </NSpin>

  <!-- Update Modal -->
  <NModal v-model:show="showUpdateModal" preset="card" :title="`รายงานความคืบหน้า: ${selectedIndicator?.name || ''}`" style="width: 480px">
    <NForm label-placement="top">
      <NFormItem label="เดือนที่รายงาน">
        <NInputNumber v-model:value="updateForm.reportedMonth" :min="1" :max="12" style="width: 100%" />
      </NFormItem>
      <NFormItem label="ปีที่รายงาน (พ.ศ.)">
        <NInputNumber v-model:value="updateForm.reportedYear" :min="2500" :max="2600" style="width: 100%" />
      </NFormItem>
      <NFormItem label="ค่าที่รายงาน">
        <NInput v-model:value="updateForm.reportedValue" placeholder="เช่น 85" />
      </NFormItem>
      <NFormItem label="เปอร์เซ็นต์ความคืบหน้า">
        <NInput v-model:value="updateForm.progressPct" placeholder="เช่น 75" />
      </NFormItem>
      <NFormItem label="หมายเหตุ">
        <NInput v-model:value="updateForm.note" type="textarea" placeholder="รายละเอียดเพิ่มเติม" :rows="2" />
      </NFormItem>
    </NForm>
    <template #footer>
      <NSpace justify="end">
        <NButton @click="showUpdateModal = false">ยกเลิก</NButton>
        <NButton type="primary" :loading="updateModalLoading" @click="handleCreateUpdate">บันทึก</NButton>
      </NSpace>
    </template>
  </NModal>

  <!-- Category CRUD Modal -->
  <NModal v-model:show="showCategoryModal" preset="card" :title="editingCategory ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'" style="width: 420px">
    <NForm label-placement="top">
      <NFormItem label="รหัสหมวด">
        <NInput v-model:value="categoryForm.code" placeholder="เช่น 1.1" />
      </NFormItem>
      <NFormItem label="ชื่อหมวดหมู่">
        <NInput v-model:value="categoryForm.name" placeholder="เช่น การบริการวิชาการ" />
      </NFormItem>
    </NForm>
    <template #footer>
      <NSpace justify="end">
        <NButton @click="showCategoryModal = false">ยกเลิก</NButton>
        <NButton type="primary" :loading="categoryModalLoading" @click="handleSaveCategory">บันทึก</NButton>
      </NSpace>
    </template>
  </NModal>

  <!-- Indicator CRUD Modal -->
  <NModal v-model:show="showIndicatorModal" preset="card" :title="editingIndicator ? 'แก้ไขตัวชี้วัด' : 'เพิ่มตัวชี้วัดใหม่'" style="width: 520px">
    <NForm label-placement="top">
      <NFormItem label="รหัสตัวชี้วัด">
        <NInput v-model:value="indicatorForm.code" placeholder="เช่น 1.1.1" />
      </NFormItem>
      <NFormItem label="ชื่อตัวชี้วัด">
        <NInput v-model:value="indicatorForm.name" placeholder="เช่น จำนวนผู้เช่าพื้นที่" />
      </NFormItem>
      <NFormItem label="เป้าหมาย">
        <NInput v-model:value="indicatorForm.targetValue" placeholder="เช่น 30" />
      </NFormItem>
      <NFormItem label="หน่วย">
        <NInput v-model:value="indicatorForm.unit" placeholder="เช่น ราย, ครั้ง, บาท" />
      </NFormItem>
      <NFormItem label="ประเภท">
        <NSelect v-model:value="indicatorForm.indicatorType" :options="INDICATOR_TYPE_OPTIONS" />
      </NFormItem>
      <NFormItem label="รายละเอียด">
        <NInput v-model:value="indicatorForm.description" type="textarea" placeholder="คำอธิบายตัวชี้วัด (ถ้ามี)" :rows="2" />
      </NFormItem>
    </NForm>
    <template #footer>
      <NSpace justify="end">
        <NButton @click="showIndicatorModal = false">ยกเลิก</NButton>
        <NButton type="primary" :loading="indicatorModalLoading" @click="handleSaveIndicator">บันทึก</NButton>
      </NSpace>
    </template>
  </NModal>
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

.progress-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}

.progress-title {
  font-size: var(--text-sm);
  font-weight: 500;
  display: block;
}

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

.update-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
}

.update-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  background: var(--color-surface-variant);
  border-radius: var(--radius-sm);
}

.update-period {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  min-width: 80px;
}

.update-value {
  font-size: var(--text-sm);
  font-weight: 500;
  flex: 1;
}

.update-pct {
  font-size: var(--text-xs);
  min-width: 40px;
  text-align: right;
}

.quarter-placeholder {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm);
  background: var(--color-surface-variant);
  border-radius: var(--radius-sm);
}

.placeholder-text {
  font-size: var(--text-xs);
}
</style>