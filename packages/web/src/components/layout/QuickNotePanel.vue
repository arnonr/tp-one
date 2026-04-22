<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import {
  NInput,
  NButton,
  NIcon,
  NEmpty,
  NSpin,
  NPopover,
  NSelect,
} from "naive-ui";
import {
  CloseOutline,
  PinOutline,
  ArchiveOutline,
  TrashOutline,
  AddOutline,
  DocumentTextOutline,
  EllipsisHorizontalOutline,
} from "@vicons/ionicons5";
import { useQuickNoteStore } from "@/stores/quick-note";
import { useWorkspaceStore } from "@/stores/workspace";

const noteStore = useQuickNoteStore();
const wsStore = useWorkspaceStore();

const newNoteContent = ref("");
const isSubmitting = ref(false);
const noteInputRef = ref<HTMLTextAreaElement | null>(null);
const showColorPicker = ref<string | null>(null);

const noteColors = [
  { label: "เทา", value: "#6b7280" },
  { label: "แดง", value: "#ef4444" },
  { label: "ส้ม", value: "#f97316" },
  { label: "เหลือง", value: "#eab308" },
  { label: "เขียว", value: "#22c55e" },
  { label: "ฟ้า", value: "#3b82f6" },
  { label: "ม่วง", value: "#a855f7" },
];

watch(
  () => noteStore.isPanelOpen,
  async (open) => {
    if (open) {
      await nextTick();
      noteInputRef.value?.focus();
    }
  }
);

async function handleAddNote() {
  if (!newNoteContent.value.trim() || isSubmitting.value) return;
  isSubmitting.value = true;
  try {
    await noteStore.addNote({ content: newNoteContent.value.trim() });
    newNoteContent.value = "";
  } finally {
    isSubmitting.value = false;
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleAddNote();
  }
}

function getColorStyle(color?: string) {
  if (!color) return {};
  return {
    backgroundColor: color + "20",
    borderLeftColor: color,
  };
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "เมื่อสักครู่";
  if (diffMins < 60) return `${diffMins} นาที`;
  if (diffHours < 24) return `${diffHours} ชม.`;
  if (diffDays < 7) return `${diffDays} วัน`;
  return date.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition name="fade">
      <div
        v-if="noteStore.isPanelOpen"
        class="note-backdrop"
        @click="noteStore.closePanel"
      />
    </Transition>

    <!-- Slide-out Panel -->
    <Transition name="slide">
      <aside v-if="noteStore.isPanelOpen" class="note-panel">
        <!-- Header -->
        <div class="note-header">
          <div class="note-header-title">
            <NIcon :size="20" style="margin-right: 8px">
              <DocumentTextOutline />
            </NIcon>
            <span>บันทึกด่วน</span>
          </div>
          <div class="note-header-actions">
            <NPopover trigger="click" placement="bottom-end">
              <template #trigger>
                <NButton quaternary circle size="small">
                  <template #icon>
                    <NIcon :size="16">
                      <EllipsisHorizontalOutline />
                    </NIcon>
                  </template>
                </NButton>
              </template>
              <div class="note-header-menu">
                <button
                  class="note-menu-item"
                  @click="noteStore.showArchived = !noteStore.showArchived; noteStore.showArchived && noteStore.fetchArchivedNotes()"
                >
                  <NIcon :size="16">
                    <ArchiveOutline />
                  </NIcon>
                  {{ noteStore.showArchived ? "กลับไปบันทึกปกติ" : "ดูบันทึกที่เก็บแล้ว" }}
                </button>
              </div>
            </NPopover>
            <button class="note-close-btn" @click="noteStore.closePanel">
              <NIcon :size="20">
                <CloseOutline />
              </NIcon>
            </button>
          </div>
        </div>

        <!-- Add Note Input -->
        <div class="note-input-area">
          <NInput
            ref="noteInputRef"
            v-model:value="newNoteContent"
            type="textarea"
            placeholder="เขียนบันทึก..."
            :autosize="{ minRows: 2, maxRows: 4 }"
            @keydown="handleKeydown"
          />
          <div class="note-input-actions">
            <div class="note-input-colors">
              <button
                v-for="c in noteColors"
                :key="c.value"
                class="color-dot"
                :class="{ active: false }"
                :style="{ backgroundColor: c.value }"
                :title="c.label"
              />
            </div>
            <NButton
              type="primary"
              size="small"
              :disabled="!newNoteContent.trim()"
              :loading="isSubmitting"
              @click="handleAddNote"
            >
              <template #icon>
                <NIcon>
                  <AddOutline />
                </NIcon>
              </template>
              เพิ่ม
            </NButton>
          </div>
        </div>

        <!-- Notes List -->
        <div class="note-list">
          <div v-if="noteStore.isLoading && noteStore.notes.length === 0" class="note-loading">
            <NSpin size="small" />
          </div>

          <NEmpty
            v-else-if="!noteStore.showArchived && noteStore.notes.length === 0"
            description="ยังไม่มีบันทึก"
            class="note-empty"
          />

          <NEmpty
            v-else-if="noteStore.showArchived && noteStore.archivedNotes.length === 0"
            description="ไม่มีบันทึกที่เก็บแล้ว"
            class="note-empty"
          />

          <template v-else>
            <!-- Pinned Notes -->
            <template v-if="!noteStore.showArchived && noteStore.pinnedNotes.length > 0">
              <div class="note-section-label">
                <NIcon :size="12" style="margin-right: 4px">
                  <PinOutline />
                </NIcon>
                ปักหมุด
              </div>
              <div
                v-for="note in noteStore.pinnedNotes"
                :key="note.id"
                class="note-item"
                :style="getColorStyle(note.color)"
              >
                <div class="note-content">{{ note.content }}</div>
                <div class="note-footer">
                  <span class="note-time">{{ formatTime(note.createdAt) }}</span>
                  <div class="note-actions">
                    <button class="note-action-btn" title="ปักหมุด" @click="noteStore.togglePin(note.id)">
                      <NIcon :size="14">
                        <PinOutline />
                      </NIcon>
                    </button>
                    <button class="note-action-btn" title="เก็บไว้" @click="noteStore.archiveNote(note.id)">
                      <NIcon :size="14">
                        <ArchiveOutline />
                      </NIcon>
                    </button>
                    <button class="note-action-btn note-action-btn--danger" title="ลบ" @click="noteStore.deleteNote(note.id)">
                      <NIcon :size="14">
                        <TrashOutline />
                      </NIcon>
                    </button>
                  </div>
                </div>
              </div>
            </template>

            <!-- Unpinned Notes -->
            <template v-if="!noteStore.showArchived">
              <div v-if="noteStore.unpinnedNotes.length > 0" class="note-section-label">
                บันทึกทั้งหมด
              </div>
              <div
                v-for="note in noteStore.unpinnedNotes"
                :key="note.id"
                class="note-item"
                :style="getColorStyle(note.color)"
              >
                <div class="note-content">{{ note.content }}</div>
                <div class="note-footer">
                  <span class="note-time">{{ formatTime(note.createdAt) }}</span>
                  <div class="note-actions">
                    <button class="note-action-btn" title="ปักหมุด" @click="noteStore.togglePin(note.id)">
                      <NIcon :size="14">
                        <PinOutline />
                      </NIcon>
                    </button>
                    <button class="note-action-btn" title="เก็บไว้" @click="noteStore.archiveNote(note.id)">
                      <NIcon :size="14">
                        <ArchiveOutline />
                      </NIcon>
                    </button>
                    <button class="note-action-btn note-action-btn--danger" title="ลบ" @click="noteStore.deleteNote(note.id)">
                      <NIcon :size="14">
                        <TrashOutline />
                      </NIcon>
                    </button>
                  </div>
                </div>
              </div>
            </template>

            <!-- Archived Notes -->
            <template v-if="noteStore.showArchived">
              <div
                v-for="note in noteStore.archivedNotes"
                :key="note.id"
                class="note-item note-item--archived"
                :style="getColorStyle(note.color)"
              >
                <div class="note-content">{{ note.content }}</div>
                <div class="note-footer">
                  <span class="note-time">{{ formatTime(note.updatedAt) }}</span>
                  <div class="note-actions">
                    <button class="note-action-btn" title="กู้คืน" @click="noteStore.unarchiveNote(note.id)">
                      <NIcon :size="14">
                        <AddOutline />
                      </NIcon>
                    </button>
                    <button class="note-action-btn note-action-btn--danger" title="ลบถาวร" @click="noteStore.deleteNote(note.id)">
                      <NIcon :size="14">
                        <TrashOutline />
                      </NIcon>
                    </button>
                  </div>
                </div>
              </div>
            </template>
          </template>
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
.note-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 200;
  backdrop-filter: blur(2px);
}

