import { config } from '../../config/env';
import { formatThaiDate } from '../../shared/thai.utils';

interface TelegramMessage {
  chatId: string;
  text: string;
  parseMode?: 'Markdown' | 'HTML';
}

class TelegramService {
  private botToken: string;
  private defaultChatId: string;
  private apiUrl: string;

  constructor() {
    this.botToken = config.telegramBotToken;
    this.defaultChatId = config.telegramChatId;
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  get isConfigured(): boolean {
    return !!this.botToken && !!this.defaultChatId;
  }

  private async sendMessage(payload: TelegramMessage): Promise<boolean> {
    if (!this.isConfigured) {
      console.warn('[Telegram] Bot not configured. Skip sending message.');
      return false;
    }

    try {
      const response = await fetch(`${this.apiUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: payload.chatId,
          text: payload.text,
          parse_mode: payload.parseMode || 'Markdown',
        }),
      });

      const result = await response.json();
      if (!result.ok) {
        console.error('[Telegram] Send failed:', result.description);
        return false;
      }
      return true;
    } catch (error) {
      console.error('[Telegram] Send error:', error);
      return false;
    }
  }

  async sendToUser(userTelegramId: string, text: string): Promise<boolean> {
    return this.sendMessage({ chatId: userTelegramId, text });
  }

  async sendToDefault(text: string): Promise<boolean> {
    return this.sendMessage({ chatId: this.defaultChatId, text });
  }

  async sendTaskAssigned(
    userTelegramId: string,
    taskTitle: string,
    workspaceName: string,
    assigneeName: string
  ): Promise<boolean> {
    const message = `📋 *งานใหม่ได้รับมอบหมาย*

🔖 *${taskTitle}*
🏢 หน่วยงาน: ${workspaceName}
👤 ผู้รับผิดชอบ: ${assigneeName}

ตอบรับงานได้เลยครับ 🙏`;
    return this.sendToUser(userTelegramId, message);
  }

  async sendTaskStatusChanged(
    userTelegramId: string,
    taskTitle: string,
    oldStatus: string,
    newStatus: string,
    changedBy: string
  ): Promise<boolean> {
    const message = `🔄 *สถานะงานเปลี่ยนแล้ว*

📌 งาน: ${taskTitle}
${oldStatus} ➜ ${newStatus}
👤 ผู้เปลี่ยน: ${changedBy}

📅 ${formatThaiDate(new Date())}`;
    return this.sendToUser(userTelegramId, message);
  }

  async sendTaskComment(
    userTelegramId: string,
    taskTitle: string,
    commenterName: string,
    commentText: string
  ): Promise<boolean> {
    const truncatedComment = commentText.length > 200
      ? commentText.substring(0, 200) + '...'
      : commentText;

    const message = `💬 *มีความคิดเห็นใหม่*

📌 งาน: ${taskTitle}
👤 ${commenterName}:
"${truncatedComment}"`;
    return this.sendToUser(userTelegramId, message);
  }

  async sendDeadlineApproaching(
    userTelegramId: string,
    taskTitle: string,
    dueDate: Date,
    daysLeft: number
  ): Promise<boolean> {
    const dueDateStr = formatThaiDate(dueDate);
    const emoji = daysLeft <= 1 ? '🚨' : '⏰';

    const message = `${emoji} *เตือนกำหนดส่งงาน*

📌 งาน: ${taskTitle}
📅 กำหนดส่ง: ${dueDateStr}
${daysLeft <= 1 ? '⚠️ วันสุดท้าย!' : `⏳ เหลือ ${daysLeft} วัน`}`;
    return this.sendToUser(userTelegramId, message);
  }

  async sendDailyStandup(
    userTelegramId: string,
    standupData: {
      userName: string;
      todayTasks: number;
      overdueTasks: number;
      weekTasks: number;
      waitingTasks: number;
      subtaskTotal: number;
      subtaskCompleted: number;
      taskDetails: string[];
    }
  ): Promise<boolean> {
    const {
      userName,
      todayTasks,
      overdueTasks,
      weekTasks,
      waitingTasks,
      subtaskTotal,
      subtaskCompleted,
      taskDetails,
    } = standupData;

    let message = `🌅 *สรุปงานประจำวัน* — ${userName}\n\n`;

    if (overdueTasks > 0) {
      message += `🔴 งานเลยกำหนด: ${overdueTasks} งาน\n`;
    }
    message += `📋 งานวันนี้: ${todayTasks} งาน\n`;
    message += `📅 สัปดาห์นี้: ${weekTasks} งาน\n`;
    message += `⏳ รอหน่วยงานอื่น: ${waitingTasks} งาน\n`;

    if (subtaskTotal > 0) {
      const subtaskEmoji = subtaskCompleted === subtaskTotal ? '✅' : '🔄';
      message += `${subtaskEmoji} งานย่อย: ${subtaskCompleted}/${subtaskTotal} งาน\n`;
    }

    if (taskDetails.length > 0) {
      message += `\n📝 *รายละเอียดงานวันนี้:*\n`;
      taskDetails.forEach((task, i) => {
        message += `${i + 1}. ${task}\n`;
      });
    }

    message += `\n🤖 ส่งโดย TP-One Bot`;
    return this.sendToUser(userTelegramId, message);
  }
}

export const telegramService = new TelegramService();