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

const ISLAND_SIZES: Record<string, { w: number; h: number }> = {
  idle:         { w: 148, h: 36 },
  'idle-music': { w: 280, h: 36 },
  music:        { w: 520, h: 100 },
  'music-list': { w: 520, h: 360 },
  notification: { w: 340, h: 72 },
  timer:        { w: 240, h: 64 },
}

// ── Spring animation hook ─────────────────────────────────────────────────────
function useSpring(target: number, stiffness = 200, damping = 20) {
  const [value, setValue] = useState(target)
  const velRef = useRef(0)
  const valRef = useRef(target)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const animate = () => {
      const force = (target - valRef.current) * stiffness * 0.001
      velRef.current = (velRef.current + force) * (1 - damping * 0.001)
      valRef.current += velRef.current

      if (Math.abs(target - valRef.current) < 0.05 && Math.abs(velRef.current) < 0.05) {
        valRef.current = target
        velRef.current = 0
        setValue(target)
        return
      }

      setValue(valRef.current)
      rafRef.current = requestAnimationFrame(animate)
    }

    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, stiffness, damping])

  return value
}

// ── Theme definitions ─────────────────────────────────────────────────────────
const THEMES = {
  dark: {
    bg: '#0a0a0a',
    border: 'rgba(255,255,255,0.07)',
    shadow: '0 0 0 1px rgba(255,255,255,0.07), 0 8px 32px rgba(0,0,0,0.7)',
    backdrop: false,
  },
  glass: {
    bg: 'rgba(12,12,16,0.75)',
    border: 'rgba(255,255,255,0.12)',
    shadow: '0 0 0 1px rgba(255,255,255,0.12), 0 8px 40px rgba(0,0,0,0.5)',
    backdrop: true,
  },
  light: {
    bg: 'rgba(240,240,245,0.95)',
    border: 'rgba(0,0,0,0.08)',
    shadow: '0 0 0 1px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.15)',
    backdrop: false,
  },
}

// ── Volume OSD ────────────────────────────────────────────────────────────────
function VolumeOSD({ volume, visible }: { volume: number; visible: boolean }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: -48,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.85)',
        borderRadius: 12,
        padding: '6px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.2s',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        zIndex: 200,
      }}
    >
      <span style={{ fontSize: 12 }}>
        {volume === 0 ? '🔇' : volume < 0.4 ? '🔈' : volume < 0.7 ? '🔉' : '🔊'}
      </span>
      <div style={{ width: 80, height: 3, background: 'rgba(255,255,255,0.2)', borderRadius: 2 }}>
        <div style={{ width: `${volume * 100}%`, height: '100%', background: '#fff', borderRadius: 2, transition: 'width 0.1s' }} />
      </div>
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontVariantNumeric: 'tabular-nums', minWidth: 28 }}>
        {Math.round(volume * 100)}%
      </span>
    </div>
  )
}

