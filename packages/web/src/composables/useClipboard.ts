import { ref } from 'vue'
import { formatThaiDate } from '@/utils/thai'

export function useClipboard() {
  const copied = ref(false)
  const copying = ref(false)

  async function copy(text: string) {
    copying.value = true
    try {
      await navigator.clipboard.writeText(text)
      copied.value = true
      setTimeout(() => { copied.value = false }, 2000)
      return true
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      copied.value = true
      setTimeout(() => { copied.value = false }, 2000)
      return true
    } finally {
      copying.value = false
    }
  }

  function formatTaskShort(task: {
    title: string
    statusName?: string
    priority?: string
    dueDate?: string
    assigneeName?: string
    workspaceName?: string
  }) {
    const priorityEmoji: Record<string, string> = {
      urgent: '🔴',
      high: '🟠',
      normal: '🔵',
      low: '⚪',
    }
    const lines = [
      `📋 *${task.title}*`,
      task.statusName ? `📌 สถานะ: ${task.statusName}` : '',
      task.priority ? `${priorityEmoji[task.priority] || '⚪'} ความสำคัญ: ${task.priority}` : '',
      task.dueDate ? `📅 กำหนดส่ง: ${formatThaiDate(task.dueDate)}` : '',
      task.assigneeName ? `👤 ผู้รับผิดชอบ: ${task.assigneeName}` : '',
      task.workspaceName ? `📁 พื้นที่งาน: ${task.workspaceName}` : '',
    ]
    return lines.filter(Boolean).join('\n')
  }

  function formatTaskFull(task: {
    title: string
    description?: string
    statusName?: string
    statusColor?: string
    priority?: string
    dueDate?: string
    startDate?: string
    assigneeName?: string
    reporterName?: string
    workspaceName?: string
    projectName?: string
    fiscalYear?: number
    budget?: string
    estimatedHours?: string
    subtasks?: Array<{ title: string; statusName?: string }>
  }) {
    const priorityLabels: Record<string, string> = {
      urgent: '🔴 เร่งด่วน',
      high: '🟠 สูง',
      normal: '🔵 ปกติ',
      low: '⚪ ต่ำ',
    }
    const lines = [
      `📋 ═══════════════════`,
      `📋 *${task.title}*`,
      `═══════════════════`,
    ]

    if (task.description) {
      lines.push(`📝 ${task.description}`)
      lines.push('')
    }

    lines.push(`📌 สถานะ: ${task.statusName || '—'}`)
    if (task.priority) lines.push(`${priorityLabels[task.priority] || '⚪'}`)
    if (task.workspaceName) lines.push(`📁 พื้นที่งาน: ${task.workspaceName}`)
    if (task.projectName) lines.push(`📂 โครงการ: ${task.projectName}`)
    if (task.assigneeName) lines.push(`👤 ผู้รับผิดชอบ: ${task.assigneeName}`)
    if (task.reporterName) lines.push(`📝 ผู้แจ้ง: ${task.reporterName}`)
    if (task.fiscalYear) lines.push(`🗓 ปีงบ: ${task.fiscalYear}`)
    if (task.budget) lines.push(`💰 งบ: ฿${Number(task.budget).toLocaleString()}`)
    if (task.estimatedHours) lines.push(`⏱ เวลา: ${task.estimatedHours} ชม.`)
    if (task.startDate) lines.push(`📆 เริ่ม: ${formatThaiDate(task.startDate)}`)
    if (task.dueDate) lines.push(`📅 กำหนดส่ง: ${formatThaiDate(task.dueDate)}`)

    if (task.subtasks?.length) {
      lines.push('')
      lines.push('📝 งานย่อย:')
      for (const st of task.subtasks) {
        const icon = st.statusName === 'เสร็จสิ้น' ? '✅' : '⬜'
        lines.push(`  ${icon} ${st.title}`)
      }
    }

    lines.push('📋 ═══════════════════')
    return lines.join('\n')
  }

  return { copied, copying, copy, formatTaskShort, formatTaskFull }
}
