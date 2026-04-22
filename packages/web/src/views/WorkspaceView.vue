<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  NCard,
  NButton,
  NSpace,
  NModal,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NColorPicker,
  NDataTable,
  NTabs,
  NTabPane,
  NTag,
  NEmpty,
  NSpin,
  useMessage,
  type DataTableColumns,
} from 'naive-ui'
import { h } from 'vue'
import { workspaceService } from '@/services/workspace'
import { userService } from '@/services/user'
import { useAuthStore } from '@/stores/auth'
import ActionButtons from '@/components/common/ActionButtons.vue'
import type { Workspace, WorkspaceType, WorkspaceMemberRole } from '@/types'
import type { WorkspaceMember, WorkspaceStatus } from '@/services/workspace'

const message = useMessage()
const authStore = useAuthStore()

const loading = ref(false)
const workspaces = ref<Workspace[]>([])
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showDetailModal = ref(false)
const selectedWorkspace = ref<Workspace | null>(null)

// Detail tabs data
const statuses = ref<WorkspaceStatus[]>([])
const members = ref<WorkspaceMember[]>([])
const detailLoading = ref(false)

// Form state
const formDefaults = { name: '', type: 'general' as WorkspaceType, color: '#3B82F6', description: '' }
const form = ref({ ...formDefaults })

const TYPE_OPTIONS = [
  { label: 'เช่าพื้นที่/ห้องประชุม', value: 'rental' },
  { label: 'ที่ปรึกษา/วิจัย', value: 'consulting' },
  { label: 'อบรม/สัมนา', value: 'training' },
  { label: 'บ่มเพาะ/Incubation', value: 'incubation' },
  { label: 'ทั่วไป', value: 'general' },
]

const TYPE_LABELS: Record<WorkspaceType, string> = {
  rental: 'เช่าพื้นที่',
  consulting: 'ที่ปรึกษา/วิจัย',
  training: 'อบรม/สัมนา',
  incubation: 'บ่มเพาะ',
  general: 'ทั่วไป',
}

const ROLE_LABELS: Record<WorkspaceMemberRole, string> = {
  owner: 'เจ้าของ',
  editor: 'แก้ไข',
  viewer: 'ดู',
}

const ROLE_COLORS: Record<WorkspaceMemberRole, string> = {
  owner: 'success',
  editor: 'info',
  viewer: 'default',
}

const isAdmin = computed(() => authStore.user?.role === 'admin')

// Status form
const showStatusModal = ref(false)
const statusForm = ref({ name: '', color: '#10B981', sortOrder: '0', isDefault: false })

// Member form
const showMemberModal = ref(false)
const memberForm = ref({ userId: '', role: 'viewer' as WorkspaceMemberRole })
const userSearchOptions = ref<{ label: string; value: string }[]>([])
const userSearchLoading = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | null = null

async function fetchWorkspaces() {
  loading.value = true
  try {
    workspaces.value = await workspaceService.list()
  } catch {
    message.error('โหลดข้อมูลพื้นที่ทำงานไม่สำเร็จ')
  } finally {
    loading.value = false
  }
}

async function openDetail(ws: Workspace) {
  selectedWorkspace.value = ws
  showDetailModal.value = true
  detailLoading.value = true
  try {
    const [s, m] = await Promise.all([
      workspaceService.getStatuses(ws.id),
      workspaceService.getMembers(ws.id),
    ])
    statuses.value = s
    members.value = m
  } catch {
    message.error('โหลดรายละเอียดไม่สำเร็จ')
  } finally {
    detailLoading.value = false
  }
}

function openCreateModal() {
  form.value = { ...formDefaults }
  showCreateModal.value = true
}

function openEditModal(ws: Workspace) {
  form.value = { name: ws.name, type: ws.type, color: ws.color || '#3B82F6', description: ws.description || '' }
  selectedWorkspace.value = ws
  showEditModal.value = true
}

async function handleCreate() {
  if (!form.value.name.trim()) { message.warning('กรุณากรอกชื่อพื้นที่ทำงาน'); return }
  try {
    await workspaceService.create({ name: form.value.name, type: form.value.type, color: form.value.color, description: form.value.description || undefined })
    message.success('สร้างพื้นที่ทำงานสำเร็จ')
    showCreateModal.value = false
    await fetchWorkspaces()
  } catch {
    message.error('สร้างไม่สำเร็จ')
  }
}

