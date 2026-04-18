<script setup lang="ts">
import { NCard, NProgress, NSpace } from "naive-ui";
</script>

<template>
  <div>
    <h1 class="page-title">รายละเอียดแผนปฏิบัติการ</h1>
    <NCard title="ความคืบหน้ารวมทั้งแผน">
      <NProgress type="line" :percentage="0" />
    </NCard>
    <NCard title="หมวด 1: การบริการวิชาการ" style="margin-top: 16px">
      <p>ตัวชี้วัด — Coming soon...</p>
    </NCard>
  </div>
</template>

<style scoped>
.page-title {
  font-size: var(--text-hero);
  font-weight: 700;
  margin-bottom: var(--space-xl);
}
</style>
