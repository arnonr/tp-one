<script setup lang="ts">
import { NConfigProvider, NMessageProvider, NDialogProvider, thTH, dateThTH } from "naive-ui";
import AppLayout from "./components/layout/AppLayout.vue";

const themeOverrides = {
  common: {
    primaryColor: "#2563eb",
    primaryColorHover: "#3b82f6",
    primaryColorPressed: "#1d4ed8",
    primaryColorSuppl: "#3b82f6",
    fontFamily: '"Sarabun", "Noto Sans Thai", -apple-system, BlinkMacSystemFont, sans-serif',
    fontFamilyMono: '"Sarabun", "Noto Sans Thai", monospace',
    borderRadius: "10px",
    borderRadiusSmall: "6px",
  },
  Card: {
    borderRadius: "12px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
    color: "#ffffff",
  },
  Button: {
    borderRadiusMedium: "8px",
    borderRadiusSmall: "6px",
  },
  Input: {
    borderRadius: "8px",
  },
  Select: {
    peers: {
      InternalSelection: { borderRadius: "8px" },
    },
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