async function handleEdit() {
  if (!selectedWorkspace.value) return
  try {
    await workspaceService.update(selectedWorkspace.value.id, { name: form.value.name, color: form.value.color, description: form.value.description || undefined })
    message.success('แก้ไขสำเร็จ')
    showEditModal.value = false
    await fetchWorkspaces()
  } catch {
    message.error('แก้ไขไม่สำเร็จ')
  }
}

async function handleDelete(ws: Workspace) {
  try {
    await workspaceService.remove(ws.id)
    message.success('ลบพื้นที่ทำงานสำเร็จ')
    await fetchWorkspaces()
  } catch {
    message.error('ลบไม่สำเร็จ')
  }
}

// Status CRUD
function openStatusModal() {
  statusForm.value = { name: '', color: '#10B981', sortOrder: '0', isDefault: false }
  showStatusModal.value = true
}

async function handleCreateStatus() {
  if (!selectedWorkspace.value || !statusForm.value.name.trim()) return
  try {
    await workspaceService.createStatus(selectedWorkspace.value.id, statusForm.value)
    message.success('เพิ่มสถานะสำเร็จ')
    showStatusModal.value = false
    statuses.value = await workspaceService.getStatuses(selectedWorkspace.value.id)
  } catch {
    message.error('เพิ่มสถานะไม่สำเร็จ')
  }
}

async function handleDeleteStatus(statusId: string) {
  if (!selectedWorkspace.value) return
  try {
    await workspaceService.deleteStatus(statusId)
    message.success('ลบสถานะสำเร็จ')
    statuses.value = await workspaceService.getStatuses(selectedWorkspace.value.id)
  } catch {
    message.error('ลบสถานะไม่สำเร็จ')
  }
}

function handleUserSearch(query: string) {
  if (searchTimer) clearTimeout(searchTimer)
  if (!query.trim()) { userSearchOptions.value = []; return }
  searchTimer = setTimeout(async () => {
    userSearchLoading.value = true
    try {
      const results = await userService.search(query)
      userSearchOptions.value = results.map(u => ({
        label: `${u.name} (${u.email})`,
        value: u.id,
      }))
    } finally {
      userSearchLoading.value = false
    }
  }, 300)
}

// Member CRUD
function openMemberModal() {
  memberForm.value = { userId: '', role: 'viewer' }
  userSearchOptions.value = []
  userSearchLoading.value = false
  showMemberModal.value = true
}

async function handleAddMember() {
  if (!selectedWorkspace.value || !memberForm.value.userId.trim()) return
  try {
    await workspaceService.addMember(selectedWorkspace.value.id, memberForm.value.userId, memberForm.value.role)
    message.success('เพิ่มสมาชิกสำเร็จ')
    showMemberModal.value = false
    members.value = await workspaceService.getMembers(selectedWorkspace.value.id)
  } catch {
    message.error('เพิ่มสมาชิกไม่สำเร็จ')
  }
}

async function handleRemoveMember(userId: string) {
  if (!selectedWorkspace.value) return
  try {
    await workspaceService.removeMember(selectedWorkspace.value.id, userId)
    message.success('ลบสมาชิกสำเร็จ')
    members.value = await workspaceService.getMembers(selectedWorkspace.value.id)
  } catch {
    message.error('ลบสมาชิกไม่สำเร็จ')
  }
}

const workspaceColumns: DataTableColumns<Workspace> = [
  {
    title: 'ชื่อพื้นที่ทำงาน',
    key: 'name',
    render(row) {
      return h('div', { style: 'display:flex; align-items:center; gap:10px; cursor:pointer', onClick: () => openDetail(row) }, [
        h('div', { style: `width:12px; height:12px; border-radius:3px; background:${row.color || '#6B7280'}; flex-shrink:0` }),
        h('div', {}, [
          h('div', { style: 'font-weight:600' }, row.name),
          h('div', { style: 'font-size:12px; color:var(--color-text-tertiary)' }, row.description || ''),
        ]),
      ])
    },
  },
  {
    title: 'ประเภท',
    key: 'type',
    width: 160,
    render(row) {
      return h(NTag, { size: 'small', bordered: false, type: 'info' }, { default: () => TYPE_LABELS[row.type] })
    },
  },
  {
    title: '',
    key: 'actions',
    width: 100,
    align: 'right',
    render(row) {
      return h(ActionButtons, {
        deleteMessage: `ลบ "${row.name}"?`,
        onEdit: () => openEditModal(row),
        onDelete: () => handleDelete(row),
      })
    },
  },
]

