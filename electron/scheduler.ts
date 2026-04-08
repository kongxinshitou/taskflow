import { BrowserWindow, Notification } from 'electron'
import cron from 'node-cron'
import { getDb } from './db'
import type { Task } from './db'

let cronTask: cron.ScheduledTask | null = null

const MS_PER_DAY = 24 * 60 * 60 * 1000

function checkDueDateNotifications(mainWindow: BrowserWindow): void {
  const db = getDb()

  // Query all non-done root tasks with a due date set
  const tasks = db
    .prepare(`SELECT * FROM tasks WHERE due_date IS NOT NULL AND status != 'done' AND parent_id IS NULL`)
    .all() as Task[]

  const now = Date.now()

  // Today's midnight (local time)
  const todayMidnight = new Date()
  todayMidnight.setHours(0, 0, 0, 0)
  const todayStart = todayMidnight.getTime()

  const currentHour = new Date().getHours()

  const setNotified1d = db.prepare('UPDATE tasks SET notified_1d = 1, updated_at = ? WHERE id = ?')
  const setNotified0d = db.prepare('UPDATE tasks SET notified_0d = 1, updated_at = ? WHERE id = ?')

  for (const task of tasks) {
    const due = task.due_date as number
    const remaining = due - now

    // ── Rule 1: 1 day before ─────────────────────────────────────────────────
    // Trigger once when the task is due within the next 24 hours
    if (remaining > 0 && remaining <= MS_PER_DAY && task.notified_1d === 0) {
      setNotified1d.run(Date.now(), task.id)
      sendNotification(
        `任务即将到期：${task.title}`,
        '该任务将在 24 小时内截止，请及时处理。',
        task,
        mainWindow
      )
    }

    // ── Rule 2: Same-day 9 AM ────────────────────────────────────────────────
    // Trigger once on the due date after 9:00 AM
    const dueDayMidnight = new Date(due)
    dueDayMidnight.setHours(0, 0, 0, 0)
    const isDueToday = dueDayMidnight.getTime() === todayStart

    if (isDueToday && currentHour >= 9 && task.notified_0d === 0) {
      setNotified0d.run(Date.now(), task.id)
      sendNotification(
        `今日到期：${task.title}`,
        '该任务今天截止，请尽快完成。',
        task,
        mainWindow
      )
    }
  }
}

function sendNotification(
  title: string,
  body: string,
  task: Task,
  mainWindow: BrowserWindow
): void {
  if (!Notification.isSupported()) {
    console.warn('[Scheduler] Notifications not supported on this platform')
    return
  }

  const notification = new Notification({ title, body, silent: false })

  notification.on('click', () => {
    // Show and focus window, then navigate to the task's project
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
    mainWindow.webContents.send('navigate-to-project', task.project_id)
  })

  notification.show()
  console.log(`[Scheduler] Notification sent: "${title}"`)
}

export function startScheduler(mainWindow: BrowserWindow): void {
  if (cronTask) return

  // Run immediately on startup to catch any missed notifications
  try {
    checkDueDateNotifications(mainWindow)
  } catch (err) {
    console.error('[Scheduler] Initial check error:', err)
  }

  // Then check every minute
  cronTask = cron.schedule('* * * * *', () => {
    try {
      checkDueDateNotifications(mainWindow)
    } catch (err) {
      console.error('[Scheduler] Error during scheduled check:', err)
    }
  })

  console.log('[Scheduler] Started — checking due dates every minute')
}

export function stopScheduler(): void {
  if (cronTask) {
    cronTask.stop()
    cronTask = null
  }
  console.log('[Scheduler] Stopped')
}
