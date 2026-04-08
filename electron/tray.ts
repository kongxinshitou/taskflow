import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron'
import path from 'path'

let tray: Tray | null = null

export function createTray(mainWindow: BrowserWindow): Tray {
  // Use a simple colored icon - create a 16x16 blue square as PNG buffer
  const iconSize = 16
  const icon = createTrayIcon()

  tray = new Tray(icon)
  tray.setToolTip('TaskFlow')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示 TaskFlow',
      click: () => {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.show()
        mainWindow.focus()
      }
    },
    {
      label: '快速添加任务',
      accelerator: 'Ctrl+Shift+N',
      click: () => {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.show()
        mainWindow.focus()
        mainWindow.webContents.send('quick-add-open')
      }
    },
    { type: 'separator' },
    {
      label: '退出 TaskFlow',
      click: () => {
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  return tray
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}

function createTrayIcon(): Electron.NativeImage {
  // Create a simple 16x16 PNG icon programmatically
  // Blue circle as base64 PNG
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlz' +
    'AAALEwAACxMBAJqcGAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFySURB' +
    'VDiNpZM9SwNBEIafvYuJiYWFhYWFhYWFhYWFhYWFhYX/wH/gH/AHWFhYWFhYWFhYWFhYWFhYWFg=' +
    'YWFj/gX/AH/AH/AH/AH/AH/AH/AH/AH8='

  try {
    // Try to load from file if exists
    const iconPath = path.join(__dirname, '../../build/icon.png')
    const fs = require('fs')
    if (fs.existsSync(iconPath)) {
      return nativeImage.createFromPath(iconPath)
    }
  } catch {
    // fallback
  }

  // Fallback: create empty image and use system default
  return nativeImage.createEmpty()
}
