<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  NModal,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NSelect,
  NButton,
  NSpace,
  useMessage,
} from 'naive-ui'
import type { Indicator } from '@/types/plan'

const props = defineProps<{
  show: boolean
  indicator?: Indicator | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  save: [payload: {
    name: string
    description?: string
    targetValue: string
    unit?: string
    indicatorType?: 'amount' | 'count' | 'percentage'
    weight?: number
  }]
}>()

const message = useMessage()

const INDICATOR_TYPE_OPTIONS = [
  { label: 'จำนวน (amount)', value: 'amount' },
  { label: 'จำนวนนับ (count)', value: 'count' },
  { label: 'เปอร์เซ็นต์ (%)', value: 'percentage' },
]

const form = ref({
  name: '',
  description: '',
  targetValue: null as number | null,
  unit: '',
  indicatorType: 'amount' as 'amount' | 'count' | 'percentage',
  weight: 1,
})

watch(() => props.show, (val) => {
  if (val) {
    if (props.indicator) {
      form.value = {
        name: props.indicator.name,
        description: props.indicator.description || '',
        targetValue: props.indicator.targetValue ? parseFloat(props.indicator.targetValue) : null,
        unit: props.indicator.unit || '',
        indicatorType: props.indicator.indicatorType,
        weight: props.indicator.weight || 1,
      }
    } else {
      form.value = {
        name: '',
        description: '',
        targetValue: null,
        unit: '',
        indicatorType: 'amount',
        weight: 1,
      }
    }
  }
})

function handleSave() {
  if (!form.value.name.trim()) {
    message.warning('กรุณากรอกชื่อตัวชี้วัด')
    return
  }
  if (!form.value.targetValue) {
    message.warning('กรุณากรอกค่าเป้าหมาย')
    return
  }
  emit('save', {
    name: form.value.name.trim(),
    description: form.value.description.trim(),
    targetValue: form.value.targetValue?.toString() || '',
    unit: form.value.unit.trim() || undefined,
    indicatorType: form.value.indicatorType,
    weight: form.value.weight || 1,
  })
  emit('update:show', false)
}

function handleClose() {
  emit('update:show', false)
}
</script>

<template>
  <NModal
    :show="show"
    preset="card"
    :title="indicator ? 'แก้ไขตัวชี้วัด' : 'เพิ่มตัวชี้วัดใหม่'"
    style="width: 520px"
    @update:show="emit('update:show', $event)"
  >
    <NForm label-placement="top">
      <NFormItem label="ชื่อตัวชี้วัด" required>
        <NInput v-model:value="form.name" placeholder="เช่น จำนวนผู้เช่าพื้นที่" />
      </NFormItem>
      <NFormItem label="รายละเอียด">
        <NInput
          v-model:value="form.description"
          type="textarea"
          placeholder="คำอธิบายตัวชี้วัด (ถ้ามี)"
          :rows="2"
        />
      </NFormItem>
      <NFormItem label="ค่าเป้าหมาย" required>
        <NInputNumber
          v-model:value="form.targetValue"
          :min="0"
          :precision="2"
          placeholder="เช่น 30"
          style="width: 100%"
        />
      </NFormItem>
      <NFormItem label="หน่วย">
        <NInput v-model:value="form.unit" placeholder="เช่น ราย, ครั้ง, บาท" />
      </NFormItem>
      <NFormItem label="ประเภท">
        <NSelect v-model:value="form.indicatorType" :options="INDICATOR_TYPE_OPTIONS" />
      </NFormItem>
      <NFormItem label="น้ำหนัก (weight)">
        <NInputNumber v-model:value="form.weight" :min="0.1" :max="10" :precision="1" style="width: 100%" />
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