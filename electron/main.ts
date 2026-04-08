import {
  app,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  nativeImage,
  dialog,
  globalShortcut,
  screen,
} from 'electron'
import { join, dirname } from 'node:path'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
// Node ESM in packaged apps resolves `electron-log/main.js`, not `electron-log/main`
import log from 'electron-log/main.js'
import type { AppData } from '../src/shared/types'
import { DATA_VERSION, defaultSettings } from '../src/shared/types'
import { emptyDoc } from '../src/shared/defaultDoc'
import {
  getDataFilePath,
  loadAppDataFile,
  saveAppDataFile,
  type SaveResult,
} from './persistence'
import { parseAndValidateAppData } from './validateData'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const isDev = !!process.env.VITE_DEV_SERVER_URL

log.initialize()
log.transports.file.level = 'info'
log.transports.console.level = isDev ? 'debug' : 'warn'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

function dataFilePath(): string {
  return getDataFilePath(app.getPath('userData'))
}

function loadData(): AppData {
  try {
    return loadAppDataFile(dataFilePath())
  } catch (e) {
    log.error('loadData failed', e)
    return {
      version: DATA_VERSION,
      doc: emptyDoc(),
      settings: defaultSettings(),
    }
  }
}

function saveData(data: AppData): SaveResult {
  const result = saveAppDataFile(dataFilePath(), data)
  if (!result.ok) {
    log.error('saveData failed', result.error)
  }
  return result
}

function showAbout(): void {
  void dialog.showMessageBox(mainWindow ?? undefined, {
    type: 'info',
    title: 'About Desktop Reminder',
    message: 'Desktop Reminder',
    detail: `Version ${app.getVersion()}\n\nA local checklist and notes overlay. Data stays on this device.\n\nUser data:\n${app.getPath('userData')}`,
  })
}

function createApplicationMenu(): void {
  const isMac = process.platform === 'darwin'
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: 'Desktop Reminder',
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]
      : []),
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        ...(isMac
          ? [{ role: 'pasteAndMatchStyle' as const }, { role: 'delete' as const }]
          : []),
        { role: 'selectAll' as const },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Desktop Reminder',
          click: () => showAbout(),
        },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function createTrayIcon(): nativeImage {
  const png =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  return nativeImage.createFromDataURL(`data:image/png;base64,${png}`)
}

function createWindow(): void {
  const saved = loadData()
  const b = saved.settings.windowBounds

  mainWindow = new BrowserWindow({
    x: b?.x,
    y: b?.y,
    width: b?.width ?? 400,
    height: b?.height ?? 560,
    minWidth: 260,
    minHeight: 200,
    transparent: true,
    frame: false,
    title: 'Desktop Reminder',
    backgroundColor: '#00000000',
    show: false,
    alwaysOnTop: saved.settings.alwaysOnTop,
    skipTaskbar: false,
    hasShadow: true,
    webPreferences: {
      preload: join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
    },
  })

  mainWindow.setTitle('Desktop Reminder')

  mainWindow.setOpacity(saved.settings.opacity)

  if (process.platform === 'darwin') {
    // Without skipTransformProcessType, Electron toggles UIElement vs foreground process
    // type, which can hide the app from the Dock and from the Force Quit list (Cmd+Opt+Esc).
    mainWindow.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
      skipTransformProcessType: true,
    })
  }

  // Click-through was removed; always accept mouse events. Stale packaged builds
  // or older main bundles could still call setIgnoreMouseEvents(true) from saved settings.
  mainWindow.setIgnoreMouseEvents(false)

  mainWindow.once('ready-to-show', () => {
    mainWindow?.setIgnoreMouseEvents(false)
    mainWindow?.show()
  })

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    void mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    log.error('did-fail-load', code, desc)
  })

  const commitBounds = (): void => {
    if (!mainWindow) return
    const bounds = mainWindow.getBounds()
    const data = loadData()
    data.settings.windowBounds = bounds
    const disp = screen.getDisplayMatching(bounds)
    data.settings.displayId = disp.id
    saveData(data)
    mainWindow.webContents.send('window:bounds-changed')
  }

  mainWindow.on('close', commitBounds)
  mainWindow.on('moved', commitBounds)
  mainWindow.on('resized', commitBounds)
  mainWindow.on('mouseenter', () => {
    mainWindow?.webContents.send('window:hover-changed', true)
  })
  mainWindow.on('mouseleave', () => {
    mainWindow?.webContents.send('window:hover-changed', false)
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function buildTrayMenu(): Menu {
  return Menu.buildFromTemplate([
    {
      label: 'Show',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        } else {
          createWindow()
        }
      },
    },
    {
      label: 'Toggle always on top',
      click: () => {
        if (!mainWindow) return
        const onTop = !mainWindow.isAlwaysOnTop()
        mainWindow.setAlwaysOnTop(onTop)
        const data = loadData()
        data.settings.alwaysOnTop = onTop
        saveData(data)
      },
    },
    { type: 'separator' },
    {
      label: 'About',
      click: () => showAbout(),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      },
    },
  ])
}

function createTray(): void {
  tray = new Tray(createTrayIcon())
  tray.setToolTip('Desktop Reminder')
  if (process.platform === 'darwin') {
    tray.setTitle('•')
  }
  tray.setContextMenu(buildTrayMenu())
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    } else {
      createWindow()
    }
  })
}

