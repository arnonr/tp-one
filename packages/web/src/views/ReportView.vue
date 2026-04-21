<script setup lang="ts">
import { ref } from "vue";
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
import PageHeader from "@/components/common/PageHeader.vue";

const loading = ref(false);
const { fyLabel, fyOptions, selectedFY } = useFiscalYear();

const categoryOptions = [
  { label: "ทุกหมวด", value: "" },
  { label: "เช่าพื้นที่", value: "rental" },
  { label: "ที่ปรึกษา/วิจัย", value: "consulting" },
  { label: "อบรม/สัมนา", value: "training" },
  { label: "บ่มเพาะสตาร์ทอัป", value: "incubator" },
];

interface ReportCard {
  title: string
  description: string
  icon: any
  color: string
  bgColor: string
  stat: string
  statLabel: string
}

const reports: ReportCard[] = [
  {
    title: "รายงานสรุปภาพรวม",
    description: "สรุปจำนวนงาน สถานะ และผลการดำเนินงานรายหมวด",
    icon: PieChartOutline,
    color: "var(--color-primary)",
    bgColor: "var(--color-primary-bg)",
    stat: "128",
    statLabel: "งานทั้งหมด",
  },
  {
    title: "รายงานผลการดำเนินงาน",
    description: "เปรียบเทียบผลการดำเนินงานตามแผนปฏิบัติการรายไตรมาส",
    icon: BarChartOutline,
    color: "var(--color-success)",
    bgColor: "var(--color-success-bg)",
    stat: "69%",
    statLabel: "อัตราสำเร็จ",
  },
  {
    title: "รายงานแนวโน้มรายเดือน",
    description: "แนวโน้มจำนวนงานที่สร้างและเสร็จสิ้นในแต่ละเดือน",
    icon: TrendingUpOutline,
    color: "var(--color-warning)",
    bgColor: "var(--color-warning-bg)",
    stat: "+12%",
    statLabel: "เพิ่มขึ้นจากปีก่อน",
  },
  {
    title: "รายงานรายงานตัวชี้วัด",
    description: "ผลการติดตามตัวชี้วัดตามแผนปฏิบัติการรายปี",
    icon: DocumentTextOutline,
    color: "var(--color-info)",
    bgColor: "var(--color-info-bg)",
    stat: "45",
    statLabel: "ตัวชี้วัด",
  },
];

interface CategoryStat {
  name: string
  tasks: number
  completed: number
  percent: number
  color: string
}

const categoryStats: CategoryStat[] = [
  { name: "เช่าพื้นที่", tasks: 32, completed: 24, percent: 75, color: "var(--color-primary)" },
  { name: "ที่ปรึกษา/วิจัย", tasks: 18, completed: 12, percent: 67, color: "var(--color-success)" },
  { name: "อบรม/สัมนา", tasks: 15, completed: 8, percent: 53, color: "var(--color-warning)" },
  { name: "บ่มเพาะสตาร์ทอัป", tasks: 22, completed: 14, percent: 64, color: "var(--color-info)" },
];
</script>

<template>
  <NSpin :show="loading">
    <div class="report-page">
      <PageHeader title="รายงาน" :subtitle="fyLabel">
        <template #actions>
          <NButton>
            <template #icon>
              <NIcon><PrintOutline /></NIcon>
            </template>
            พิมพ์
          </NButton>
          <NButton type="primary">
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
          <NSelect placeholder="หมวดบริการ" :options="categoryOptions" size="small" style="width: 180px" />
        </NSpace>
      </NCard>

      <!-- Report Cards -->
      <NGrid :cols="4" :x-gap="16" :y-gap="16" responsive="screen" item-responsive>
        <NGi v-for="report in reports" :key="report.title" span="4 m:2 l:1">
          <NCard class="report-card" :bordered="false" hoverable>
            <div class="report-card-inner">
              <div class="report-icon-wrap" :style="{ background: report.bgColor }">
                <NIcon :size="24" :color="report.color" :component="report.icon" />
              </div>
              <div class="report-stat">
                <div class="report-stat-value" :style="{ color: report.color }">{{ report.stat }}</div>
                <NText depth="3" class="report-stat-label">{{ report.statLabel }}</NText>
              </div>
              <div class="report-title">{{ report.title }}</div>
              <NText depth="3" class="report-desc">{{ report.description }}</NText>
              <NButton text size="small" type="primary" class="report-link">
                เปิดรายงาน
                <template #icon><NIcon><TrendingUpOutline /></NIcon></template>
              </NButton>
            </div>
          </NCard>
        </NGi>
      </NGrid>

      <!-- Category Breakdown -->
      <NCard class="section-card" :bordered="false">
        <template #header>
          <NText class="section-title">ผลการดำเนินงานตามหมวดบริการ</NText>
        </template>
        <div class="category-list">
          <div v-for="cat in categoryStats" :key="cat.name" class="category-row">
            <div class="category-info">
              <div class="category-dot" :style="{ background: cat.color }" />
              <div>
                <div class="category-name">{{ cat.name }}</div>
                <NText depth="3" class="category-sub">{{ cat.completed }}/{{ cat.tasks }} งาน</NText>
              </div>
            </div>
            <div class="category-bar-wrap">
              <div class="category-bar" :style="{ '--target-width': cat.percent + '%', background: cat.color }" />
            </div>
            <div class="category-percent" :style="{ color: cat.color }">{{ cat.percent }}%</div>
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

/* ── Report Cards ── */
.report-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--duration-normal) var(--ease-out);
}

.report-card:hover {
  box-shadow: var(--shadow-md);
}

.report-card-inner {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.report-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.report-stat {
  display: flex;
  align-items: baseline;
  gap: var(--space-xs);
}

.report-stat-value {
  font-size: var(--text-2xl);
  font-weight: 700;
}

.report-stat-label {
  font-size: var(--text-xs);
}

.report-title {
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--color-text);
}

.report-desc {
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
}

.report-link {
  align-self: flex-start;
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
