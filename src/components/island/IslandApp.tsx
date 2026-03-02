import React, { useState, useEffect, useCallback, useRef } from 'react'
import type { AppSettings, IslandState, NotificationPayload, Track } from '../../types'
import { usePlayer } from '../../hooks/usePlayer'
import { useTimer } from '../../hooks/useTimer'
import { MusicPanel } from './MusicPanel'
import { NotificationPanel } from './NotificationPanel'
import { TimerPanel } from './TimerPanel'
import { TrackList } from './TrackList'

const DEFAULT_SETTINGS: AppSettings = {
  position: 'top-center',
  theme: 'dark',
  opacity: 1,
  alwaysOnTop: true,
  showOnAllWorkspaces: true,
  hotkey: 'CommandOrControl+Shift+I',
  musicFolder: '',
  notificationsEnabled: true,
  timerEnabled: true,
  customPosition: { x: -1, y: -1 },
  islandSize: 'normal',
  accentColor: '#6c63ff',
}

// Island sizes (w x h in px)
const ISLAND_SIZES: Record<string, { w: number; h: number }> = {
  idle:          { w: 148, h: 36 },
  'idle-music':  { w: 280, h: 36 },
  music:         { w: 520, h: 100 },
  'music-list':  { w: 520, h: 360 },
  notification:  { w: 340, h: 72 },
  timer:         { w: 240, h: 64 },
  settings:      { w: 380, h: 48 },
}

