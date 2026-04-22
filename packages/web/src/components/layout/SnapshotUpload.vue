<script setup lang="ts">
import { ref, computed } from "vue";
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
  NSpin,
  useMessage,
  type SelectOption,
} from "naive-ui";
import { CloudUploadOutline, CloseOutline, ImageOutline, TrashOutline } from "@vicons/ionicons5";
import { snapshotService } from "@/services/snapshot";
import { useWorkspaceStore } from "@/stores/workspace";

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "uploaded"): void;
}>();

const message = useMessage();
const wsStore = useWorkspaceStore();

const isSubmitting = ref(false);
const selectedFiles = ref<{ file: File; preview: string }[]>([]);
const fileInputRef = ref<HTMLInputElement | null>(null);

const formData = ref({
  workspaceId: "",
  eventName: "",
  evidenceType: "",
  takenDate: "",
  description: "",
});

const evidenceTypeOptions: SelectOption[] = [
  { label: "ประชุม", value: "meeting" },
  { label: "กิจกรรม", value: "activity" },
  { label: "เวิร์กช็อป", value: "workshop" },
  { label: "สัมมนา", value: "seminar" },
  { label: "อบรม", value: "training" },
  { label: "ลงพื้นที่", value: "visit" },
  { label: "ความคืบหน้า", value: "progress" },
  { label: "เสร็จสิ้น", value: "completion" },
  { label: "อื่นๆ", value: "other" },
];

const workspaceOptions = computed<SelectOption[]>(() =>
  wsStore.workspaces.map((ws) => ({ label: ws.name, value: ws.id }))
);

const isFormValid = computed(() =>
  formData.value.workspaceId &&
  formData.value.eventName &&
  formData.value.evidenceType &&
  formData.value.takenDate &&
  selectedFiles.value.length > 0
);

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files) return;

  const newFiles = Array.from(input.files).map((file) => ({
    file,
    preview: URL.createObjectURL(file),
  }));

  selectedFiles.value = [...selectedFiles.value, ...newFiles];
  input.value = "";
}

