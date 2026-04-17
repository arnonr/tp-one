<script setup lang="ts">
import { NConfigProvider, NMessageProvider, NDialogProvider, thTH, dateThTH } from "naive-ui";
import AppLayout from "./components/layout/AppLayout.vue";
</script>

<template>
  <NConfigProvider :locale="thTH" :date-locale="dateThTH">
    <NMessageProvider>
      <NDialogProvider>
        <AppLayout />
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>
