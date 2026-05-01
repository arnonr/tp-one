<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  NModal,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NButton,
  NSpace,
  useMessage,
} from 'naive-ui'
import type { Goal } from '@/types/plan'

const props = defineProps<{
  show: boolean
  goal?: Goal | null
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
    if (props.goal) {
      form.value = {
        name: props.goal.name,
        description: props.goal.description || '',
        sortOrder: props.goal.sortOrder,
      }
    } else {
      form.value = { name: '', description: '', sortOrder: 0 }
    }
  }
})

function handleSave() {
  if (!form.value.name.trim()) {
    message.warning('กรุณากรอกชื่อเป้าหมาย')
    return
  }
  emit('save', {
    name: form.value.name.trim(),
    description: form.value.description.trim(),
    sortOrder: form.value.sortOrder || undefined,
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
    :title="goal ? 'แก้ไขเป้าหมาย' : 'เพิ่มเป้าหมายใหม่'"
    style="width: 480px"
    @update:show="emit('update:show', $event)"
  >
    <NForm label-placement="top">
      <NFormItem label="ชื่อเป้าหมาย" required>
        <NInput v-model:value="form.name" placeholder="เช่น พัฒนาศักยภาพบุคลากร" />
      </NFormItem>
      <NFormItem label="รายละเอียด">
        <NInput
          v-model:value="form.description"
          type="textarea"
          placeholder="คำอธิบายเป้าหมาย (ถ้ามี)"
          :rows="3"
        />
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