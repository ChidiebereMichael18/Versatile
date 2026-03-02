import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  ipcMain,
  screen,
  nativeImage,
  dialog,
  shell,
  globalShortcut,
} from 'electron'
import * as path from 'path'
import { startMediaWatcher, stopMediaWatcher } from './media-watcher'
import * as fs from 'fs'
import * as os from 'os'
import Store from 'electron-store'
const { parseFile } = require('music-metadata')

// ─── Store ──────────────────────────────────────────────────────────────────
const store = new Store({
  defaults: {
    position: 'top-center',
    theme: 'dark',
    opacity: 1.0,
    alwaysOnTop: true,
    showOnAllWorkspaces: true,
    hotkey: 'CommandOrControl+Shift+I',
    musicFolder: '',
    notificationsEnabled: true,
    timerEnabled: true,
    customPosition: { x: -1, y: -1 },
    islandSize: 'normal', // normal | compact | large
    accentColor: '#6c63ff',
  },
})

// ─── Globals ─────────────────────────────────────────────────────────────────
let islandWin: BrowserWindow | null = null
let settingsWin: BrowserWindow | null = null
let tray: Tray | null = null
let currentHotkey = store.get('hotkey') as string
let isVisible = true

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
const RENDERER_URL = 'http://localhost:5173'

// ─── Get island position ──────────────────────────────────────────────────────
function getIslandBounds() {
  const display = screen.getPrimaryDisplay()
  const { width: sw } = display.workAreaSize
  const pos = store.get('position') as string
  const size = store.get('islandSize') as string
  const customPos = store.get('customPosition') as { x: number; y: number }

  const islandWidth = size === 'compact' ? 160 : size === 'large' ? 500 : 380
  const islandHeight = size === 'large' ? 120 : 100
  const winWidth = 560
  const winHeight = 200
  const yOffset = 8

  if (pos === 'custom' && customPos.x >= 0) {
    return { x: customPos.x, y: customPos.y, width: winWidth, height: winHeight }
  }

  let x = 0
  if (pos === 'top-left') x = 20
  else if (pos === 'top-right') x = sw - winWidth - 20
  else x = Math.floor(sw / 2 - winWidth / 2) // center

  return { x, y: yOffset, width: winWidth, height: winHeight }
}

// ─── Create island window ────────────────────────────────────────────────────
function createIslandWindow() {
  const bounds = getIslandBounds()

  islandWin = new BrowserWindow({
    ...bounds,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    movable: true,
    alwaysOnTop: store.get('alwaysOnTop') as boolean,
    skipTaskbar: true,
    focusable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    // macOS: float above fullscreen apps
    type: process.platform === 'darwin' ? 'panel' : 'toolbar',
  })

  if (store.get('showOnAllWorkspaces')) {
  islandWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
}

  if (isDev) {
    islandWin.loadURL(RENDERER_URL + '/#island')
  } else {
    islandWin.loadFile(path.join(__dirname, '../dist/index.html'), {
      hash: 'island',
    })
  }

  // Set level so it floats above everything
  if (process.platform === 'darwin') {
    islandWin.setAlwaysOnTop(true, 'floating', 1)
    islandWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  } else {
    islandWin.setAlwaysOnTop(true, 'screen-saver')
  }

  islandWin.setIgnoreMouseEvents(false)

  islandWin.on('closed', () => {
    islandWin = null
  })

  islandWin.on('moved', () => {
    if (islandWin) {
      const [x, y] = islandWin.getPosition()
      store.set('customPosition', { x, y })
      store.set('position', 'custom')
    }
  })
}

