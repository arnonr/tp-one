<script setup lang="ts">
import PriorityBadge from '@/components/common/PriorityBadge.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import ThaiDate from '@/components/common/ThaiDate.vue'
import type { TaskPriority } from '@/types'

defineProps<{
  id: string
  title: string
  priority: TaskPriority
  statusName?: string
  statusColor?: string
  workspaceName?: string
  assignees?: Array<{ userId: string; name: string }>
  dueDate?: string
  startDate?: string
  description?: string
}>()

defineEmits<{
  click: [id: string]
}>()

const isOverdue = (date?: string) => {
  if (!date) return false
  return new Date(date) < new Date()
}
</script>

<template>
  <div class="task-card" @click="$emit('click', id)">
    <div class="task-card-header">
      <span class="task-title">{{ title }}</span>
      <PriorityBadge :priority="priority" />
    </div>
    <p v-if="description" class="task-description">{{ description }}</p>
    <div class="task-card-meta">
      <StatusBadge v-if="statusName" :name="statusName" :color="statusColor" />
      <span v-if="workspaceName" class="meta-item">
        <span class="meta-icon">📁</span> {{ workspaceName }}
      </span>
      <span v-if="assignees?.length" class="meta-item">
        <span class="meta-icon">👤</span>
        {{ assignees.length === 1 ? assignees[0].name : `${assignees[0].name} +${assignees.length - 1}` }}
      </span>
    </div>
    <div class="task-card-footer">
      <span v-if="dueDate" class="task-due" :class="{ overdue: isOverdue(dueDate) && !statusName?.includes('เสร็จ') }">
        <span class="meta-icon">📅</span>
        <ThaiDate :date="dueDate" format="short" />
      </span>
    </div>
  </div>
</template>

<style scoped>
.task-card {
  padding: 12px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: white;
  cursor: pointer;
  transition: box-shadow 150ms ease;
}
.task-card:hover {
  box-shadow: var(--shadow-md);
}
.task-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}
.task-title {
  font-weight: 500;
  font-size: 0.9rem;
  line-height: 1.4;
  flex: 1;
}
.task-description {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin: 6px 0 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.task-card-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  flex-wrap: wrap;
}
.meta-item {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.meta-icon {
  font-size: 0.8rem;
}
.task-card-footer {
  margin-top: 8px;
}
.task-due {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.task-due.overdue {
  color: var(--color-danger);
  font-weight: 600;
}
</style>
