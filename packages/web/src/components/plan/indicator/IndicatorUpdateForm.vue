<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  NModal,
  NCard,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NButton,
  NSpace,
  useMessage,
} from 'naive-ui'
import ThaiDatePicker from '@/components/common/ThaiDatePicker.vue'

const props = defineProps<{
  show: boolean
  indicatorId: string
  indicatorName: string
  targetValue: string
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  save: [payload: {
    reportedValue: string
    reportedDate: string
    progressPct?: string
    note?: string
    evidenceUrl?: string
  }]
}>()

const message = useMessage()

const now = new Date()

const form = ref({
  reportedDate: now.getTime(),
  reportedValue: null as number | null,
  progressPct: null as number | null,
  note: '',
  evidenceUrl: '',
})

watch(() => props.show, (val) => {
  if (val) {
    form.value = {
      reportedDate: now.getTime(),
      reportedValue: null,
      progressPct: null,
      note: '',
      evidenceUrl: '',
    }
  }
})

function autoCalcProgress() {
  if (form.value.reportedValue === null || !props.targetValue) return null
  const val = form.value.reportedValue
  const target = parseFloat(props.targetValue)
  if (isNaN(val) || isNaN(target) || target === 0) return null
  return Math.round((val / target) * 100)
}

watch(() => form.value.reportedValue, () => {
  if (form.value.progressPct === null) {
    const calc = autoCalcProgress()
    if (calc !== null) form.value.progressPct = calc
  }
})

function handleSave() {
  if (form.value.reportedValue === null) {
    message.warning('กรุณากรอกค่าที่รายงาน')
    return
  }
  emit('save', {
    reportedValue: form.value.reportedValue.toString(),
    reportedDate: new Date(form.value.reportedDate).toISOString(),
    progressPct: form.value.progressPct?.toString(),
    note: form.value.note || undefined,
    evidenceUrl: form.value.evidenceUrl || undefined,
  })
}

function handleClose() {
  emit('update:show', false)
}
</script>

<template>
  <NModal
    :show="show"
    preset="card"
    :title="`รายงานความคืบหน้า: ${indicatorName}`"
    style="width: 520px"
    @update:show="emit('update:show', $event)"
  >
    <NForm label-placement="top">
      <NFormItem label="วันที่รายงาน">
        <ThaiDatePicker v-model:value="form.reportedDate" type="date" placeholder="เลือกวันที่รายงาน" style="width: 100%" />
      </NFormItem>
      <NFormItem :label="`ค่าที่รายงาน (เป้าหมาย: ${targetValue})`" required>
        <NInputNumber
          v-model:value="form.reportedValue"
          :min="0"
          :precision="2"
          placeholder="เช่น 85"
          style="width: 100%"
        />
      </NFormItem>
      <NFormItem label="เปอร์เซ็นต์ความคืบหน้า (คำนวณอัตโนมัติ)">
        <NInputNumber
          v-model:value="form.progressPct"
          :min="0"
          :max="100"
          placeholder="เช่น 75"
          style="width: 100%"
        />
      </NFormItem>
      <NFormItem label="หมายเหตุ">
        <NInput
          v-model:value="form.note"
          type="textarea"
          placeholder="รายละเอียดเพิ่มเติม"
          :rows="2"
        />
      </NFormItem>
      <NFormItem label="URL หลักฐาน">
        <NInput v-model:value="form.evidenceUrl" placeholder="https://..." />
      </NFormItem>
    </NForm>
    <template #footer>
      <NSpace justify="end">
        <NButton @click="handleClose">ยกเลิก</NButton>
        <NButton type="primary" :loading="loading" @click="handleSave">บันทึก</NButton>
      </NSpace>
    </template>
  </NModal>
</template>