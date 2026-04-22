<script setup lang="ts">
import { NButton, NPopconfirm, NSpace, NTooltip, NIcon } from 'naive-ui'
import { CreateOutline, TrashOutline } from '@vicons/ionicons5'

withDefaults(defineProps<{
  deleteMessage?: string
  size?: 'tiny' | 'small'
  showEdit?: boolean
  showDelete?: boolean
}>(), {
  deleteMessage: 'ยืนยันการลบ?',
  size: 'small',
  showEdit: true,
  showDelete: true,
})

const emit = defineEmits<{
  (e: 'edit'): void
  (e: 'delete'): void
}>()
</script>

<template>
  <NSpace :size="2" align="center" @click.stop>
    <NTooltip v-if="showEdit" trigger="hover">
      <template #trigger>
        <NButton
          :size="size"
          circle
          class="btn-edit"
          @click.stop="emit('edit')"
        >
          <template #icon>
            <NIcon><CreateOutline /></NIcon>
          </template>
        </NButton>
      </template>
      แก้ไข
    </NTooltip>

    <NPopconfirm v-if="showDelete" :positive-text="'ลบ'" :negative-text="'ยกเลิก'" @positive-click="emit('delete')">
      <template #trigger>
        <NButton
          :size="size"
          circle
          class="btn-delete"
          @click.stop
        >
          <template #icon>
            <NIcon><TrashOutline /></NIcon>
          </template>
        </NButton>
      </template>
      {{ deleteMessage }}
    </NPopconfirm>
  </NSpace>
</template>

<style scoped>
.btn-edit {
  background-color: var(--color-primary-bg) !important;
  color: var(--color-primary) !important;
  border: none !important;
}
.btn-edit:hover {
  background-color: var(--color-primary-lighter) !important;
}

.btn-delete {
  background-color: var(--color-danger-bg) !important;
  color: var(--color-danger) !important;
  border: none !important;
}
.btn-delete:hover {
  background-color: var(--color-danger-light) !important;
}
</style>
