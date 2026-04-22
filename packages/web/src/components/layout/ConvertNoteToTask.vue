<script setup lang="ts">
import { ref, computed, watch } from "vue";
import {
  NModal,
  NCard,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NButton,
  NIcon,
  NSpace,
  useMessage,
} from "naive-ui";
import { CloseOutline, AddOutline } from "@vicons/ionicons5";
import { useWorkspaceStore } from "@/stores/workspace";
import { useAuthStore } from "@/stores/auth";
import { taskService } from "@/services/task";
import { workspaceService } from "@/services/workspace";
import type { QuickNote } from "@/services/quick-note";
import type { TaskPriority } from "@/types";

const props = defineProps<{
  note: QuickNote;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "converted"): void;
  (e: "task-created"): void;
}>();

const message = useMessage();
const wsStore = useWorkspaceStore();
const authStore = useAuthStore();

const isSubmitting = ref(false);
const members = ref<{ userId: string; name: string; email: string }[]>([]);

const selectedWorkspaceId = ref<string | null>(null);
const assigneeIds = ref<string[]>([]);
const priority = ref<TaskPriority>("normal");
const title = ref("");

const priorityOptions = [
  { label: "เร่งด่วน", value: "urgent" },
  { label: "สูง", value: "high" },
  { label: "ปกติ", value: "normal" },
  { label: "ต่ำ", value: "low" },
];

const workspaceOptions = computed(() =>
  wsStore.workspaces.map((ws) => ({
    label: ws.name,
    value: ws.id,
  }))
);

const assigneeOptions = computed(() =>
  members.value.map((m) => ({
    label: m.name || m.email,
    value: m.userId,
  }))
);

watch(
  () => props.note,
  (note) => {
    if (note) {
      title.value = note.content.slice(0, 500);
      selectedWorkspaceId.value = wsStore.currentWorkspaceId;
      assigneeIds.value = [];
      priority.value = "normal";
      if (wsStore.currentWorkspaceId) {
        loadMembers(wsStore.currentWorkspaceId);
      }
    }
  },
  { immediate: true }
);

watch(selectedWorkspaceId, async (wsId) => {
  if (wsId) {
    await loadMembers(wsId);
  } else {
    members.value = [];
  }
  assigneeIds.value = [];
});

async function loadMembers(workspaceId: string) {
  try {
    members.value = await workspaceService.getMembers(workspaceId);
  } catch {
    members.value = [];
  }
}

async function handleSubmit() {
  if (!selectedWorkspaceId.value) {
    message.warning("กรุณาเลือกพื้นที่ทำงาน");
    return;
  }
  if (!title.value.trim()) {
    message.warning("กรุณากรอกชื่องาน");
    return;
  }

  isSubmitting.value = true;
  try {
    await taskService.create({
      title: title.value.trim(),
      description: props.note.content,
      workspaceId: selectedWorkspaceId.value,
      assigneeIds: assigneeIds.value.length ? assigneeIds.value : undefined,
      // Reporter is automatically added as assignee in the backend
      priority: priority.value,
      reporterId: authStore.user?.id,
    });
    message.success("สร้างงานสำเร็จ");
    emit("converted");
    emit("task-created");
  } catch (err: any) {
    message.error(err?.message || "สร้างงานไม่สำเร็จ");
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <NModal
    :show="true"
    preset="card"
    title="แปลงบันทึกเป็นงาน"
    style="width: 480px"
    :mask-closable="false"
    @update:show="(v) => !v && emit('close')"
  >
    <NForm label-placement="top">
      <NFormItem label="ชื่องาน">
        <NInput
          v-model:value="title"
          placeholder="ชื่องาน"
          :maxlength="500"
          show-count
        />
      </NFormItem>

      <NFormItem label="พื้นที่ทำงาน" required>
        <NSelect
          v-model:value="selectedWorkspaceId"
          :options="workspaceOptions"
          placeholder="เลือกพื้นที่ทำงาน"
        />
      </NFormItem>

      <NFormItem label="ผู้รับผิดชอบ">
        <NSelect
          v-model:value="assigneeIds"
          :options="assigneeOptions"
          placeholder="เลือกผู้รับผิดชอบ"
          multiple
          clearable
          filterable
          :disabled="!selectedWorkspaceId"
        />
      </NFormItem>

      <NFormItem label="ความสำคัญ">
        <NSelect
          v-model:value="priority"
          :options="priorityOptions"
          placeholder="เลือกความสำคัญ"
        />
      </NFormItem>
    </NForm>

    <template #footer>
      <NSpace justify="end">
        <NButton @click="emit('close')">ยกเลิก</NButton>
        <NButton
          type="primary"
          :loading="isSubmitting"
          @click="handleSubmit"
        >
          <template #icon>
            <NIcon><AddOutline /></NIcon>
          </template>
          สร้างงาน
        </NButton>
      </NSpace>
    </template>

    <template #header-extra>
      <button
        style="background:none;border:none;cursor:pointer;padding:4px"
        @click="emit('close')"
      >
        <NIcon :size="20">
          <CloseOutline />
        </NIcon>
      </button>
    </template>
  </NModal>
</template>
