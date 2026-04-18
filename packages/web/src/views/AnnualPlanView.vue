<script setup lang="ts">
import { NCard, NButton, NSpace, NDataTable } from "naive-ui";
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">แผนปฏิบัติการรายปี</h1>
      <NButton type="primary">สร้างแผนใหม่</NButton>
    </div>
    <NCard>
      <p>รายการแผนปฏิบัติการ — Coming soon...</p>
    </NCard>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-xl);
}
.page-title {
  font-size: var(--text-hero);
  font-weight: 700;
}
</style>
