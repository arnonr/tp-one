<script setup lang="ts">
import { NCard, NGrid, NGi, NStatistic, NSpin } from "naive-ui";
</script>

<template>
  <div>
    <h1 class="page-title">แดชบอร์ด</h1>
    <NGrid :cols="4" :x-gap="16" :y-gap="16" responsive="screen" item-responsive>
      <NGi span="4 m:2 l:1">
        <NCard>
          <NStatistic label="งานทั้งหมด" :value="0" />
        </NCard>
      </NGi>
      <NGi span="4 m:2 l:1">
        <NCard>
          <NStatistic label="กำลังดำเนินการ" :value="0" />
        </NCard>
      </NGi>
      <NGi span="4 m:2 l:1">
        <NCard>
          <NStatistic label="เสร็จสิ้น" :value="0" />
        </NCard>
      </NGi>
      <NGi span="4 m:2 l:1">
        <NCard>
          <NStatistic label="โครงการ" :value="0" />
        </NCard>
      </NGi>
    </NGrid>
  </div>
</template>

<style scoped>
.page-title {
  font-size: var(--text-hero);
  font-weight: 700;
  margin-bottom: var(--space-xl);
}
</style>