export function IslandApp() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [theme, setTheme] = useState<'dark' | 'glass' | 'light'>('dark')
  const [islandState, setIslandState] = useState<IslandState>('idle')
  const [expanded, setExpanded] = useState(false)
  const [showTrackList, setShowTrackList] = useState(false)
  const [notification, setNotification] = useState<NotificationPayload | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [volume, setVolumeState] = useState(0.5)
  const [showVolumeOSD, setShowVolumeOSD] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragPos, setDragPos] = useState({ x: 0, y: 8 })
  const [hasDragged, setHasDragged] = useState(false)

  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const volumeOSDTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hoverRef = useRef(false)
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 })
  const islandRef = useRef<HTMLDivElement>(null)

  const player = usePlayer()
  const timerHook = useTimer()

  // Spring-animated dimensions
  const dims = (() => {
    if (showTrackList) return ISLAND_SIZES['music-list']
    if (!expanded) {
      if (islandState === 'music' && player.currentTrack) return ISLAND_SIZES['idle-music']
      return ISLAND_SIZES['idle']
    }
    if (islandState === 'notification') return ISLAND_SIZES['notification']
    if (islandState === 'timer') return ISLAND_SIZES['timer']
    if (islandState === 'music') return ISLAND_SIZES['music']
    return ISLAND_SIZES['idle']
  })()

  const springW = useSpring(dims.w, 280, 28)
  const springH = useSpring(dims.h, 280, 28)

  const currentTheme = THEMES[theme]

  // ── Load settings ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!window.electronAPI) return
    window.electronAPI.getSettings().then((s: any) => {
      if (s) {
        setSettings(s)
        if (s.theme) setTheme(s.theme)
      }
    })
    window.electronAPI.getSystemVolume?.().then((v: number) => {
      if (v) setVolumeState(v)
    })

    const unsub1 = window.electronAPI.onSettingsChanged((s: any) => {
      setSettings(s)
      if (s.theme) setTheme(s.theme)
    })
    const unsub2 = window.electronAPI.onShowNotification((payload: any) => showNotification(payload))
    const unsub3 = window.electronAPI.onFromSettings((payload: any) => {
      if (payload.type === 'start-timer') {
        timerHook.start(payload.seconds, payload.label)
        setIslandState('timer')
        setExpanded(true)
      }
    })
    const unsub4 = window.electronAPI.onSystemMediaUpdate?.((info: any) => {
      if (info.title && info.playing) {
        player.setExternalTrack({
          title: info.title, artist: info.artist, album: info.album,
          path: '', duration: 0, picture: null, isExternal: true, appId: info.appId,
        })
        setIslandState('music')
        setExpanded(true)
      } else if (!info.playing && player.state.isExternal) {
        setIslandState('idle')
        setExpanded(false)
      }
    })

    return () => {
      unsub1()
      unsub2()
      unsub3()
      unsub4?.()
    }
  }, [])

  // ── Auto-state ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (islandState === 'notification') return
    if (timerHook.timer.running) setIslandState('timer')
    else if (player.state.playing || player.currentTrack) setIslandState('music')
    else setIslandState('idle')
  }, [player.state.playing, player.currentTrack, timerHook.timer.running])

  // ── Notifications ──────────────────────────────────────────────────────────
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

  // ── Scroll to change volume ────────────────────────────────────────────────
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.05 : 0.05
    const newVol = Math.max(0, Math.min(1, volume + delta))
    setVolumeState(newVol)
    window.electronAPI?.setSystemVolume?.(newVol)

    // Show OSD
    setShowVolumeOSD(true)
    if (volumeOSDTimer.current) clearTimeout(volumeOSDTimer.current)
    volumeOSDTimer.current = setTimeout(() => setShowVolumeOSD(false), 1500)
  }, [volume])

  // ── Drag to reposition ─────────────────────────────────────────────────────
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input')) return
    e.preventDefault()
    setIsDragging(true)
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: dragPos.x,
      posY: dragPos.y,
    }

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - dragStartRef.current.mouseX
      const dy = ev.clientY - dragStartRef.current.mouseY
      setHasDragged(true)
      setDragPos({
        x: dragStartRef.current.posX + dx,
        y: Math.max(4, dragStartRef.current.posY + dy),
      })
    }

    const onUp = () => {
      setIsDragging(false)
      setTimeout(() => setHasDragged(false), 100)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [dragPos])

  // ── Hover expand ──────────────────────────────────────────────────────────
  const handleMouseEnter = () => {
    hoverRef.current = true
    if (!isDragging && (islandState === 'idle' || islandState === 'music')) {
      setExpanded(true)
    }
  }

  const handleMouseLeave = () => {
    hoverRef.current = false
    if (islandState !== 'notification' && islandState !== 'timer') {
      setTimeout(() => {
        if (!hoverRef.current && !showTrackList) setExpanded(false)
      }, 300)
    }
  }

  // ── Music file handlers ────────────────────────────────────────────────────
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

  const isIdle = !expanded && islandState !== 'notification' && islandState !== 'timer'
  const isRounded = isIdle || (!showTrackList && !expanded)

  // ── Island position: centered by default, drag-offset applied ─────────────
  const islandStyle: React.CSSProperties = {
    position: 'fixed',
    top: dragPos.y,
    left: `calc(50% + ${dragPos.x}px)`,
    transform: 'translateX(-50%)',
    zIndex: 100,
    cursor: isDragging ? 'grabbing' : 'grab',
    transition: isDragging ? 'none' : 'top 0.3s cubic-bezier(0.34,1.56,0.64,1)',
  }

  return (
    <div
      id="island-root"
      style={{ width: '100vw', height: '100vh', background: 'transparent', position: 'relative', overflow: 'hidden' }}
    >
      <div
        ref={islandRef}
        style={islandStyle}
        onMouseDown={handleDragStart}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      >
        {/* ── The pill ──────────────────────────────────────────────────── */}
        <div
          className="island-pill overflow-hidden"
          style={{
            width: springW,
            height: springH,
            background: currentTheme.bg,
            backdropFilter: currentTheme.backdrop ? 'blur(24px) saturate(180%)' : undefined,
            WebkitBackdropFilter: currentTheme.backdrop ? 'blur(24px) saturate(180%)' : undefined,
            borderRadius: showTrackList ? 20 : isRounded ? 999 : 20,
            border: `1px solid ${currentTheme.border}`,
            boxShadow: currentTheme.shadow,
            opacity: settings.opacity,
            transition: 'border-radius 0.4s cubic-bezier(0.34,1.56,0.64,1), border 0.3s, background 0.3s',
            position: 'relative',
          }}
        >
          {/* Ambient glow line */}
          <div style={{
            position: 'absolute', bottom: 0, left: '15%', right: '15%', height: 1,
            background: `linear-gradient(90deg, transparent, ${settings.accentColor}50, transparent)`,
            pointerEvents: 'none',
          }} />

          {/* Theme-specific inner border shimmer for glass */}
          {theme === 'glass' && (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 'inherit',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 60%)',
              pointerEvents: 'none',
            }} />
          )}

          {/* ── Idle ─────────────────────────────────────────────── */}
          {!expanded && !showTrackList && islandState !== 'notification' && islandState !== 'timer' && (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: theme === 'light' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)' }} />
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: theme === 'light' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)' }} />
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: theme === 'light' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)' }} />
                </div>
              )}
            </div>
          )}

          {/* ── Expanded Music ───────────────────────────────────── */}
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
              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={() => setShowTrackList(true)}
                style={{ position: 'absolute', bottom: 8, right: 12, color: 'rgba(255,255,255,0.25)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z" />
                </svg>
              </button>
            </>
          )}

          {/* ── Track List ───────────────────────────────────────── */}
          {showTrackList && (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <button onMouseDown={e => e.stopPropagation()} onClick={() => setShowTrackList(false)} style={{ color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', marginRight: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
                </button>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 500, flex: 1 }}>Queue</span>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <button onMouseDown={e => e.stopPropagation()} onClick={player.prev} style={{ color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" /></svg>
                  </button>
                  <button onMouseDown={e => e.stopPropagation()} onClick={player.togglePlay}
                    style={{ width: 28, height: 28, borderRadius: '50%', background: settings.accentColor, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {player.state.playing
                      ? <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                      : <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>}
                  </button>
                  <button onMouseDown={e => e.stopPropagation()} onClick={player.next} style={{ color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
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
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 20 }}>
                  <p style={{ color: '#fff', fontSize: 12 }}>Scanning…</p>
                </div>
              )}
            </div>
          )}

          {/* ── Notification ─────────────────────────────────────── */}
          {islandState === 'notification' && <NotificationPanel notification={notification} />}

          {/* ── Timer ────────────────────────────────────────────── */}
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
        </div>

        {/* Volume OSD */}
        <VolumeOSD volume={volume} visible={showVolumeOSD} />

        {/* Settings button */}
        {expanded && (
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={() => !hasDragged && window.electronAPI?.openSettings()}
            style={{
              position: 'absolute', bottom: -22, left: '50%', transform: 'translateX(-50%)',
              color: 'rgba(255,255,255,0.2)', background: 'none', border: 'none',
              cursor: 'pointer', fontSize: 10, whiteSpace: 'nowrap',
            }}
          >
            ⚙ settings
          </button>
        )}

        {/* Drag indicator - subtle dots when hovering */}
        {!expanded && !isDragging && (
          <div style={{
            position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: 3, opacity: 0.3, pointerEvents: 'none',
          }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: '#fff' }} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}