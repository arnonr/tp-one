<script setup lang="ts">
import { NConfigProvider, NMessageProvider, NDialogProvider, thTH, dateThTH } from "naive-ui";
import AppLayout from "./components/layout/AppLayout.vue";

const themeOverrides = {
  common: {
    fontFamily: '"Sarabun", "Noto Sans Thai", -apple-system, BlinkMacSystemFont, sans-serif',
    fontFamilyMono: '"Sarabun", "Noto Sans Thai", monospace',
  },
};
</script>

<template>
  <NConfigProvider :locale="thTH" :date-locale="dateThTH" :theme-overrides="themeOverrides">
    <NMessageProvider>
      <NDialogProvider>
        <AppLayout />
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>
