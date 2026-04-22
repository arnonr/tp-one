import { runDailyStandup, runDeadlineReminders, STANDUP_CRON, DEADLINE_REMINDER_CRON } from './standup.worker';

let standupInterval: ReturnType<typeof setInterval> | null = null;
let reminderInterval: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

function getNextCronMatch(cronExpr: string, fromTime: Date = new Date()): Date | null {
  // Parse simple cron: "30 8 * * *" (minute hour day month weekday)
  const parts = cronExpr.split(' ');
  if (parts.length !== 5) return null;

  const [, hour, , ,] = parts;
  const targetHour = parseInt(hour, 10);
  const targetMinute = parseInt(parts[0], 10);

  const next = new Date(fromTime);
  next.setSeconds(0, 0);

  // If it's already past today's target time, schedule for tomorrow
  if (next.getHours() > targetHour || (next.getHours() === targetHour && next.getMinutes() >= targetMinute)) {
    next.setDate(next.getDate() + 1);
  }

  next.setHours(targetHour, targetMinute, 0, 0);
  return next;
}

function scheduleStandup(): void {
  const nextRun = getNextCronMatch(STANDUP_CRON);
  if (nextRun) {
    const delay = nextRun.getTime() - Date.now();
    console.log(`[Workers] Standup scheduled for ${nextRun.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })} (in ${Math.round(delay / 1000 / 60)} minutes)`);

    standupInterval = setTimeout(async () => {
      if (!isRunning) {
        isRunning = true;
        try {
          await runDailyStandup();
        } finally {
          isRunning = false;
        }
      }
      // Reschedule for next day
      scheduleStandup();
    }, delay);
  }
}

function scheduleDeadlineReminders(): void {
  // Run at 09:00 every day
  const nextRun = getNextCronMatch(DEADLINE_REMINDER_CRON);
  if (nextRun) {
    const delay = nextRun.getTime() - Date.now();
    console.log(`[Workers] Deadline reminders scheduled for ${nextRun.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })} (in ${Math.round(delay / 1000 / 60)} minutes)`);

    reminderInterval = setTimeout(async () => {
      if (!isRunning) {
        isRunning = true;
        try {
          await runDeadlineReminders();
        } finally {
          isRunning = false;
        }
      }
      // Reschedule for next day
      scheduleDeadlineReminders();
    }, delay);
  }
}

export function startWorkers(): void {
  console.log('[Workers] Starting background workers...');

  // Run standup once at startup (for testing)
  if (process.env.NODE_ENV === 'development') {
    runDailyStandup().catch(console.error);
    runDeadlineReminders().catch(console.error);
  }

  // Schedule cron jobs
  scheduleStandup();
  scheduleDeadlineReminders();

  console.log(`[Workers] Cron expressions: Standup=${STANDUP_CRON}, Reminders=${DEADLINE_REMINDER_CRON}`);
  console.log('[Workers] Background workers started');
}

export function stopWorkers(): void {
  if (standupInterval) {
    clearTimeout(standupInterval);
    standupInterval = null;
  }
  if (reminderInterval) {
    clearTimeout(reminderInterval);
    reminderInterval = null;
  }
  console.log('[Workers] Background workers stopped');
}

// Manual trigger for testing
export async function triggerStandup(): Promise<void> {
  if (!isRunning) {
    isRunning = true;
    try {
      await runDailyStandup();
    } finally {
      isRunning = false;
    }
  }
}

export async function triggerDeadlineReminders(): Promise<void> {
  if (!isRunning) {
    isRunning = true;
    try {
      await runDeadlineReminders();
    } finally {
      isRunning = false;
    }
  }
}