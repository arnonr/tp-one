<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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

interface AuditLogGroup {
  key: string
  action: string
  changedAt: string
  changedByName?: string
  fields: Array<{ fieldName: string; oldValue?: string; newValue?: string }>
  reason?: string
  entries: IndicatorAuditLogEntry[]
}

const groupedLogs = computed<AuditLogGroup[]>(() => {
  const map = new Map<string, AuditLogGroup>()
  for (const entry of logs.value) {
    const key = `${entry.changedAt}-${entry.action}-${entry.changedBy}`
    if (!map.has(key)) {
      map.set(key, {
        key,
        action: entry.action,
        changedAt: entry.changedAt,
        changedByName: entry.changedByName,
        fields: [],
        reason: entry.reason,
        entries: [entry],
      })
    }
    if (entry.fieldName) {
      map.get(key)!.fields.push({
        fieldName: entry.fieldName,
        oldValue: entry.oldValue,
        newValue: entry.newValue,
      })
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
  )
})

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
  reportedValue: 'ค่าที่รายงาน',
  note: 'หมายเหตุ',
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


function handleRevertClick(group: AuditLogGroup) {
  revertTarget.value = group.entries[0]
  revertReason.value = ''
  showRevertModal.value = true
}

async function confirmRevert() {
  if (!revertTarget.value || !revertReason.value.trim()) return
  reverting.value = true
  try {
    const group = groupedLogs.value.find(g => g.entries[0].id === revertTarget.value!.id)
    if (group) {
      for (const entry of group.entries) {
        await revertIndicator(props.indicatorId, entry.id, revertReason.value.trim())
      }
    }
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
      <NTimeline v-if="groupedLogs.length > 0">
        <NTimelineItem
          v-for="group in groupedLogs"
          :key="group.key"
          :type="actionColors[group.action] ?? 'default'"
        >
          <div class="audit-entry">
            <div class="audit-meta">
              <NTag :type="actionColors[group.action]" size="small" :bordered="false">
                {{ actionLabels[group.action] }}
              </NTag>
              <NText depth="3" class="audit-time">{{ formatThaiDateTime(group.changedAt) }}</NText>
              <NText depth="2">โดย {{ group.changedByName ?? '-' }}</NText>
            </div>
            <div v-for="field in group.fields" :key="field.fieldName" class="audit-detail">
              <NText depth="3">{{ fieldLabels[field.fieldName] ?? field.fieldName }}:</NText>
              <NText>{{ field.oldValue ?? '-' }} → {{ field.newValue ?? '-' }}</NText>
            </div>
            <div v-if="group.reason" class="audit-reason">
              <NText depth="3">เหตุผล: {{ group.reason }}</NText>
            </div>
            <NButton
              v-if="isAdmin && group.action !== 'deleted'"
              size="tiny"
              type="warning"
              quaternary
              @click="handleRevertClick(group)"
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
