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
import RichTextEditor from '@/components/common/RichTextEditor.vue'

const props = defineProps<{
  show: boolean
  indicatorId: string
  indicatorName: string
  targetValue: string
  lastReportedValue?: string | number | null
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
    const initialValue = props.lastReportedValue !== undefined && props.lastReportedValue !== null && props.lastReportedValue !== '' ? Number(props.lastReportedValue) : null
    form.value = {
      reportedDate: now.getTime(),
      reportedValue: initialValue,
      progressPct: calcProgress(initialValue, props.targetValue),
      note: '',
      evidenceUrl: '',
    }
  }
}, { immediate: true })

function calcProgress(val: number | null, target: string): number | null {
  if (val === null || !target) return null
  const targetNum = parseFloat(target)
  if (isNaN(val) || isNaN(targetNum) || targetNum === 0) return null
  return Math.round((val / targetNum) * 100)
}

watch(() => form.value.reportedValue, (val) => {
  form.value.progressPct = calcProgress(val, props.targetValue)
}, { flush: 'sync' })

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
  <NModal :show="show" preset="card" :title="`รายงานความคืบหน้า: ${indicatorName}`" style="width: 520px"
    @update:show="emit('update:show', $event)">
    <NForm label-placement="top">
      <NFormItem label="วันที่รายงาน">
        <ThaiDatePicker v-model:value="form.reportedDate" type="date" placeholder="เลือกวันที่รายงาน"
          style="width: 100%" />
      </NFormItem>
      <NFormItem :label="`ค่าที่รายงาน (เป้าหมาย: ${targetValue})`" required>
        <input v-model.number="form.reportedValue" type="number" :min="0" step="0.01" placeholder="เช่น 85"
          class="n-input-number" style="width: 100%; padding: 6px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;"
          @input="() => { form.progressPct = calcProgress(form.reportedValue, targetValue) }" />
      </NFormItem>
      <NFormItem label="เปอร์เซ็นต์ความคืบหน้า (คำนวณอัตโนมัติ)">
        <NInputNumber :value="form.progressPct" :min="0" :max="100" placeholder="เช่น 75" disabled style="width: 100%" />
      </NFormItem>
      <NFormItem label="หมายเหตุ">
        <RichTextEditor v-model="form.note" placeholder="รายละเอียดเพิ่มเติม" :min-height="'200px'" style="width: 100%" />
      </NFormItem>
      <NFormItem label="URL (ถ้ามี)">
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