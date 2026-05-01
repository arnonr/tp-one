<script setup lang="ts">
import { watch, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import { NButton, NSpace, NUpload, useMessage, NIcon } from 'naive-ui'
import { uploadAttachment } from '@/services/attachment'
import { useWorkspaceStore } from '@/stores/workspace'

const props = withDefaults(defineProps<{
  modelValue: string
  placeholder?: string
  disabled?: boolean
  minHeight?: string
}>(), {
  placeholder: 'พิมพ์รายละเอียด...',
  disabled: false,
  minHeight: '200px',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const message = useMessage()
const workspaceStore = useWorkspaceStore()

const editor = useEditor({
  content: props.modelValue,
  editable: !props.disabled,
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
    }),
    Image.configure({
      inline: true,
      allowBase64: true,
    }),
    Placeholder.configure({
      placeholder: props.placeholder,
    }),
    Underline,
    Link.configure({
      openOnClick: false,
    }),
  ],
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML())
  },
})

watch(() => props.modelValue, (value) => {
  if (editor.value && editor.value.getHTML() !== value) {
    editor.value.commands.setContent(value)
  }
})

watch(() => props.disabled, (disabled) => {
  editor.value?.setEditable(!disabled)
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})

function handleImageUpload(file: File): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await uploadAttachment(file, workspaceStore.currentWorkspaceId!)
      const imageUrl = `/api/uploads/attachments/${result.fileUrl.split('/').pop()}`
      resolve(imageUrl)
    } catch (err: any) {
      message.error('อัพโหลดรูปภาพไม่สำเร็จ: ' + err.message)
      reject(err)
    }
  })
}

async function handleImageButton() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      try {
        const url = await handleImageUpload(file)
        editor.value?.chain().focus().setImage({ src: url, alt: file.name }).run()
      } catch {
        // error shown via message
      }
    }
  }
  input.click()
}

async function handleFileButton() {
  const input = document.createElement('input')
  input.type = 'file'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      try {
        const result = await uploadAttachment(file, workspaceStore.currentWorkspaceId!)
        const fileUrl = `/api/uploads/attachments/${result.fileUrl.split('/').pop()}`
        const name = result.fileName
        editor.value?.chain().focus().setLink({ href: fileUrl }).run()
        editor.value?.chain().focus().insertContent(`<a href="${fileUrl}" target="_blank">${name}</a>`).run()
      } catch {
        // error shown via message
      }
    }
  }
  input.click()
}

function setLink() {
  const previousUrl = editor.value?.getAttributes('link').href
  const url = window.prompt('URL', previousUrl)
  if (url === null) return
  if (url === '') {
    editor.value?.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }
  editor.value?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
}
</script>

<template>
  <div class="rich-text-editor" :class="{ disabled }">
    <div v-if="!disabled" class="toolbar">
      <NSpace :size="4" no-wrap>
        <NButton
          size="tiny"
          quaternary
          :type="editor?.isActive('bold') ? 'primary' : 'default'"
          @click="editor?.chain().focus().toggleBold().run()"
          title="ตัวหนา"
        >
          <strong>B</strong>
        </NButton>
        <NButton
          size="tiny"
          quaternary
          :type="editor?.isActive('italic') ? 'primary' : 'default'"
          @click="editor?.chain().focus().toggleItalic().run()"
          title="ตัวเอียง"
        >
          <em>I</em>
        </NButton>
        <NButton
          size="tiny"
          quaternary
          :type="editor?.isActive('underline') ? 'primary' : 'default'"
          @click="editor?.chain().focus().toggleUnderline().run()"
          title="ขีดเส้นใต้"
        >
          <u>U</u>
        </NButton>
        <NButton
          size="tiny"
          quaternary
          :type="editor?.isActive('strike') ? 'primary' : 'default'"
          @click="editor?.chain().focus().toggleStrike().run()"
          title="ขีดเส้น"
        >
          <s>S</s>
        </NButton>

        <div class="toolbar-divider" />

        <NButton
          size="tiny"
          quaternary
          :type="editor?.isActive('heading', { level: 1 }) ? 'primary' : 'default'"
          @click="editor?.chain().focus().toggleHeading({ level: 1 }).run()"
          title="หัวข้อ 1"
        >
          H1
        </NButton>
        <NButton
          size="tiny"
          quaternary
          :type="editor?.isActive('heading', { level: 2 }) ? 'primary' : 'default'"
          @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()"
          title="หัวข้อ 2"
        >
          H2
        </NButton>

        <div class="toolbar-divider" />

        <NButton
          size="tiny"
          quaternary
          :type="editor?.isActive('bulletList') ? 'primary' : 'default'"
          @click="editor?.chain().focus().toggleBulletList().run()"
          title="รายการแบบจุด"
        >
          •
        </NButton>
        <NButton
          size="tiny"
          quaternary
          :type="editor?.isActive('orderedList') ? 'primary' : 'default'"
          @click="editor?.chain().focus().toggleOrderedList().run()"
          title="รายการแบบตัวเลข"
        >
          1.
        </NButton>
        <NButton
          size="tiny"
          quaternary
          :type="editor?.isActive('blockquote') ? 'primary' : 'default'"
          @click="editor?.chain().focus().toggleBlockquote().run()"
          title="คำพูด"
        >
          "
        </NButton>

        <div class="toolbar-divider" />

        <NButton
          size="tiny"
          quaternary
          :type="editor?.isActive('link') ? 'primary' : 'default'"
          @click="setLink"
          title="เพิ่มลิงก์"
        >
          🔗
        </NButton>
        <NButton
          size="tiny"
          quaternary
          @click="handleImageButton"
          title="แทรกรูปภาพ"
        >
          🖼️
        </NButton>
        <NButton
          size="tiny"
          quaternary
          @click="handleFileButton"
          title="แนบไฟล์"
        >
          📎
        </NButton>
      </NSpace>
    </div>
    <EditorContent :editor="editor" :style="{ minHeight }" class="editor-content" />
  </div>
</template>

<style scoped>
.rich-text-editor {
  border: 1px solid var(--border-color, #d9d9d9);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.rich-text-editor.disabled {
  background: #f5f5f5;
}

.toolbar {
  padding: 8px;
  border-bottom: 1px solid var(--border-color, #f0f0f0);
  background: #fafafa;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: #d9d9d9;
  margin: 0 4px;
}

.editor-content {
  padding: 12px;
}

.editor-content :deep(.tiptap) {
  outline: none;
  min-height: v-bind(minHeight);
}

.editor-content :deep(.tiptap p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  color: #aaa;
  pointer-events: none;
  float: left;
  height: 0;
}

.editor-content :deep(.tiptap p) {
  margin: 0.5em 0;
}

.editor-content :deep(.tiptap ul),
.editor-content :deep(.tiptap ol) {
  padding-left: 1.5em;
  margin: 0.5em 0;
}

.editor-content :deep(.tiptap blockquote) {
  border-left: 3px solid #d9d9d9;
  padding-left: 1em;
  margin: 1em 0;
  color: #666;
}

.editor-content :deep(.tiptap a) {
  color: #2563eb;
  text-decoration: underline;
}

.editor-content :deep(.tiptap img) {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  margin: 0.5em 0;
}
</style>