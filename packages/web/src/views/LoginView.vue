<script setup lang="ts">
import { ref } from "vue";
import { NCard, NButton, NInput, NSpace, NAlert, NIcon, NText } from "naive-ui";
import { LockClosedOutline, MailOutline } from "@vicons/ionicons5";
import { useAuthStore } from "../stores/auth";

const authStore = useAuthStore();
const email = ref("");
const loading = ref(false);
const error = ref("");

async function handleLogin() {
  if (!email.value.trim()) return;
  loading.value = true;
  error.value = "";
  try {
    await authStore.login(email.value);
  } catch {
    error.value = "เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบอีเมล";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-wrapper">
    <div class="login-bg" />
    <div class="login-card-wrapper">
      <div class="login-brand">
        <div class="login-logo">TP</div>
        <NText class="login-brand-title">TP-One</NText>
        <NText class="login-brand-subtitle" depth="3">
          ระบบจัดการงานอุทยานเทคโนโลยี
        </NText>
      </div>
      <NCard class="login-card" :bordered="false">
        <NText class="login-heading">เข้าสู่ระบบ</NText>
        <NText class="login-desc" depth="3">
          ใช้อีเมลมหาวิทยาลัยเพื่อเข้าสู่ระบบ
        </NText>
        <NAlert v-if="error" type="error" class="login-error" :bordered="false">
          {{ error }}
        </NAlert>
        <NSpace vertical :size="20" class="login-form">
          <NInput
            v-model:value="email"
            placeholder="อีเมลมหาวิทยาลัย"
            size="large"
            @keyup.enter="handleLogin"
          >
            <template #prefix>
              <NIcon :size="18" color="var(--color-text-tertiary)">
                <MailOutline />
              </NIcon>
            </template>
          </NInput>
          <NButton
            type="primary"
            block
            size="large"
            :loading="loading"
            @click="handleLogin"
          >
            <template #icon>
              <NIcon><LockClosedOutline /></NIcon>
            </template>
            เข้าสู่ระบบ
          </NButton>
        </NSpace>
        <div class="login-footer">
          <NText depth="3">โหมดพัฒนา: ใช้อีเมลในระบบเพื่อเข้าสู่ระบบ</NText>
        </div>
      </NCard>
    </div>
  </div>
</template>

<style scoped>
.login-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
}

.login-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 20% 50%, rgba(37, 99, 235, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
    radial-gradient(ellipse at 60% 80%, rgba(14, 165, 233, 0.08) 0%, transparent 50%);
}

.login-card-wrapper {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  padding: var(--space-md);
}

.login-brand {
  text-align: center;
  margin-bottom: var(--space-xl);
}

.login-logo {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border-radius: var(--radius-lg);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: var(--text-xl);
  margin-bottom: var(--space-md);
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.3);
}

.login-brand-title {
  display: block;
  font-size: var(--text-2xl);
  font-weight: 700;
  color: white;
  margin-bottom: var(--space-2xs);
}

.login-brand-subtitle {
  font-size: var(--text-sm);
}

.login-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  padding: var(--space-lg);
}

.login-heading {
  display: block;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: var(--space-2xs);
}

.login-desc {
  display: block;
  font-size: var(--text-sm);
  margin-bottom: var(--space-lg);
}

.login-error {
  margin-bottom: var(--space-md);
  border-radius: var(--radius-sm);
}

.login-form {
  margin-top: 0;
}

.login-footer {
  margin-top: var(--space-lg);
  text-align: center;
  font-size: var(--text-xs);
}
</style>
