<script setup lang="ts">
import { NSelect } from 'naive-ui'
import { useFiscalYear } from '@/composables/useFiscalYear'

const props = defineProps<{
  modelValue: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const { fyOptions } = useFiscalYear()

function handleUpdate(value: number) {
  emit('update:modelValue', value)
}
</script>

<template>
  <NSelect
    :value="props.modelValue"
    :options="fyOptions"
    filterable
    placeholder="เลือกปีงบประมาณ"
    @update:value="handleUpdate"
  />
</template>