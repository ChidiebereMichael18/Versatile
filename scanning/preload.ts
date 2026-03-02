import { contextBridge, ipcRenderer } from 'electron'

// Type-safe API exposed to renderer
const api = {
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSetting: (key: string, value: unknown) => ipcRenderer.invoke('set-setting', key, value),

  // File ops
  pickMusicFolder: () => ipcRenderer.invoke('pick-music-folder'),
  pickMusicFiles: () => ipcRenderer.invoke('pick-music-files'),
  scanMusic: (folder: string) => ipcRenderer.invoke('scan-music', folder),
  getTrackMeta: (filePath: string) => ipcRenderer.invoke('get-track-meta', filePath),
  getFileUrl: (filePath: string) => ipcRenderer.invoke('get-file-url', filePath),
  getHomeDir: () => ipcRenderer.invoke('get-home-dir'),

  // Window
  openSettings: () => ipcRenderer.invoke('open-settings'),
  closeSettings: () => ipcRenderer.invoke('close-settings'),

  // Cross-window comms
  islandToSettings: (payload: unknown) => ipcRenderer.invoke('island-to-settings', payload),
  settingsToIsland: (payload: unknown) => ipcRenderer.invoke('settings-to-island', payload),
  triggerNotification: (payload: unknown) => ipcRenderer.invoke('trigger-notification', payload),

  // Listeners
  onSettingsChanged: (cb: (settings: any) => void) => {
    ipcRenderer.on('settings-changed', (_e, data) => cb(data))
    return () => ipcRenderer.removeAllListeners('settings-changed')
  },
  onShowNotification: (cb: (payload: any) => void) => {
    ipcRenderer.on('show-notification', (_e, data) => cb(data))
    return () => ipcRenderer.removeAllListeners('show-notification')
  },
  onFromSettings: (cb: (payload: any) => void) => {
    ipcRenderer.on('from-settings', (_e, data) => cb(data))
    return () => ipcRenderer.removeAllListeners('from-settings')
  },
  onFromIsland: (cb: (payload: any) => void) => {
    ipcRenderer.on('from-island', (_e, data) => cb(data))
    return () => ipcRenderer.removeAllListeners('from-island')
  },
  onSystemMediaUpdate: (cb: (info: any) => void) => {
  ipcRenderer.on('system-media-update', (_e, data) => cb(data))
  return () => ipcRenderer.removeAllListeners('system-media-update')
},
}

contextBridge.exposeInMainWorld('electronAPI', api)

export type ElectronAPI = typeof api