function registerShortcutFromSettings(): void {
  globalShortcut.unregisterAll()
  const data = loadData()
  const acc = data.settings.globalShortcut
  if (!acc || acc.length === 0) return
  const ok = globalShortcut.register(acc, () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    } else {
      createWindow()
    }
    mainWindow?.webContents.send('shortcut:triggered')
  })
  if (!ok) {
    log.warn('Could not register global shortcut from settings')
  }
}

function wireIpc(): void {
  ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize()
  })
  ipcMain.handle('window:toggleMaximize', () => {
    if (!mainWindow) return false
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
      return false
    }
    mainWindow.maximize()
    return true
  })
  ipcMain.handle('window:close', () => {
    mainWindow?.close()
  })

  ipcMain.handle('window:setAlwaysOnTop', (_e, value: boolean) => {
    mainWindow?.setAlwaysOnTop(value)
    const data = loadData()
    data.settings.alwaysOnTop = value
    saveData(data)
  })
  ipcMain.handle('window:setOpacity', (_e, value: number) => {
    const v = Math.min(1, Math.max(0.15, value))
    mainWindow?.setOpacity(v)
    const data = loadData()
    data.settings.opacity = v
    saveData(data)
  })
  ipcMain.handle('window:getBounds', () => {
    return mainWindow?.getBounds() ?? null
  })
  ipcMain.handle(
    'window:setBounds',
    (_e, bounds: Electron.Rectangle) => {
      mainWindow?.setBounds(bounds)
    },
  )

  ipcMain.handle('app:getVersion', () => app.getVersion())
  ipcMain.handle('app:getPaths', () => ({
    userData: app.getPath('userData'),
  }))

  ipcMain.handle('data:load', () => loadData())
  ipcMain.handle('data:save', (_e, data: AppData) => saveData(data))

  ipcMain.handle(
    'dialog:export',
    async (): Promise<{ canceled: boolean; path?: string; error?: string }> => {
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Export reminders',
        defaultPath: 'desktop-reminder-backup.json',
        filters: [{ name: 'JSON', extensions: ['json'] }],
      })
      if (canceled || !filePath) return { canceled: true }
      try {
        const data = loadData()
        writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
        return { canceled: false, path: filePath }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Export failed'
        log.error('export', e)
        return { canceled: true, error: msg }
      }
    },
  )

  ipcMain.handle(
    'dialog:import',
    async (): Promise<{
      canceled: boolean
      data?: AppData
      error?: string
    }> => {
      const confirm = await dialog.showMessageBox(
        mainWindow ?? undefined,
        {
          type: 'warning',
          buttons: ['Cancel', 'Import'],
          defaultId: 1,
          cancelId: 0,
          title: 'Import backup',
          message: 'Replace all current tasks and settings?',
          detail:
            'You cannot undo this import. Export a backup first if you need to keep what you have now.',
        },
      )
      if (confirm.response === 0) {
        return { canceled: true }
      }

      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Import reminders',
        properties: ['openFile'],
        filters: [{ name: 'JSON', extensions: ['json'] }],
      })
      if (canceled || !filePaths?.[0]) return { canceled: true }
      try {
        const raw = readFileSync(filePaths[0], 'utf8')
        const parsed = JSON.parse(raw) as unknown
        const merged = parseAndValidateAppData(parsed)
        if (!merged) {
          return { canceled: true, error: 'Invalid backup file format.' }
        }
        const result = saveAppDataFile(dataFilePath(), merged)
        if (!result.ok) {
          return { canceled: true, error: result.error }
        }
        return { canceled: false, data: merged }
      } catch (e) {
        log.error('import', e)
        const msg =
          e instanceof SyntaxError
            ? 'Could not parse JSON.'
            : e instanceof Error
              ? e.message
              : 'Import failed.'
        return { canceled: true, error: msg }
      }
    },
  )

  ipcMain.handle('app:setLaunchAtLogin', (_e, open: boolean) => {
    app.setLoginItemSettings({ openAtLogin: open })
    const data = loadData()
    data.settings.launchAtLogin = open
    saveData(data)
  })
  ipcMain.handle('app:getLaunchAtLogin', () => {
    return app.getLoginItemSettings().openAtLogin
  })

  ipcMain.handle(
    'shortcut:register',
    (_e, accelerator: string | null): { ok: boolean; reason?: string } => {
      globalShortcut.unregisterAll()
      if (!accelerator) {
        const data = loadData()
        data.settings.globalShortcut = null
        saveData(data)
        return { ok: true }
      }
      const ok = globalShortcut.register(accelerator, () => {
        if (mainWindow) {
          if (mainWindow.isVisible()) {
            mainWindow.hide()
          } else {
            mainWindow.show()
            mainWindow.focus()
          }
        } else {
          createWindow()
        }
        mainWindow?.webContents.send('shortcut:triggered')
      })
      if (!ok) {
        return { ok: false, reason: 'Registration failed (invalid or reserved)' }
      }
      const data = loadData()
      data.settings.globalShortcut = accelerator
      saveData(data)
      return { ok: true }
    },
  )
}

function startApp(): void {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.desktopreminder.overlay')
  }
  createApplicationMenu()
  wireIpc()
  createTray()
  createWindow()
  registerShortcutFromSettings()
  log.info('Desktop Reminder started', { version: app.getVersion() })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }
      mainWindow.show()
      mainWindow.focus()
    } else {
      createWindow()
    }
  })

  app.whenReady().then(() => {
    if (process.platform === 'darwin') {
      app.setActivationPolicy('regular')
    }
    startApp()
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
