import { ipcMain, Notification, BrowserWindow } from 'electron'

let mainWindow: BrowserWindow | null = null

// Handle notification requests from renderer process
function registerNotificationHandler(): void {
  ipcMain.handle('notification:send', (_event, data: { title: string; body: string }) => {
    if (!Notification.isSupported()) return

    const notification = new Notification({ title: data.title, body: data.body, silent: false })

    notification.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.show()
        mainWindow.focus()
      }
    })

    notification.show()
  })
}

export function startScheduler(win: BrowserWindow): void {
  mainWindow = win
  registerNotificationHandler()
  console.log('[Scheduler] Notification handler registered')
}

export function stopScheduler(): void {
  mainWindow = null
  console.log('[Scheduler] Stopped')
}
