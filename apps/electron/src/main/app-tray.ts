import { app, BrowserWindow, Menu, nativeImage, Tray } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import { getWorkspaces } from '@craft-agent/shared/config'
import { mainLog } from './logger'
import { loadWindowState } from './window-state'
import type { WindowManager } from './window-manager'

let appTray: Tray | null = null
let forceQuitTimer: NodeJS.Timeout | null = null

function resolveTrayIconPath(): string | null {
  const iconNames = process.platform === 'win32'
    ? ['drama-tray.ico', 'drama-icon.ico', 'icon.ico']
    : ['drama-tray.png', 'drama-icon-256.png', 'drama-icon.png', 'icon.png']

  const roots = [
    join(__dirname, 'resources'),
    join(__dirname, '../resources'),
  ]

  for (const root of roots) {
    for (const iconName of iconNames) {
      const candidate = join(root, iconName)
      if (existsSync(candidate)) return candidate
    }
  }

  return null
}

function localizedLabel(english: string, chinese: string): string {
  const language = app.getLocale().toLowerCase()
  return language.startsWith('zh') ? chinese : english
}

function showWindow(window: BrowserWindow): void {
  if (window.isDestroyed()) return
  if (window.isMinimized()) window.restore()
  window.show()
  window.focus()
}

function showOrCreateMainWindow(windowManager: WindowManager): void {
  const existingWindow = windowManager.getLastActiveWindow()
  if (existingWindow) {
    showWindow(existingWindow)
    return
  }

  const workspaces = getWorkspaces()
  if (workspaces.length === 0) {
    showWindow(windowManager.createWindow({ workspaceId: '' }))
    return
  }

  const savedState = loadWindowState()
  const workspaceId = savedState?.lastFocusedWorkspaceId && workspaces.some(ws => ws.id === savedState.lastFocusedWorkspaceId)
    ? savedState.lastFocusedWorkspaceId
    : workspaces[0].id

  showWindow(windowManager.createWindow({ workspaceId }))
}

function quitFromTray(windowManager: WindowManager): void {
  mainLog.info('[tray] Quit requested')
  windowManager.setAppQuitting(true)

  if (forceQuitTimer) clearTimeout(forceQuitTimer)
  forceQuitTimer = setTimeout(() => {
    mainLog.warn('[tray] Graceful quit timed out; forcing app exit')
    app.exit(0)
  }, 10_000)
  forceQuitTimer.unref?.()

  app.quit()
}

function buildTrayMenu(windowManager: WindowManager): Electron.Menu {
  return Menu.buildFromTemplate([
    {
      label: localizedLabel('Show Drama', '显示 Drama'),
      click: () => showOrCreateMainWindow(windowManager),
    },
    { type: 'separator' },
    {
      label: localizedLabel('Quit Drama', '退出 Drama'),
      click: () => quitFromTray(windowManager),
    },
  ])
}

export function initAppTray(windowManager: WindowManager): void {
  if (process.platform === 'darwin') return
  if (appTray) return

  const iconPath = resolveTrayIconPath()
  if (!iconPath) {
    mainLog.warn('[tray] Tray icon not found; system tray entry disabled')
    return
  }

  const icon = nativeImage.createFromPath(iconPath)
  if (icon.isEmpty()) {
    mainLog.warn('[tray] Tray icon is empty; system tray entry disabled', { iconPath })
    return
  }

  const trayIcon = process.platform === 'win32'
    ? icon.resize({ width: 16, height: 16 })
    : icon
  appTray = new Tray(trayIcon)
  appTray.setToolTip('Drama')
  appTray.setContextMenu(buildTrayMenu(windowManager))
  appTray.on('click', () => showOrCreateMainWindow(windowManager))
  appTray.on('double-click', () => showOrCreateMainWindow(windowManager))
  mainLog.info('[tray] System tray initialized', { iconPath })
}

export function disposeAppTray(): void {
  if (forceQuitTimer) {
    clearTimeout(forceQuitTimer)
    forceQuitTimer = null
  }

  if (appTray) {
    appTray.destroy()
    appTray = null
  }
}
