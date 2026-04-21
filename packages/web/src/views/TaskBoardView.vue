<script setup lang="ts">
import { ref } from "vue";
import { NText, NIcon, NButton, NScrollbar, NSpin } from "naive-ui";
import { AddCircleOutline } from "@vicons/ionicons5";

const loading = ref(false);

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "var(--color-priority-urgent)",
  high: "var(--color-priority-high)",
  normal: "var(--color-priority-normal)",
  low: "var(--color-priority-low)",
};

interface BoardTask {
  id: string
  title: string
  project: string
  priority: string
  assignee: string
  dueDate: string
}

interface BoardColumn {
  id: string
  title: string
  color: string
  bgColor: string
  tasks: BoardTask[]
}

const columns: BoardColumn[] = [
  {
    id: "pending",
    title: "รอดำเนินการ",
    color: "var(--color-warning)",
    bgColor: "var(--color-warning-bg)",
    tasks: [
      { id: "1", title: "ติดตามผลการอบรม AI Workshop", project: "อบรม/สัมนา", priority: "high", assignee: "วิภา", dueDate: "25 เม.ย. 2569" },
      { id: "2", title: "จัดทำรายงานให้คำปรึกษา", project: "ที่ปรึกษา/วิจัย", priority: "low", assignee: "สุนีย์", dueDate: "15 พ.ค. 2569" },
      { id: "3", title: "จัดหาวิทยากร Data Science", project: "อบรม/สัมนา", priority: "normal", assignee: "ประเสริฐ", dueDate: "10 พ.ค. 2569" },
    ],
  },
  {
    id: "in_progress",
    title: "กำลังดำเนินการ",
    color: "var(--color-primary)",
    bgColor: "var(--color-primary-bg)",
    tasks: [
      { id: "4", title: "จัดเตรียมเอกสารสัญญาเช่า", project: "เช่าพื้นที่", priority: "urgent", assignee: "สมชาย", dueDate: "22 เม.ย. 2569" },
      { id: "5", title: "ประเมินผลโครงการบ่มเพาะฯ Q2", project: "บ่มเพาะสตาร์ทอัป", priority: "normal", assignee: "ประเสริฐ", dueDate: "30 เม.ย. 2569" },
      { id: "6", title: "อัปเดตแผนปฏิบัติการ Q3", project: "แผนปฏิบัติการ", priority: "high", assignee: "สมชาย", dueDate: "28 เม.ย. 2569" },
    ],
  },
  {
    id: "completed",
    title: "เสร็จสิ้น",
    color: "var(--color-success)",
    bgColor: "var(--color-success-bg)",
    tasks: [
      { id: "7", title: "ตรวจสอบสัญญาเช่าห้อง 201-210", project: "เช่าพื้นที่", priority: "normal", assignee: "วิภา", dueDate: "18 เม.ย. 2569" },
      { id: "8", title: "สรุปผลการให้คำปรึกษา SME", project: "ที่ปรึกษา/วิจัย", priority: "high", assignee: "สุนีย์", dueDate: "15 เม.ย. 2569" },
    ],
  },
  {
    id: "on_hold",
    title: "ระงับชั่วคราว",
    color: "var(--color-text-secondary)",
    bgColor: "var(--color-surface-variant)",
    tasks: [],
  },
];
</script>

<template>
  <NSpin :show="loading">
    <div class="board-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">บอร์ดงาน</h1>
          <NText depth="3" class="page-subtitle">ลากเพื่อเปลี่ยนสถานะงาน</NText>
        </div>
        <NButton type="primary">
          <template #icon>
            <NIcon><AddCircleOutline /></NIcon>
          </template>
          สร้างงาน
        </NButton>
      </div>

      <NScrollbar x-scrollable>
        <div class="board-columns">
          <div v-for="col in columns" :key="col.id" class="board-column">
            <div class="column-header" :style="{ borderBottomColor: col.color }">
              <div class="column-dot" :style="{ background: col.color }" />
              <NText class="column-title">{{ col.title }}</NText>
              <span class="column-count" :style="{ background: col.bgColor, color: col.color }">
                {{ col.tasks.length }}
              </span>
            </div>
            <div class="column-body">
              <div v-for="task in col.tasks" :key="task.id" class="board-card">
                <div class="card-top">
                  <NText depth="3" class="card-project">{{ task.project }}</NText>
                  <div class="card-priority" :style="{ background: PRIORITY_COLORS[task.priority] }" />
                </div>
                <div class="card-title">{{ task.title }}</div>
                <div class="card-footer">
                  <div class="card-assignee">
                    <div class="assignee-avatar">{{ task.assignee.charAt(0) }}</div>
                    <NText depth="3" class="assignee-name">{{ task.assignee }}</NText>
                  </div>
                  <NText depth="3" class="card-due">{{ task.dueDate }}</NText>
                </div>
              </div>
              <div v-if="!col.tasks.length" class="column-empty">
                <NText depth="3">ไม่มีงาน</NText>
              </div>
            </div>
          </div>
        </div>
      </NScrollbar>
    </div>
  </NSpin>
</template>

<style scoped>
.board-page {
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

.board-columns {
  display: flex;
  gap: var(--space-md);
  min-height: calc(100vh - 220px);
  padding-bottom: var(--space-xl);
}

.board-column {
  flex: 0 0 300px;
  display: flex;
  flex-direction: column;
  background: var(--color-surface-variant);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.column-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--color-surface);
  border-bottom: 3px solid;
}

.column-dot {
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.column-title {
  font-size: var(--text-sm);
  font-weight: 600;
  flex: 1;
}

.column-count {
  font-size: var(--text-xs);
  font-weight: 600;
  padding: 1px 8px;
  border-radius: var(--radius-full);
}

.column-body {
  flex: 1;
  padding: var(--space-sm);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  overflow-y: auto;
}

.board-card {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  box-shadow: var(--shadow-xs);
  cursor: grab;
  transition: box-shadow var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out);
}

.board-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-xs);
}

.card-project {
  font-size: var(--text-xs);
}

.card-priority {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
}

.card-title {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text);
  line-height: var(--leading-normal);
  margin-bottom: var(--space-sm);
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-assignee {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.assignee-avatar {
  width: 22px;
  height: 22px;
  border-radius: var(--radius-full);
  background: var(--color-primary-lighter);
  color: var(--color-primary);
  font-size: var(--text-xs);
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.assignee-name {
  font-size: var(--text-xs);
}

.card-due {
  font-size: var(--text-xs);
}

.column-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-xl);
  font-size: var(--text-sm);
}
</style>
