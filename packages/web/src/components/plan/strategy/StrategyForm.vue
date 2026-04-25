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
import type { Strategy } from '@/types/plan'

const props = defineProps<{
  show: boolean
  strategy?: Strategy | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  save: [payload: { name: string; description?: string; sortOrder?: number }]
}>()

const message = useMessage()

const form = ref({
  name: '',
  description: '',
  sortOrder: 0,
})

watch(() => props.show, (val) => {
  if (val) {
    if (props.strategy) {
      form.value = {
        name: props.strategy.name,
        description: props.strategy.description || '',
        sortOrder: props.strategy.sortOrder,
      }
    } else {
      form.value = { name: '', description: '', sortOrder: 0 }
    }
  }
})

function handleSave() {
  if (!form.value.name.trim()) {
    message.warning('กรุณากรอกชื่อกลยุทธ์')
    return
  }
  emit('save', {
    name: form.value.name.trim(),
    description: form.value.description.trim() || undefined,
    sortOrder: form.value.sortOrder || undefined,
  })
}

function handleClose() {
  emit('update:show', false)
}
</script>

<template>
  <NModal :show="show" preset="card" :title="strategy ? 'แก้ไขยุทธศาสตร์' : 'เพิ่มยุทธศาสตร์'" style="width: 480px"
    @update:show="emit('update:show', $event)">
    <NForm label-placement="top">
      <NFormItem label="ชื่อยุทธศาสตร์" required>
        <NInput v-model:value="form.name" placeholder="เช่น พัฒนาระบบบริการ" />
      </NFormItem>
      <NFormItem label="รายละเอียด">
        <NInput v-model:value="form.description" type="textarea" placeholder="คำอธิบายกลยุทธ์ (ถ้ามี)" :rows="3" />
      </NFormItem>
      <NFormItem label="ลำดับการแสดง">
        <NInputNumber v-model:value="form.sortOrder" :min="0" :max="999" style="width: 100%" />
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