const statusColumns: DataTableColumns<WorkspaceStatus> = [
  { title: 'สถานะ', key: 'name', render(row) {
    return h('div', { style: 'display:flex; align-items:center; gap:8px' }, [
      h('div', { style: `width:10px; height:10px; border-radius:50%; background:${row.color || '#6B7280'}` }),
      row.name,
      row.isDefault ? h(NTag, { size: 'tiny', type: 'success', bordered: false }, { default: () => 'ค่าเริ่มต้น' }) : null,
    ])
  }},
  { title: 'ลำดับ', key: 'sortOrder', width: 80 },
  { title: '', key: 'actions', width: 60, align: 'right', render(row) {
    return h(ActionButtons, {
      size: 'tiny',
      showEdit: false,
      deleteMessage: `ลบสถานะ "${row.name}"?`,
      onDelete: () => handleDeleteStatus(row.id),
    })
  }},
]

const memberColumns: DataTableColumns<WorkspaceMember> = [
  { title: 'ชื่อ', key: 'name' },
  { title: 'อีเมล', key: 'email' },
  { title: 'บทบาท', key: 'role', width: 120, render(row) {
    return h(NTag, { size: 'small', type: ROLE_COLORS[row.role] as any, bordered: false }, { default: () => ROLE_LABELS[row.role] })
  }},
  { title: '', key: 'actions', width: 60, align: 'right', render(row) {
    if (row.role === 'owner') return null
    return h(ActionButtons, {
      size: 'tiny',
      showEdit: false,
      deleteMessage: 'ลบสมาชิกคนนี้?',
      onDelete: () => handleRemoveMember(row.userId),
    })
  }},
]

onMounted(fetchWorkspaces)
</script>

