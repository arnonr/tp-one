<script setup lang="ts">
import { computed } from 'vue'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import { THAI_MONTHS_SHORT } from '@/utils/thai'

const YEAR_OFFSET = 543

const props = withDefaults(defineProps<{
  value: number | null
  type?: 'date' | 'datetime'
  placeholder?: string
  clearable?: boolean
  disabled?: boolean
}>(), {
  type: 'date',
  placeholder: 'เลือกวันที่',
  clearable: true,
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:value', value: number | null): void
}>()

const modelValue = computed(() => {
  if (!props.value) return null
  return new Date(props.value)
})

function handleChange(value: any) {
  if (!value) {
    emit('update:value', null)
    return
  }
  emit('update:value', new Date(value).getTime())
}

function formatInput(date: Date): string {
  const d = date.getDate()
  const m = THAI_MONTHS_SHORT[date.getMonth()]
  const y = date.getFullYear() + YEAR_OFFSET
  return `${d} ${m} ${y}`
}

const thaiDayNames = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
</script>

<template>
  <VueDatePicker :model-value="modelValue" :placeholder="placeholder" :disabled="disabled"
    :time-config="{ enableTimePicker: type === 'datetime' }" :day-names="thaiDayNames" :formats="{ input: formatInput }"
    auto-apply :teleport="true" @update:model-value="handleChange">
    <template #month="{ value }">
      {{ THAI_MONTHS_SHORT[value] }}
    </template>
    <template #year="{ value }">
      {{ value + YEAR_OFFSET }}
    </template>
    <template #year-overlay-value="{ value }">
      {{ value + YEAR_OFFSET }}
    </template>
    <template #month-overlay-value="{ value }">
      {{ THAI_MONTHS_SHORT[value] }}
    </template>
  </VueDatePicker>
</template>

<style scoped>
:deep(.dp__input) {
  border-radius: var(--radius-md, 3px);
  font-family: inherit;
  height: 34px;
  font-size: 14px;
}
</style>
