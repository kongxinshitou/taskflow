import { useEffect, useRef } from 'react'
import { taskAPI, type Task } from '../utils/ipc'

const MS_PER_DAY = 24 * 60 * 60 * 1000

export function useScheduler(): void {
  const notifiedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>

    const check = async () => {
      try {
        const tasks: Task[] = await taskAPI.list({ status: 'todo' })
        const now = Date.now()
        const todayMidnight = new Date()
        todayMidnight.setHours(0, 0, 0, 0)
        const todayStart = todayMidnight.getTime()
        const currentHour = new Date().getHours()

        for (const task of tasks) {
          if (!task.due_date || task.parent_id) continue
          const due = task.due_date
          const remaining = due - now

          // 1 day before
          if (remaining > 0 && remaining <= MS_PER_DAY) {
            const key = `1d:${task.id}`
            if (!notifiedRef.current.has(key)) {
              notifiedRef.current.add(key)
              sendNotification(
                `任务即将到期：${task.title}`,
                '该任务将在 24 小时内截止，请及时处理。',
                task
              )
            }
          }

          // Same day after 9 AM
          const dueDayMidnight = new Date(due)
          dueDayMidnight.setHours(0, 0, 0, 0)
          const isDueToday = dueDayMidnight.getTime() === todayStart

          if (isDueToday && currentHour >= 9) {
            const key = `0d:${task.id}`
            if (!notifiedRef.current.has(key)) {
              notifiedRef.current.add(key)
              sendNotification(
                `今日到期：${task.title}`,
                '该任务今天截止，请尽快完成。',
                task
              )
            }
          }
        }
      } catch (err) {
        console.error('[Scheduler] check error:', err)
      }
    }

    // Check immediately, then every minute
    check()
    timer = setInterval(check, 60 * 1000)

    return () => clearInterval(timer)
  }, [])
}

function sendNotification(title: string, body: string, _task: Task): void {
  // Use native Electron notification via IPC, or Web Notification API
  if (window.electronAPI && (window as any).electronAPI.sendNotification) {
    ;(window as any).electronAPI.sendNotification({ title, body })
    return
  }

  // Fallback: Web Notification API
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body })
  } else if ('Notification' in window && Notification.permission !== 'denied') {
    Notification.requestPermission().then((perm) => {
      if (perm === 'granted') {
        new Notification(title, { body })
      }
    })
  }
}