function removeFile(index: number) {
  URL.revokeObjectURL(selectedFiles.value[index].preview);
  selectedFiles.value.splice(index, 1);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function handleSubmit() {
  if (!isFormValid.value || isSubmitting.value) return;

  isSubmitting.value = true;
  try {
    const files = selectedFiles.value.map((f) => f.file);
    await snapshotService.uploadSnapshots(
      {
        workspaceId: formData.value.workspaceId,
        eventName: formData.value.eventName,
        evidenceType: formData.value.evidenceType,
        takenDate: formData.value.takenDate,
        description: formData.value.description || undefined,
      },
      files
    );
    message.success(`อัปโหลดรูปภาพ ${files.length} รูปสำเร็จ`);
    handleClose();
    emit("uploaded");
  } catch (err: any) {
    message.error(err?.response?.data?.error?.message || "เกิดข้อผิดพลาดในการอัปโหลด");
  } finally {
    isSubmitting.value = false;
  }
}

function handleClose() {
  selectedFiles.value.forEach((f) => URL.revokeObjectURL(f.preview));
  selectedFiles.value = [];
  formData.value = { workspaceId: "", eventName: "", evidenceType: "", takenDate: "", description: "" };
  emit("close");
}
</script>

<template>
  <NModal :show="show" @update:show="(v) => !v && handleClose()">
    <NCard
      style="width: 600px; max-width: 95vw"
      :bordered="false"
      size="huge"
      role="dialog"
      aria-modal="true"
    >
      <template #header>
        <div class="snapshot-header">
          <span class="snapshot-header-title">อัปโหลดภาพหลักฐาน</span>
          <button class="snapshot-close-btn" @click="handleClose">
            <NIcon :size="20">
              <CloseOutline />
            </NIcon>
          </button>
        </div>
      </template>

      <div class="snapshot-form">
        <NForm label-placement="top">
          <div class="form-row">
            <NFormItem label="พื้นที่ทำงาน" class="form-item-half">
              <NSelect
                v-model:value="formData.workspaceId"
                :options="workspaceOptions"
                placeholder="เลือกพื้นที่ทำงาน"
              />
            </NFormItem>
            <NFormItem label="ประเภทภาพ" class="form-item-half">
              <NSelect
                v-model:value="formData.evidenceType"
                :options="evidenceTypeOptions"
                placeholder="เลือกประเภท"
              />
            </NFormItem>
          </div>

          <NFormItem label="ชื่อกิจกรรม/โครงการ">
            <NInput
              v-model:value="formData.eventName"
              placeholder="เช่น งานสัมมนาเทคโนโลยี 2569"
            />
          </NFormItem>

          <div class="form-row">
            <NFormItem label="วันที่ถ่ายภาพ" class="form-item-half">
              <NInput
                v-model:value="formData.takenDate"
                placeholder="YYYY-MM-DD"
              />
            </NFormItem>
          </div>

          <NFormItem label="รายละเอียด (ไม่บังคับ)">
            <NInput
              v-model:value="formData.description"
              type="textarea"
              :rows="2"
              placeholder="คำอธิบายเพิ่มเติม..."
            />
          </NFormItem>
        </NForm>

        <!-- File Drop Zone -->
        <div
          class="upload-zone"
          role="button"
          tabindex="0"
          @click="fileInputRef?.click()"
          @keydown.enter="fileInputRef?.click()"
          @keydown.space.prevent="fileInputRef?.click()"
        >
          <input
            ref="fileInputRef"
            type="file"
            accept="image/*"
            multiple
            style="display: none"
            @change="handleFileSelect"
          />
          <NIcon :size="48" class="upload-icon">
            <CloudUploadOutline />
          </NIcon>
          <p class="upload-text">คลิกหรือลากไฟล์มาวางที่นี่</p>
          <p class="upload-hint">รองรับ JPG, PNG, WebP (ไม่เกิน 10 MB ต่อไฟล์)</p>
        </div>

        <!-- Preview Grid -->
        <div v-if="selectedFiles.length > 0" class="file-preview-grid">
          <div v-for="(item, index) in selectedFiles" :key="index" class="preview-item">
            <img :src="item.preview" class="preview-image" />
            <button class="preview-remove" @click="removeFile(index)">
              <NIcon :size="14">
                <CloseOutline />
              </NIcon>
            </button>
            <div class="preview-info">
              <span class="preview-name">{{ item.file.name }}</span>
              <span class="preview-size">{{ formatFileSize(item.file.size) }}</span>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="snapshot-footer">
          <NSpace justify="end">
            <NButton @click="handleClose">ยกเลิก</NButton>
            <NButton
              type="primary"
              :loading="isSubmitting"
              :disabled="!isFormValid"
              @click="handleSubmit"
            >
              <template #icon>
                <NIcon>
                  <CloudUploadOutline />
                </NIcon>
              </template>
              อัปโหลด {{ selectedFiles.length > 0 ? `(${selectedFiles.length})` : "" }}
            </NButton>
          </NSpace>
        </div>
      </template>
    </NCard>
  </NModal>
</template>

<style scoped>
.snapshot-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
}

.snapshot-header-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}

.snapshot-close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all var(--duration-fast) var(--ease-out);
}

.snapshot-close-btn:hover {
  background: var(--color-surface-variant);
  color: var(--color-text);
}

.snapshot-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-item-half {
  flex: 1;
}

.upload-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  border: 2px dashed var(--color-border);
  border-radius: 12px;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  background: var(--color-surface-variant);
}

.upload-zone:hover,
.upload-zone:focus-visible {
  border-color: var(--color-primary);
  background: rgba(59, 130, 246, 0.05);
}

.upload-icon {
  color: var(--color-text-tertiary);
  margin-bottom: 8px;
}

.upload-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  margin: 0 0 4px;
}

.upload-hint {
  font-size: 12px;
  color: var(--color-text-tertiary);
  margin: 0;
}

.file-preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
  max-height: 240px;
  overflow-y: auto;
}

.preview-item {
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
}

.preview-image {
  width: 100%;
  height: 100px;
  object-fit: cover;
}

.preview-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  color: white;
  transition: background var(--duration-fast) var(--ease-out);
}

.preview-remove:hover {
  background: rgba(239, 68, 68, 0.9);
}

.preview-info {
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.preview-name {
  font-size: 11px;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-size {
  font-size: 10px;
  color: var(--color-text-tertiary);
}

.snapshot-footer {
  padding-top: 8px;
  border-top: 1px solid var(--color-border);
}
</style>
