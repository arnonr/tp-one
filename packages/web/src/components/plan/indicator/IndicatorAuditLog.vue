<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  NTimeline, NTimelineItem, NTag, NButton, NIcon, NSpin,
  NModal, NInput, NForm, NFormItem, NSpace, NText, NPagination,
} from 'naive-ui'
import { RefreshOutline, DownloadOutline } from '@vicons/ionicons5'
import type { IndicatorAuditLogEntry } from '@/types/plan'
import { formatThaiDateTime } from '@/utils/thai'
import { getIndicatorAuditLogs, revertIndicator, exportIndicatorAuditLogs } from '@/services/planApi'

const props = defineProps<{
  indicatorId: string
  isAdmin: boolean
}>()

const emit = defineEmits<{
  reverted: []
}>()

const logs = ref<IndicatorAuditLogEntry[]>([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const showRevertModal = ref(false)
const revertTarget = ref<IndicatorAuditLogEntry | null>(null)
const revertReason = ref('')
const reverting = ref(false)

const actionLabels: Record<string, string> = {
  created: 'สร้าง',
  updated: 'แก้ไข',
  deleted: 'ลบ',
  reverted: 'กู้คืน',
}

const actionColors: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
  created: 'success',
  updated: 'warning',
  deleted: 'error',
  reverted: 'info',
}

const fieldLabels: Record<string, string> = {
  name: 'ชื่อ',
  description: 'รายละเอียด',
  targetValue: 'ค่าเป้าหมาย',
  unit: 'หน่วย',
  indicatorType: 'ประเภท',
  weight: 'น้ำหนัก',
  sortOrder: 'ลำดับ',
}

async function fetchLogs() {
  loading.value = true
  try {
    const res = await getIndicatorAuditLogs(props.indicatorId, page.value, pageSize.value)
    logs.value = res.data
    total.value = res.total
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}


function handleRevertClick(entry: IndicatorAuditLogEntry) {
  revertTarget.value = entry
  revertReason.value = ''
  showRevertModal.value = true
}

async function confirmRevert() {
  if (!revertTarget.value || !revertReason.value.trim()) return
  reverting.value = true
  try {
    await revertIndicator(props.indicatorId, revertTarget.value.id, revertReason.value.trim())
    showRevertModal.value = false
    emit('reverted')
    await fetchLogs()
  } catch {
    // ignore
  } finally {
    reverting.value = false
  }
}

async function handleExport() {
  try {
    await exportIndicatorAuditLogs(props.indicatorId)
  } catch {
    // ignore
  }
}

function handlePageChange(p: number) {
  page.value = p
  fetchLogs()
}

onMounted(fetchLogs)
</script>

<template>
  <div class="audit-log">
    <div class="audit-log-header">
      <NText strong>ประวัติการเปลี่ยนแปลง</NText>
      <NSpace :size="8">
        <NButton size="tiny" quaternary @click="handleExport">
          <template #icon><NIcon><DownloadOutline /></NIcon></template>
          ส่งออก Excel
        </NButton>
        <NButton size="tiny" quaternary @click="fetchLogs">
          <template #icon><NIcon><RefreshOutline /></NIcon></template>
        </NButton>
      </NSpace>
    </div>

    <NSpin :show="loading">
      <NTimeline v-if="logs.length > 0">
        <NTimelineItem
          v-for="entry in logs"
          :key="entry.id"
          :type="actionColors[entry.action] ?? 'default'"
        >
          <div class="audit-entry">
            <div class="audit-meta">
              <NTag :type="actionColors[entry.action]" size="small" :bordered="false">
                {{ actionLabels[entry.action] }}
              </NTag>
              <NText depth="3" class="audit-time">{{ formatThaiDateTime(entry.changedAt) }}</NText>
              <NText depth="2">โดย {{ entry.changedByName ?? '-' }}</NText>
            </div>
            <div v-if="entry.fieldName" class="audit-detail">
              <NText depth="3">{{ fieldLabels[entry.fieldName] ?? entry.fieldName }}:</NText>
              <NText>{{ entry.oldValue ?? '-' }} → {{ entry.newValue ?? '-' }}</NText>
            </div>
            <div v-if="entry.reason" class="audit-reason">
              <NText depth="3">เหตุผล: {{ entry.reason }}</NText>
            </div>
            <NButton
              v-if="isAdmin && entry.action !== 'deleted'"
              size="tiny"
              type="warning"
              quaternary
              @click="handleRevertClick(entry)"
              style="margin-top: 4px"
            >
              กู้คืน
            </NButton>
          </div>
        </NTimelineItem>
      </NTimeline>
      <NText v-else-if="!loading" depth="3">ยังไม่มีประวัติการเปลี่ยนแปลง</NText>
    </NSpin>

    <NPagination
      v-if="total > pageSize"
      :page="page"
      :page-size="pageSize"
      :item-count="total"
      size="small"
      @update:page="handlePageChange"
      style="margin-top: 12px"
    />

    <NModal v-model:show="showRevertModal" preset="dialog" title="กู้คืนข้อมูล">
      <NForm>
        <NFormItem label="เหตุผลที่กู้คืน">
          <NInput
            v-model:value="revertReason"
            type="textarea"
            placeholder="ระบุเหตุผล..."
            :rows="3"
          />
        </NFormItem>
      </NForm>
      <template #action>
        <NSpace>
          <NButton @click="showRevertModal = false">ยกเลิก</NButton>
          <NButton type="warning" :loading="reverting" :disabled="!revertReason.trim()" @click="confirmRevert">
            กู้คืน
          </NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.audit-log {
  padding: 8px 0;
}
.audit-log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.audit-entry {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.audit-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
.audit-time {
  font-size: 12px;
}
.audit-detail {
  font-size: 13px;
  display: flex;
  gap: 4px;
}
.audit-reason {
  font-size: 12px;
  font-style: italic;
}
</style>
