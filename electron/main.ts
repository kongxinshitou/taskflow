import { app, BrowserWindow, globalShortcut, shell } from 'electron'
import { join } from 'path'
import Store from 'electron-store'
import { initDb } from './db'
import { registerIpcHandlers } from './ipc'
import { createTray, destroyTray } from './tray'
import { startScheduler, stopScheduler } from './scheduler'

interface WindowState {
  width: number
  height: number
  x?: number
  y?: number
}

const store = new Store<{ windowState: WindowState }>()

let mainWindow: BrowserWindow | null = null
let isQuitting = false

const isDev = !app.isPackaged

function createMainWindow(): BrowserWindow {
  const savedState = store.get('windowState', { width: 1100, height: 700 })

  const win = new BrowserWindow({
    width: savedState.width,
    height: savedState.height,
    x: savedState.x,
    y: savedState.y,
    minWidth: 800,
    minHeight: 500,
    show: false,
    frame: true,
    autoHideMenuBar: true,
    title: 'TaskFlow',
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.on('ready-to-show', () => {
    win.show()
    if (isDev) {
      win.webContents.openDevTools({ mode: 'detach' })
    }
  })

  win.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      win.hide()
    }
  })

  win.on('resize', () => saveWindowState(win))
  win.on('move', () => saveWindowState(win))

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // electron-vite dev server URL
  const devServerUrl = process.env['ELECTRON_RENDERER_URL']
  if (isDev && devServerUrl) {
    win.loadURL(devServerUrl)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

function saveWindowState(win: BrowserWindow): void {
  if (win.isMaximized() || win.isMinimized()) return
  const bounds = win.getBounds()
  store.set('windowState', {
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y
  })
}

function registerGlobalShortcuts(): void {
  // Toggle main window
  globalShortcut.register('Ctrl+Shift+Space', () => {
    if (!mainWindow) return
    if (mainWindow.isVisible() && mainWindow.isFocused()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  // Quick add task
  globalShortcut.register('Ctrl+Shift+N', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
    mainWindow.webContents.send('quick-add-open')
  })
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.taskflow.app')

  // Initialize database
  try {
    initDb()
  } catch (err) {
    console.error('[Main] DB initialization failed:', err)
  }

  // Register IPC handlers
  registerIpcHandlers()

  // Create main window
  mainWindow = createMainWindow()

  // Create system tray
  createTray(mainWindow)

  // Register global shortcuts
  registerGlobalShortcuts()

  // Start scheduler (stub in M1)
  startScheduler(mainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow()
    }
  })
})

app.on('before-quit', () => {
  isQuitting = true
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  stopScheduler()
  destroyTray()
})

app.on('window-all-closed', () => {
  // Don't quit on Windows — app stays in tray
  // On macOS would normally quit here
  if (process.platform !== 'darwin') {
    // intentionally empty — tray keeps app alive
  }
})
