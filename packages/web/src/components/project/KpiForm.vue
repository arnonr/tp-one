<script setup lang="ts">
import { ref } from 'vue'
import { NForm, NFormItem, NInput, NSelect, NButton, NSpace, useMessage } from 'naive-ui'
import { projectService } from '@/services/project'

const props = defineProps<{
  projectId: string
  kpi?: {
    id: string
    name: string
    targetValue: string
    currentValue?: string
    unit?: string
    period?: string
  } | null
}>()

const emit = defineEmits<{
  saved: []
  cancel: []
}>()

const message = useMessage()
const saving = ref(false)

const form = ref({
  name: props.kpi?.name ?? '',
  targetValue: props.kpi?.targetValue ?? '',
  currentValue: props.kpi?.currentValue ?? '',
  unit: props.kpi?.unit ?? '',
  period: props.kpi?.period ?? 'quarterly',
})

const periodOptions = [
  { label: 'รายเดือน', value: 'monthly' },
  { label: 'รายไตรมาส', value: 'quarterly' },
  { label: 'รายปี', value: 'yearly' },
]

async function handleSubmit() {
  if (!form.value.name.trim()) {
    message.warning('กรุณากรอกชื่อ KPI')
    return
  }
  if (!form.value.targetValue) {
    message.warning('กรุณากรอกค่าเป้าหมาย')
    return
  }

  saving.value = true
  try {
    if (props.kpi) {
      await projectService.updateKpi(props.projectId, props.kpi.id, form.value)
      message.success('อัปเดต KPI แล้ว')
    } else {
      await projectService.createKpi(props.projectId, form.value)
      message.success('สร้าง KPI แล้ว')
    }
    emit('saved')
  } catch (e: any) {
    message.error('เกิดข้อผิดพลาด')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <NForm label-placement="top" @submit.prevent="handleSubmit">
    <NFormItem label="ชื่อ KPI">
      <NInput v-model:value="form.name" placeholder="เช่น จำนวนผู้เข้าร่วมอบรม" />
    </NFormItem>
    <NFormItem label="ค่าเป้าหมาย">
      <NInput v-model:value="form.targetValue" placeholder="เช่น 100" />
    </NFormItem>
    <NFormItem label="ค่าปัจจุบัน">
      <NInput v-model:value="form.currentValue" placeholder="เช่น 45" />
    </NFormItem>
    <NFormItem label="หน่วย">
      <NInput v-model:value="form.unit" placeholder="เช่น คน, ครั้ง" />
    </NFormItem>
    <NFormItem label="ความถี่">
      <NSelect v-model:value="form.period" :options="periodOptions" />
    </NFormItem>
    <NSpace justify="end" style="margin-top: var(--space-md)">
      <NButton @click="emit('cancel')">ยกเลิก</NButton>
      <NButton type="primary" :loading="saving" attr-type="submit">บันทึก</NButton>
    </NSpace>
  </NForm>
</template>