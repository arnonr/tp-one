import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { workspaceService } from '@/services/workspace'
import type { Workspace } from '@/types'

export const ALL_WORKSPACES_ID = '__ALL__'

const STORAGE_KEY = 'tp-one:workspace-id'

export const useWorkspaceStore = defineStore('workspace', () => {
  const workspaces = ref<Workspace[]>([])
  const currentWorkspaceId = ref<string | null>(localStorage.getItem(STORAGE_KEY))
  const loading = ref(false)

  const isAllWorkspaces = computed(() => currentWorkspaceId.value === null)

  const currentWorkspace = computed(() =>
    workspaces.value.find(ws => ws.id === currentWorkspaceId.value) ?? null
  )

  const selectorOptions = computed(() => [
    { label: 'ทุกพื้นที่ทำงาน', value: ALL_WORKSPACES_ID },
    ...workspaces.value.map(ws => ({ label: ws.name, value: ws.id })),
  ])

  async function fetchWorkspaces() {
    loading.value = true
    try {
      workspaces.value = await workspaceService.list()
    } finally {
      loading.value = false
    }
  }

  function setCurrentWorkspace(id: string | null) {
    currentWorkspaceId.value = id
    if (id) localStorage.setItem(STORAGE_KEY, id)
    else localStorage.removeItem(STORAGE_KEY)
  }

  return {
    workspaces,
    currentWorkspaceId,
    currentWorkspace,
    isAllWorkspaces,
    loading,
    selectorOptions,
    fetchWorkspaces,
    setCurrentWorkspace,
  }
})
