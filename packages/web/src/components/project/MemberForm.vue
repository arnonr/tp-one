<script setup lang="ts">
import { ref } from 'vue'
import { NForm, NFormItem, NInput, NSelect, NButton, NSpace, NText, useMessage } from 'naive-ui'
import { projectService } from '@/services/project'
import { userService } from '@/services/user'

const props = defineProps<{
  projectId: string
}>()

const emit = defineEmits<{
  saved: []
  cancel: []
}>()

const message = useMessage()
const saving = ref(false)

const form = ref({
  userId: '',
  role: 'member',
})

const userOptions = ref<{ label: string; value: string }[]>([])
const roleOptions = [
  { label: 'สมาชิก', value: 'member' },
  { label: 'ผู้ชม', value: 'viewer' },
]

async function loadUsers() {
  try {
    const users = await userService.list()
    userOptions.value = users.map((u: any) => ({ label: u.name, value: u.id }))
  } catch (e) {
    message.error('โหลดรายชื่อผู้ใช้ไม่สำเร็จ')
  }
}

async function handleSubmit() {
  if (!form.value.userId) {
    message.warning('กรุณาเลือกผู้ใช้')
    return
  }
  saving.value = true
  try {
    await projectService.addMember(props.projectId, form.value.userId, form.value.role)
    message.success('เพิ่มสมาชิกแล้ว')
    emit('saved')
  } catch (e: any) {
    message.error(e?.message ?? 'เกิดข้อผิดพลาด')
  } finally {
    saving.value = false
  }
}

// Load users on mount
loadUsers()
</script>

<template>
  <NForm label-placement="top" @submit.prevent="handleSubmit">
    <NFormItem label="เลือกผู้ใช้">
      <NSelect v-model:value="form.userId" :options="userOptions" filterable placeholder="ค้นหาชื่อ..." />
    </NFormItem>
    <NFormItem label="บทบาท">
      <NSelect v-model:value="form.role" :options="roleOptions" />
    </NFormItem>
    <NSpace justify="end" style="margin-top: var(--space-md)">
      <NButton @click="emit('cancel')">ยกเลิก</NButton>
      <NButton type="primary" :loading="saving" attr-type="submit">เพิ่ม</NButton>
    </NSpace>
  </NForm>
</template>