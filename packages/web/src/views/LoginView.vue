<script setup lang="ts">
import { NCard, NButton, NSpace } from "naive-ui";

function handleSSOLogin() {
  window.location.href = "/api/auth/login";
}
</script>

<template>
  <div class="login-wrapper">
    <NCard class="login-card" title="เข้าสู่ระบบ TP-One">
      <p class="login-subtitle">อุทยานเทคโนโลยี — ระบบจัดการงาน</p>
      <NSpace vertical :size="16">
        <NButton type="primary" block size="large" @click="handleSSOLogin">
          เข้าสู่ระบบผ่าน SSO มหาวิทยาลัย
        </NButton>
      </NSpace>
    </NCard>
  </div>
</template>

<style scoped>
.login-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--color-surface-variant);
}
.login-card {
  width: 400px;
}
.login-subtitle {
  color: var(--color-text-secondary);
  margin-bottom: var(--space-lg);
}
</style>