// ─── Create settings window ──────────────────────────────────────────────────
function createSettingsWindow() {
  if (settingsWin) {
    settingsWin.focus()
    return
  }

  const display = screen.getPrimaryDisplay()
  const { width: sw, height: sh } = display.workAreaSize

  settingsWin = new BrowserWindow({
    width: 820,
    height: 580,
    x: Math.floor(sw / 2 - 360),
    y: Math.floor(sh / 2 - 290),
    frame: false,
    transparent: false,
    resizable: false,
    alwaysOnTop: false,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0f0f13',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    settingsWin.loadURL(RENDERER_URL + '/#settings')
    settingsWin.webContents.openDevTools({ mode: 'detach' })
  } else {
    settingsWin.loadFile(path.join(__dirname, '../dist/index.html'), {
      hash: 'settings',
    })
  }

  settingsWin.on('closed', () => {
    settingsWin = null
  })
}

// ─── Tray ────────────────────────────────────────────────────────────────────
function createTray() {
  const icon = nativeImage.createEmpty()
  tray = new Tray(icon)

  const updateMenu = () => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '🏝  Dynamic Island',
        enabled: false,
      },
      { type: 'separator' },
      {
        label: isVisible ? 'Hide Island' : 'Show Island',
        click: () => {
          if (islandWin) {
            if (isVisible) {
              islandWin.hide()
              isVisible = false
            } else {
              islandWin.show()
              isVisible = true
            }
            updateMenu()
          }
        },
      },
      {
        label: 'Settings...',
        accelerator: 'CommandOrControl+,',
        click: () => createSettingsWindow(),
      },
      { type: 'separator' },
      {
        label: 'Reset Position',
        click: () => {
          store.set('position', 'top-center')
          store.set('customPosition', { x: -1, y: -1 })
          if (islandWin) {
            const bounds = getIslandBounds()
            islandWin.setBounds(bounds, true)
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Quit Dynamic Island',
        accelerator: 'CommandOrControl+Q',
        click: () => app.quit(),
      },
    ])
    tray!.setContextMenu(contextMenu)
  }

  updateMenu()
  tray.setToolTip('Dynamic Island')
  tray.on('click', () => {
    if (islandWin) {
      if (isVisible) islandWin.focus()
      else { islandWin.show(); isVisible = true }
    }
  })
}

// ─── Register global hotkey ──────────────────────────────────────────────────
function registerHotkey(hotkey: string) {
  try {
    globalShortcut.unregisterAll()
    globalShortcut.register(hotkey, () => {
      if (islandWin) {
        if (isVisible) {
          islandWin.hide()
          isVisible = false
        } else {
          islandWin.show()
          isVisible = true
        }
      }
    })
    currentHotkey = hotkey
    store.set('hotkey', hotkey)
  } catch (e) {
    console.error('Failed to register hotkey:', e)
  }
}