export function IslandApp() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [islandState, setIslandState] = useState<IslandState>('idle')
  const [expanded, setExpanded] = useState(false)
  const [showTrackList, setShowTrackList] = useState(false)
  const [notification, setNotification] = useState<NotificationPayload | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hoverRef = useRef(false)

  const player = usePlayer()
  const timerHook = useTimer()

  // ── Load settings on mount ────────────────────────────────────────────────
  useEffect(() => {
    if (!window.electronAPI) return
    window.electronAPI.getSettings().then(s => {
      if (s) setSettings(s)
    })

    const unsub1 = window.electronAPI.onSettingsChanged(s => setSettings(s))
    const unsub2 = window.electronAPI.onShowNotification(payload => {
      showNotification(payload)
    })
    const unsub3 = window.electronAPI.onFromSettings(payload => {
      const p = payload as any
      if (p.type === 'start-timer') {
        timerHook.start(p.seconds, p.label)
        setIslandState('timer')
        setExpanded(true)
      }
    })

    const unsub4 = window.electronAPI.onSystemMediaUpdate((info: any) => {
  if (info.title && info.playing) {
    // Show as a notification or switch to music state
    player.setExternalTrack({
      title: info.title,
      artist: info.artist,
      album: info.album,
      path: '',
      duration: 0,
      picture: null,
      isExternal: true,
      appId: info.appId,
    })
    setIslandState('music')
    setExpanded(true)
  } else if (!info.playing && player.state.isExternal) {
    setIslandState('idle')
    setExpanded(false)
  }
})


    return () => { unsub1(); unsub2(); unsub3(); unsub4() }
  }, [])

  // ── Auto-switch island state based on what's active ───────────────────────
  useEffect(() => {
    if (islandState === 'notification') return // don't override notifs
    if (timerHook.timer.running) {
      setIslandState('timer')
    } else if (player.state.playing || player.currentTrack) {
      setIslandState('music')
    } else {
      setIslandState('idle')
    }
  }, [player.state.playing, player.currentTrack, timerHook.timer.running])

  // ── Notification system ────────────────────────────────────────────────────
  const showNotification = useCallback((payload: NotificationPayload) => {
    if (!settings.notificationsEnabled) return
    setNotification(payload)
    setIslandState('notification')
    setExpanded(true)

    if (notifTimerRef.current) clearTimeout(notifTimerRef.current)
    notifTimerRef.current = setTimeout(() => {
      setIslandState(player.currentTrack ? 'music' : 'idle')
      setExpanded(!!player.state.playing)
      setNotification(null)
    }, payload.duration || 4000)
  }, [settings.notificationsEnabled, player.currentTrack, player.state.playing])

  // ── Hover to expand ────────────────────────────────────────────────────────
  const handleMouseEnter = () => {
    hoverRef.current = true
    if (islandState === 'idle' || islandState === 'music') {
      setExpanded(true)
    }
  }

  const handleMouseLeave = () => {
    hoverRef.current = false
    if (islandState !== 'notification' && islandState !== 'timer') {
      setTimeout(() => {
        if (!hoverRef.current && !showTrackList) {
          setExpanded(false)
        }
      }, 300)
    }
  }

  // ── Add files handler ──────────────────────────────────────────────────────
  const handleAddFiles = async () => {
    if (!window.electronAPI) return
    const paths = await window.electronAPI.pickMusicFiles()
    if (paths.length === 0) return

    const tracks: Track[] = []
    for (const p of paths) {
      const meta = await window.electronAPI.getTrackMeta(p)
      if (meta) tracks.push(meta)
      else tracks.push({ path: p, title: p.split('/').pop() || p, artist: 'Unknown', album: 'Unknown', duration: 0, picture: null })
    }
    player.addTracks(tracks)
    if (!player.currentTrack && tracks.length > 0) {
      player.setTracks([...player.state.tracks, ...tracks].filter((t, i, arr) => arr.findIndex(x => x.path === t.path) === i), 0)
    }
  }

  const handleScanFolder = async () => {
    if (!window.electronAPI) return
    const folder = await window.electronAPI.pickMusicFolder()
    if (!folder) return

    setIsScanning(true)
    try {
      const scanned = await window.electronAPI.scanMusic(folder)
      player.setTracks(scanned, 0)
    } finally {
      setIsScanning(false)
    }
  }

  // ── Calculate island dimensions ─────────────────────────────────────────────
  const getDimensions = () => {
    if (showTrackList) return ISLAND_SIZES['music-list']
    if (!expanded) {
      if (islandState === 'music' && player.currentTrack) return ISLAND_SIZES['idle-music']
      return ISLAND_SIZES['idle']
    }
    if (islandState === 'notification') return ISLAND_SIZES['notification']
    if (islandState === 'timer') return ISLAND_SIZES['timer']
    if (islandState === 'music') return ISLAND_SIZES['music']
    return ISLAND_SIZES['idle']
  }

  const dims = getDimensions()
  const isIdle = !expanded && islandState !== 'notification' && islandState !== 'timer'
  const isRounded = isIdle || (!showTrackList && !expanded)

  return (
    <div
      id="island-root"
      className="w-full h-full flex items-start justify-center"
      style={{ background: 'transparent' }}
    >
      {/* DRAG REGION - covers the transparent area */}
      <div className="w-full h-full absolute top-0 left-0 drag-region" />

      {/* THE ISLAND */}
      <div
        className="relative no-drag cursor-default"
        style={{ zIndex: 100, marginTop: 8 }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className="island-pill overflow-hidden"
          style={{
            width: dims.w,
            height: dims.h,
            background: '#0a0a0a',
            borderRadius: showTrackList ? 20 : isRounded ? 999 : 20,
            boxShadow: `0 0 0 1px rgba(255,255,255,0.07), 0 8px 32px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.4)`,
            opacity: settings.opacity,
          }}
        >
          {/* ── Idle / Mini player ────────────────────────────────────── */}
          {!expanded && !showTrackList && islandState !== 'notification' && islandState !== 'timer' && (
            <div className="w-full h-full flex items-center">
              {player.currentTrack ? (
                <MusicPanel
                  player={player.state}
                  currentTrack={player.currentTrack}
                  onTogglePlay={player.togglePlay}
                  onNext={player.next}
                  onPrev={player.prev}
                  onSeek={player.seek}
                  onVolumeChange={player.setVolume}
                  onToggleShuffle={player.toggleShuffle}
                  onToggleRepeat={player.toggleRepeat}
                  expanded={false}
                  accentColor={settings.accentColor}
                />
              ) : (
                // Just the "eye" dots in idle
                <div className="flex items-center justify-center w-full gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                  <div className="w-2 h-2 rounded-full bg-white/40" />
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                </div>
              )}
            </div>
          )}

          {/* ── Expanded Music ────────────────────────────────────────── */}
          {expanded && islandState === 'music' && !showTrackList && (
            <>
              <MusicPanel
                player={player.state}
                currentTrack={player.currentTrack}
                onTogglePlay={player.togglePlay}
                onNext={player.next}
                onPrev={player.prev}
                onSeek={player.seek}
                onVolumeChange={player.setVolume}
                onToggleShuffle={player.toggleShuffle}
                onToggleRepeat={player.toggleRepeat}
                expanded={true}
                accentColor={settings.accentColor}
              />
              {/* Queue button */}
              <button
                onClick={() => setShowTrackList(true)}
                className="absolute bottom-2 right-3 text-white/25 hover:text-white/60 transition-colors no-drag"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z" />
                </svg>
              </button>
            </>
          )}

          {/* ── Track List ────────────────────────────────────────────── */}
          {showTrackList && (
            <div className="w-full h-full flex flex-col animate-fade-in">
              {/* Mini player strip at top */}
              <div className="flex items-center px-4 pt-3 pb-2 border-b border-white/5">
                <button
                  onClick={() => setShowTrackList(false)}
                  className="text-white/40 hover:text-white mr-2 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                  </svg>
                </button>
                <span className="text-white/60 text-xs font-medium flex-1">Now Playing</span>
                <div className="flex gap-1 items-center">
                  <button onClick={player.prev} className="text-white/40 hover:text-white p-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
                  </button>
                  <button
                    onClick={player.togglePlay}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white transition-all"
                    style={{ background: settings.accentColor }}
                  >
                    {player.state.playing
                      ? <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                      : <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                    }
                  </button>
                  <button onClick={player.next} className="text-white/40 hover:text-white p-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
                  </button>
                </div>
              </div>
              <TrackList
                tracks={player.state.tracks}
                currentIndex={player.state.currentIndex}
                onPlay={player.playTrackAtIndex}
                onAdd={handleAddFiles}
                onScan={handleScanFolder}
                playing={player.state.playing}
              />
              {isScanning && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl">
                  <p className="text-white text-xs animate-pulse">Scanning folder…</p>
                </div>
              )}
            </div>
          )}

          {/* ── Notification ─────────────────────────────────────────── */}
          {islandState === 'notification' && (
            <NotificationPanel notification={notification} />
          )}

          {/* ── Timer ────────────────────────────────────────────────── */}
          {islandState === 'timer' && (
            <TimerPanel
              timer={timerHook.timer}
              progress={timerHook.progress}
              onPause={timerHook.pause}
              onResume={timerHook.resume}
              onStop={timerHook.stop}
              formatTime={timerHook.formatTime}
              accentColor={settings.accentColor}
            />
          )}

          {/* Ambient glow under island */}
          <div
            className="absolute inset-x-4 bottom-0 h-px pointer-events-none"
            style={{
              background: `linear-gradient(90deg, transparent, ${settings.accentColor}40, transparent)`,
            }}
          />
        </div>

        {/* Open Settings button - faint, appears on hover */}
        {expanded && (
          <button
            onClick={() => window.electronAPI?.openSettings()}
            className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-white/20 hover:text-white/50 transition-colors text-[10px] no-drag"
          >
            ⚙ settings
          </button>
        )}
      </div>
    </div>
  )
}