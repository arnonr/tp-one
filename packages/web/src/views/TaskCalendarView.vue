<script setup lang="ts">
import { ref, computed } from "vue";
import { NCard, NText, NIcon, NButton, NSpin } from "naive-ui";
import { ChevronBackOutline, ChevronForwardOutline, AddCircleOutline } from "@vicons/ionicons5";
import { useThaiDate } from "@/composables/useThaiDate";

const loading = ref(false);
const currentDate = ref(new Date());

const { formatMonth } = useThaiDate();
const monthLabel = computed(() => formatMonth(currentDate.value.toISOString()));

const THAI_DAYS = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];
const DAYS_IN_WEEK = 7;

interface CalendarTask {
  id: string
  title: string
  priority: string
}

const taskMap: Record<string, CalendarTask[]> = {
  "2026-04-21": [{ id: "1", title: "จัดเตรียมเอกสารสัญญาเช่า", priority: "urgent" }],
  "2026-04-22": [{ id: "2", title: "อัปเดตแผนปฏิบัติการ", priority: "high" }],
  "2026-04-25": [{ id: "3", title: "ติดตามผลการอบรม", priority: "normal" }],
  "2026-04-28": [{ id: "4", title: "ส่งรายงาน Q2", priority: "high" }],
  "2026-04-30": [{ id: "5", title: "ประเมินผลบ่มเพาะฯ", priority: "normal" }],
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "var(--color-priority-urgent)",
  high: "var(--color-priority-high)",
  normal: "var(--color-priority-normal)",
  low: "var(--color-priority-low)",
};

function getCalendarDays() {
  const year = currentDate.value.getFullYear();
  const month = currentDate.value.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7;
  const days: { date: number, dateStr: string, isCurrentMonth: boolean, isToday: boolean, tasks: CalendarTask[] }[] = [];

  const today = new Date();
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: d.getDate(), dateStr: d.toISOString().split("T")[0], isCurrentMonth: false, isToday: false, tasks: [] });
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d);
    const dateStr = date.toISOString().split("T")[0];
    days.push({
      date: d,
      dateStr,
      isCurrentMonth: true,
      isToday: today.getFullYear() === year && today.getMonth() === month && today.getDate() === d,
      tasks: taskMap[dateStr] || [],
    });
  }
  const remaining = DAYS_IN_WEEK - (days.length % DAYS_IN_WEEK);
  if (remaining < DAYS_IN_WEEK) {
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(year, month + 1, d);
      days.push({ date: d, dateStr: date.toISOString().split("T")[0], isCurrentMonth: false, isToday: false, tasks: [] });
    }
  }
  return days;
}

const calendarDays = computed(() => getCalendarDays());

function prevMonth() {
  const d = new Date(currentDate.value);
  d.setMonth(d.getMonth() - 1);
  currentDate.value = d;
}

function nextMonth() {
  const d = new Date(currentDate.value);
  d.setMonth(d.getMonth() + 1);
  currentDate.value = d;
}
</script>

<template>
  <NSpin :show="loading">
    <div class="calendar-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">ปฏิทินงาน</h1>
          <NText depth="3" class="page-subtitle">ดูงานตามวันที่</NText>
        </div>
        <NButton type="primary">
          <template #icon>
            <NIcon><AddCircleOutline /></NIcon>
          </template>
          สร้างงาน
        </NButton>
      </div>

      <NCard class="calendar-card" :bordered="false">
        <div class="calendar-nav">
          <NButton quaternary circle @click="prevMonth">
            <template #icon><NIcon><ChevronBackOutline /></NIcon></template>
          </NButton>
          <NText class="calendar-month">{{ monthLabel }}</NText>
          <NButton quaternary circle @click="nextMonth">
            <template #icon><NIcon><ChevronForwardOutline /></NIcon></template>
          </NButton>
        </div>

        <div class="calendar-grid">
          <div v-for="day in THAI_DAYS" :key="day" class="calendar-day-header">
            {{ day }}
          </div>
          <div
            v-for="(day, idx) in calendarDays"
            :key="idx"
            class="calendar-day"
            :class="{
              'calendar-day--other': !day.isCurrentMonth,
              'calendar-day--today': day.isToday,
            }"
          >
            <span class="day-number" :class="{ 'day-number--today': day.isToday }">{{ day.date }}</span>
            <div class="day-tasks">
              <div
                v-for="task in day.tasks"
                :key="task.id"
                class="day-task"
                :style="{ borderLeftColor: PRIORITY_COLORS[task.priority] }"
              >
                {{ task.title }}
              </div>
            </div>
          </div>
        </div>
      </NCard>
    </div>
  </NSpin>
</template>

<style scoped>
.calendar-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
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

.calendar-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.calendar-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.calendar-month {
  font-size: var(--text-lg);
  font-weight: 600;
  min-width: 150px;
  text-align: center;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-top: 1px solid var(--color-border-light);
  border-left: 1px solid var(--color-border-light);
}

.calendar-day-header {
  padding: var(--space-sm);
  text-align: center;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
  background: var(--color-surface-variant);
  border-right: 1px solid var(--color-border-light);
  border-bottom: 1px solid var(--color-border-light);
}

.calendar-day {
  min-height: 100px;
  padding: var(--space-xs);
  border-right: 1px solid var(--color-border-light);
  border-bottom: 1px solid var(--color-border-light);
  transition: background var(--duration-fast) var(--ease-out);
}

.calendar-day:hover {
  background: var(--color-surface-variant);
}

.calendar-day--other {
  background: var(--color-surface-variant);
}

.calendar-day--other .day-number {
  color: var(--color-text-tertiary);
}

.calendar-day--today {
  background: var(--color-primary-bg);
}

.day-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-sm);
  font-weight: 500;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-full);
}

.day-number--today {
  background: var(--color-primary);
  color: white;
  font-weight: 600;
}

.day-tasks {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: var(--space-2xs);
}

.day-task {
  font-size: var(--text-xs);
  padding: 1px 4px 1px 6px;
  border-left: 3px solid;
  border-radius: 2px;
  background: var(--color-surface);
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}
</style>
