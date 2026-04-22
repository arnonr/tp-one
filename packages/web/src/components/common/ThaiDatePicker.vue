<script setup lang="ts">
import { computed } from 'vue'
import { NDatePicker } from 'naive-ui'

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

const buddhistValue = computed<number | null>(() => {
  if (!props.value) return null
  const d = new Date(props.value)
  d.setFullYear(d.getFullYear() + YEAR_OFFSET)
  return d.getTime()
})

const defaultCalendarValue = computed(() => {
  const now = new Date()
  now.setFullYear(now.getFullYear() + YEAR_OFFSET)
  return now.getTime()
})

function handleChange(ts: number | null) {
  if (!ts) {
    emit('update:value', null)
    return
  }
  const d = new Date(ts)
  d.setFullYear(d.getFullYear() - YEAR_OFFSET)
  emit('update:value', d.getTime())
}
</script>

<template>
  <NDatePicker
    :value="buddhistValue"
    :default-value="defaultCalendarValue"
    :type="type"
    :placeholder="placeholder"
    :clearable="clearable"
    :disabled="disabled"
    format="dd/MM/yyyy"
    style="width: 100%"
    @update:value="handleChange"
  />
</template>