// ─── IPC Handlers ────────────────────────────────────────────────────────────
function setupIPC() {
  // Settings: get all
  ipcMain.handle('get-settings', () => store.store)
  ipcMain.handle('get-system-media', async () => {
  // returns current snapshot on demand
})

  // Settings: set one key
  ipcMain.handle('set-setting', (_e, key: string, value: unknown) => {
    store.set(key, value)

    // React to certain settings immediately
    if (key === 'alwaysOnTop' && islandWin) {
      islandWin.setAlwaysOnTop(value as boolean, process.platform === 'darwin' ? 'floating' : 'screen-saver')
    }
    if (key === 'position' || key === 'islandSize') {
      if (islandWin) {
        const bounds = getIslandBounds()
        islandWin.setBounds(bounds, true)
      }
    }
    if (key === 'hotkey') {
      registerHotkey(value as string)
    }
    if (key === 'showOnAllWorkspaces' && islandWin) {
      islandWin.setVisibleOnAllWorkspaces(value as boolean, { visibleOnFullScreen: true })
    }

    // Notify island window of settings change
    if (islandWin && !islandWin.isDestroyed()) {
      islandWin.webContents.send('settings-changed', store.store)
    }

    return true
  })

  // Volume control (Windows)
ipcMain.handle('set-volume', async (_e, vol: number) => {
  const { exec } = require('child_process')
  const pct = Math.round(vol * 100)
  exec(`powershell -c "$obj = New-Object -ComObject WScript.Shell; for($i=0;$i -lt 50;$i++){$obj.SendKeys([char]174)}; for($i=0;$i -lt ${Math.round(pct/2)};$i++){$obj.SendKeys([char]175)}"`)
})

ipcMain.handle('get-volume', async () => {
  return new Promise((resolve) => {
    const { exec } = require('child_process')
    exec(`powershell -c "[audio]::Volume"`, (_: any, stdout: string) => {
      resolve(parseFloat(stdout.trim()) || 0.5)
    })
  })
})

  // Open folder picker for music
  ipcMain.handle('pick-music-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Music Folder',
    })
    if (!result.canceled && result.filePaths[0]) {
      store.set('musicFolder', result.filePaths[0])
      return result.filePaths[0]
    }
    return null
  })

  // Open individual music files
  ipcMain.handle('pick-music-files', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      title: 'Add Music Files',
      filters: [
        { name: 'Audio', extensions: ['mp3', 'flac', 'wav', 'aac', 'm4a', 'ogg', 'opus'] },
      ],
    })
    if (!result.canceled) {
      return result.filePaths
    }
    return []
  })

  // Scan music folder and return track metadata
  ipcMain.handle('scan-music', async (_e, folderPath: string) => {
    const tracks: any[] = []
    const validExt = ['.mp3', '.flac', '.wav', '.aac', '.m4a', '.ogg', '.opus']

    const scanDir = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true })
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name)
          if (entry.isDirectory()) {
            scanDir(fullPath)
          } else if (validExt.includes(path.extname(entry.name).toLowerCase())) {
            tracks.push(fullPath)
          }
        }
      } catch {}
    }

    scanDir(folderPath)

    // Parse metadata for each track (limit to first 200 for speed)
    const limited = tracks.slice(0, 200)
    const results = await Promise.allSettled(
      limited.map(async (filePath) => {
        try {
          const meta = await parseFile(filePath, { duration: true })
          return {
            path: filePath,
            title: meta.common.title || path.basename(filePath, path.extname(filePath)),
            artist: meta.common.artist || 'Unknown Artist',
            album: meta.common.album || 'Unknown Album',
            duration: meta.format.duration || 0,
            picture: meta.common.picture?.[0]
              ? {
                  data: Buffer.from(meta.common.picture[0].data).toString('base64'),
                  format: meta.common.picture[0].format,
                }
              : null,
          }
        } catch {
          return {
            path: filePath,
            title: path.basename(filePath, path.extname(filePath)),
            artist: 'Unknown Artist',
            album: 'Unknown Album',
            duration: 0,
            picture: null,
          }
        }
      })
    )

    return results
      .filter((r) => r.status === 'fulfilled')
      .map((r: any) => r.value)
  })

  // Read single file metadata
  ipcMain.handle('get-track-meta', async (_e, filePath: string) => {
    try {
      const meta = await parseFile(filePath, { duration: true })
      return {
        path: filePath,
        title: meta.common.title || path.basename(filePath, path.extname(filePath)),
        artist: meta.common.artist || 'Unknown Artist',
        album: meta.common.album || 'Unknown Album',
        duration: meta.format.duration || 0,
        picture: meta.common.picture?.[0]
          ? {
              data: Buffer.from(meta.common.picture[0].data).toString('base64'),
              format: meta.common.picture[0].format,
            }
          : null,
      }
    } catch {
      return null
    }
  })

  // Open settings window from island
  ipcMain.handle('open-settings', () => {
    createSettingsWindow()
  })

  // Close settings window
  ipcMain.handle('close-settings', () => {
    settingsWin?.close()
  })

  // Cross-window messaging: island ↔ settings
  ipcMain.handle('island-to-settings', (_e, payload) => {
    settingsWin?.webContents.send('from-island', payload)
  })
  ipcMain.handle('settings-to-island', (_e, payload) => {
    islandWin?.webContents.send('from-settings', payload)
  })

  // Convert file path to safe URL for audio
  ipcMain.handle('get-file-url', (_e, filePath: string) => {
    return `file://${filePath.replace(/\\/g, '/')}`
  })

  // Get home directory for default paths
  ipcMain.handle('get-home-dir', () => os.homedir())

  // Notify island from system events
  ipcMain.handle('trigger-notification', (_e, payload) => {
    islandWin?.webContents.send('show-notification', payload)
  })

  // Window dragging
  ipcMain.on('start-drag', (_e, { mouseX, mouseY }) => {
    if (!islandWin) return
    const [winX, winY] = islandWin.getPosition()
    const startX = winX
    const startY = winY

    const onMouseMove = (e: Electron.Event, data: { x: number; y: number }) => {
      islandWin?.setPosition(startX + data.x - mouseX, startY + data.y - mouseY)
    }
    ipcMain.once('end-drag', () => {})
  })
}

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createIslandWindow()
  startMediaWatcher(islandWin!)
  createTray()
  setupIPC()
  registerHotkey(currentHotkey as string)

  app.on('activate', () => {
    if (!islandWin) createIslandWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  stopMediaWatcher()
})