<template>
  <NSpin :show="loading">
    <NCard :bordered="false" style="border-radius: 12px">
      <template #header>
        <div style="display:flex; align-items:center; justify-content:space-between">
          <span style="font-size:18px; font-weight:700">พื้นที่ทำงาน</span>
          <NButton type="primary" size="small" @click="openCreateModal">+ สร้างพื้นที่ทำงาน</NButton>
        </div>
      </template>

      <NEmpty v-if="!workspaces.length && !loading" description="ยังไม่มีพื้นที่ทำงาน" />
      <NDataTable v-else :columns="workspaceColumns" :data="workspaces" :bordered="false" :pagination="{ pageSize: 20 }" :row-key="(r: Workspace) => r.id" />
    </NCard>
  </NSpin>

  <!-- Create Modal -->
  <NModal v-model:show="showCreateModal" preset="dialog" title="สร้างพื้นที่ทำงานใหม่" positive-text="สร้าง" negative-text="ยกเลิก" @positive-click="handleCreate">
    <NForm label-placement="left" label-width="90">
      <NFormItem label="ชื่อ"><NInput v-model:value="form.name" placeholder="เช่น ฝ่ายเช่าพื้นที่" /></NFormItem>
      <NFormItem label="ประเภท"><NSelect v-model:value="form.type" :options="TYPE_OPTIONS" /></NFormItem>
      <NFormItem label="สี"><NColorPicker v-model:value="form.color" :modes="['hex']" :show-alpha="false" :swatches="['#3B82F6','#EF4444','#10B981','#F59E0B','#8B5CF6','#EC4899','#6B7280']" /></NFormItem>
      <NFormItem label="คำอธิบาย"><NInput v-model:value="form.description" type="textarea" :rows="2" placeholder="คำอธิบาย (ไม่บังคับ)" /></NFormItem>
    </NForm>
  </NModal>

  <!-- Edit Modal -->
  <NModal v-model:show="showEditModal" preset="dialog" title="แก้ไขพื้นที่ทำงาน" positive-text="บันทึก" negative-text="ยกเลิก" @positive-click="handleEdit">
    <NForm label-placement="left" label-width="90">
      <NFormItem label="ชื่อ"><NInput v-model:value="form.name" /></NFormItem>
      <NFormItem label="สี"><NColorPicker v-model:value="form.color" :modes="['hex']" :show-alpha="false" :swatches="['#3B82F6','#EF4444','#10B981','#F59E0B','#8B5CF6','#EC4899','#6B7280']" /></NFormItem>
      <NFormItem label="คำอธิบาย"><NInput v-model:value="form.description" type="textarea" :rows="2" /></NFormItem>
    </NForm>
  </NModal>

  <!-- Detail Modal -->
  <NModal v-model:show="showDetailModal" preset="card" :title="selectedWorkspace?.name || 'พื้นที่ทำงาน'" style="width: 680px; max-width: 95vw">
    <NSpin :show="detailLoading">
      <NTabs type="line" animated>
        <NTabPane name="statuses" tab="สถานะ">
          <div style="display:flex; justify-content:flex-end; margin-bottom:12px">
            <NButton size="small" @click="openStatusModal">+ เพิ่มสถานะ</NButton>
          </div>
          <NDataTable v-if="statuses.length" :columns="statusColumns" :data="statuses" :bordered="false" size="small" :row-key="(r: any) => r.id" />
          <NEmpty v-else description="ยังไม่มีสถานะ" />
        </NTabPane>

        <NTabPane name="members" tab="สมาชิก">
          <div style="display:flex; justify-content:flex-end; margin-bottom:12px">
            <NButton size="small" @click="openMemberModal">+ เพิ่มสมาชิก</NButton>
          </div>
          <NDataTable v-if="members.length" :columns="memberColumns" :data="members" :bordered="false" size="small" :row-key="(r: any) => r.userId" />
          <NEmpty v-else description="ยังไม่มีสมาชิก" />
        </NTabPane>
      </NTabs>
    </NSpin>
  </NModal>

  <!-- Create Status Modal -->
  <NModal v-model:show="showStatusModal" preset="dialog" title="เพิ่มสถานะใหม่" positive-text="เพิ่ม" negative-text="ยกเลิก" @positive-click="handleCreateStatus">
    <NForm label-placement="left" label-width="90">
      <NFormItem label="ชื่อสถานะ"><NInput v-model:value="statusForm.name" placeholder="เช่น รับแจ้ง" /></NFormItem>
      <NFormItem label="สี"><NColorPicker v-model:value="statusForm.color" :modes="['hex']" :show-alpha="false" :swatches="['#10B981','#3B82F6','#F59E0B','#EF4444','#8B5CF6','#EC4899','#6B7280']" /></NFormItem>
      <NFormItem label="ลำดับ"><NInput v-model:value="statusForm.sortOrder" placeholder="0" /></NFormItem>
    </NForm>
  </NModal>

  <!-- Add Member Modal -->
  <NModal v-model:show="showMemberModal" preset="dialog" title="เพิ่มสมาชิก" positive-text="เพิ่ม" negative-text="ยกเลิก" @positive-click="handleAddMember">
    <NForm label-placement="left" label-width="70">
      <NFormItem label="ผู้ใช้">
        <NSelect
          v-model:value="memberForm.userId"
          filterable
          remote
          :loading="userSearchLoading"
          :options="userSearchOptions"
          placeholder="พิมพ์ชื่อหรืออีเมลเพื่อค้นหา"
          clearable
          @search="handleUserSearch"
        />
      </NFormItem>
      <NFormItem label="บทบาท">
        <NSelect v-model:value="memberForm.role" :options="[
          { label: 'เจ้าของ', value: 'owner' },
          { label: 'แก้ไข', value: 'editor' },
          { label: 'ดู', value: 'viewer' },
        ]" />
      </NFormItem>
    </NForm>
  </NModal>
</template>

<style scoped>
:deep(.n-data-table .n-data-table-td) {
  padding: 10px 12px;
}
</style>
