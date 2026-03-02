export interface Track {
  path: string
  title: string
  artist: string
  album: string
  duration: number
  picture: { data: string; format: string } | null
 isExternal?: boolean  
  appId?: string
}

export interface AppSettings {
  position: 'top-center' | 'top-left' | 'top-right' | 'custom'
  theme: 'dark' | 'darker'
  opacity: number
  alwaysOnTop: boolean
  showOnAllWorkspaces: boolean
  hotkey: string
  musicFolder: string
  notificationsEnabled: boolean
  timerEnabled: boolean
  customPosition: { x: number; y: number }
  islandSize: 'compact' | 'normal' | 'large'
  accentColor: string
}

export type IslandState =
  | 'idle'
  | 'music'
  | 'music-mini'
  | 'notification'
  | 'timer'
  | 'call'
  | 'volume'
  | 'brightness'
  | 'battery'
  | 'download'
  | 'airdrop'

export interface NotificationPayload {
  icon: string
  app: string
  message: string
  color?: string
  duration?: number
}

export interface TimerState {
  running: boolean
  totalSeconds: number
  remainingSeconds: number
  label: string
}

export interface PlayerState {
  tracks: Track[]
  currentIndex: number
  playing: boolean
  volume: number
  progress: number // 0-1
  duration: number
  shuffle: boolean
  repeat: 'none' | 'one' | 'all'
 isExternal: boolean        // ADD THIS
  externalTrack: Track | null  // ADD THIS
}

// Augment window with electronAPI
declare global {
  interface Window {
    electronAPI: {
      getSettings: () => Promise<AppSettings>
      setSetting: (key: string, value: unknown) => Promise<boolean>
      pickMusicFolder: () => Promise<string | null>
      pickMusicFiles: () => Promise<string[]>
      scanMusic: (folder: string) => Promise<Track[]>
      getTrackMeta: (filePath: string) => Promise<Track | null>
      getFileUrl: (filePath: string) => Promise<string>
      getHomeDir: () => Promise<string>
      openSettings: () => Promise<void>
      closeSettings: () => Promise<void>
      islandToSettings: (payload: unknown) => Promise<void>
      settingsToIsland: (payload: unknown) => Promise<void>
      triggerNotification: (payload: unknown) => Promise<void>
      onSettingsChanged: (cb: (settings: AppSettings) => void) => () => void
      onShowNotification: (cb: (payload: NotificationPayload) => void) => () => void
      onFromSettings: (cb: (payload: unknown) => void) => () => void
      onFromIsland: (cb: (payload: unknown) => void) => () => void
    onSystemMediaUpdate: (cb: (data: any) => void) => () => void
    }
  }
}