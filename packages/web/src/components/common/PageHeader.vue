<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <div class="page-header">
    <div class="page-header-left">
      <div class="accent-bar" />
      <div class="page-header-text">
        <h1 class="page-title">{{ title }}</h1>
        <p v-if="subtitle" class="page-subtitle">{{ subtitle }}</p>
      </div>
    </div>
    <div v-if="$slots.actions" class="page-header-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-md);
}

.page-header-left {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.accent-bar {
  width: 4px;
  height: 32px;
  border-radius: var(--radius-full);
  background: linear-gradient(to bottom, var(--color-primary-light), var(--color-primary-dark));
  flex-shrink: 0;
}

.page-header-text {
  min-width: 0;
}

.page-title {
  font-size: var(--text-hero);
  font-weight: 700;
  color: var(--color-text);
  line-height: var(--leading-tight);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.page-subtitle {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-top: var(--space-3xs);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.page-header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-shrink: 0;
}
</style>