.note-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 380px;
  max-width: 100vw;
  height: 100vh;
  background: var(--color-surface);
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
  z-index: 201;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--color-border);
}

.note-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.note-header-title {
  display: flex;
  align-items: center;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
}

.note-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.note-close-btn {
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

.note-close-btn:hover {
  background: var(--color-surface-variant);
  color: var(--color-text);
}

.note-header-menu {
  padding: 4px;
  min-width: 160px;
}

.note-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  background: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--color-text);
  text-align: left;
  transition: background var(--duration-fast) var(--ease-out);
}

.note-menu-item:hover {
  background: var(--color-surface-variant);
}

.note-input-area {
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.note-input-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}

.note-input-colors {
  display: flex;
  gap: 6px;
  align-items: center;
}

.color-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform var(--duration-fast) var(--ease-out);
}

.color-dot:hover {
  transform: scale(1.15);
}

.color-dot.active {
  border-color: var(--color-text);
}

.note-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.note-loading {
  display: flex;
  justify-content: center;
  padding: 32px;
}

.note-empty {
  padding: 48px 16px;
}

.note-section-label {
  display: flex;
  align-items: center;
  padding: 8px 16px 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-tertiary);
}

.note-item {
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
  border-left: 3px solid transparent;
  transition: background var(--duration-fast) var(--ease-out);
}

.note-item:hover {
  background: var(--color-surface-variant);
}

.note-item--archived {
  opacity: 0.7;
}

.note-content {
  font-size: 13px;
  color: var(--color-text);
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.note-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}

.note-time {
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.note-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity var(--duration-fast) var(--ease-out);
}

.note-item:hover .note-actions {
  opacity: 1;
}

.note-action-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: var(--color-text-tertiary);
  transition: all var(--duration-fast) var(--ease-out);
}

.note-action-btn:hover {
  background: var(--color-surface-variant);
  color: var(--color-text);
}

.note-action-btn--danger:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}
</style>