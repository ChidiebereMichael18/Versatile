import React, { useRef } from 'react'
import type { PlayerState, Track } from '../../types'
import { AlbumArt } from '../shared/AlbumArt'
import { Waveform } from '../shared/Waveform'
import { formatTime } from '../../utils'

interface Props {
  player: PlayerState
  currentTrack: Track | null
  onTogglePlay: () => void
  onNext: () => void
  onPrev: () => void
  onSeek: (p: number) => void
  onVolumeChange: (v: number) => void
  onToggleShuffle: () => void
  onToggleRepeat: () => void
  expanded: boolean
  accentColor?: string
}

export function MusicPanel({
  player, currentTrack, onTogglePlay, onNext, onPrev, onSeek, onVolumeChange,
  onToggleShuffle, onToggleRepeat, expanded, accentColor = '#6c63ff',
}: Props) {
  const progressRef = useRef<HTMLDivElement>(null)

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = progressRef.current?.getBoundingClientRect()
    if (!rect) return
    const p = (e.clientX - rect.left) / rect.width
    onSeek(Math.max(0, Math.min(1, p)))
  }

  const currentTime = player.duration * player.progress
  const remaining = player.duration - currentTime

  if (!expanded) {
    // Compact music strip shown in idle pill
    return (
      <div className="flex items-center gap-2 w-full h-full px-3">
        <AlbumArt track={currentTrack} size={24} className="rounded-md" />
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-medium truncate leading-none">
            {currentTrack?.title || 'No Track'}
          </p>
        </div>
        <div className="flex items-center gap-1 no-drag">
          <button onClick={onPrev} className="text-white/50 hover:text-white p-0.5 transition-colors">
            <PrevIcon />
          </button>
          <button
            onClick={onTogglePlay}
            className="text-white w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
          >
            {player.playing ? <PauseIcon size={12} /> : <PlayIcon size={12} />}
          </button>
          <button onClick={onNext} className="text-white/50 hover:text-white p-0.5 transition-colors">
            <NextIcon />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full h-full px-4 pt-3 pb-3 animate-fade-in no-drag">
      {/* Top row: art + info + controls */}
      <div className="flex items-center gap-3">
        <AlbumArt track={currentTrack} size={62} />

        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate leading-tight">
            {currentTrack?.title || 'No Track Selected'}
          </p>
          <p className="text-white/50 text-xs truncate mt-0.5">
            {currentTrack?.artist || 'Unknown Artist'}
          </p>
          {player.playing && (
            <div className="mt-1.5">
              <Waveform playing={player.playing} color={accentColor} bars={5} height={12} />
            </div>
          )}
        </div>

        {/* Main controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onToggleShuffle}
            className={`p-1.5 rounded-full transition-all ${player.shuffle ? 'text-[var(--accent)]' : 'text-white/40 hover:text-white/70'}`}
            style={{ '--accent': accentColor } as React.CSSProperties}
          >
            <ShuffleIcon />
          </button>
          <button onClick={onPrev} className="p-1.5 text-white/70 hover:text-white transition-colors">
            <SkipPrevIcon />
          </button>
          <button
            onClick={onTogglePlay}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            style={{ background: accentColor }}
          >
            {player.playing ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
          </button>
          <button onClick={onNext} className="p-1.5 text-white/70 hover:text-white transition-colors">
            <SkipNextIcon />
          </button>
          <button
            onClick={onToggleRepeat}
            className={`p-1.5 rounded-full transition-all text-xs ${
              player.repeat !== 'none' ? 'text-[var(--accent)]' : 'text-white/40 hover:text-white/70'
            }`}
            style={{ '--accent': accentColor } as React.CSSProperties}
          >
            {player.repeat === 'one' ? <Repeat1Icon /> : <RepeatIcon />}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-white/40 text-xs font-mono w-8 text-right flex-shrink-0">
          {formatTime(currentTime)}
        </span>
        <div
          ref={progressRef}
          className="progress-track flex-1 h-1 cursor-pointer group"
          onClick={handleProgressClick}
        >
          <div
            className="progress-fill group-hover:h-1.5 transition-all"
            style={{
              width: `${player.progress * 100}%`,
              background: `linear-gradient(90deg, ${accentColor}, ${accentColor}bb)`,
            }}
          />
        </div>
        <span className="text-white/40 text-xs font-mono w-8 flex-shrink-0">
          -{formatTime(remaining)}
        </span>
        {/* Volume */}
        <div className="flex items-center gap-1 flex-shrink-0 ml-1">
          <VolumeIcon muted={player.volume === 0} />
          <input
            type="range"
            min="0" max="1" step="0.01"
            value={player.volume}
            onChange={e => onVolumeChange(Number(e.target.value))}
            className="w-16 h-1 cursor-pointer"
          />
        </div>
      </div>
    </div>
  )
}

// ─── Icon components ──────────────────────────────────────────────────────────
const PlayIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="white">
    <path d="M8 5v14l11-7z" />
  </svg>
)

const PauseIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="white">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
)

const PrevIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
  </svg>
)

const NextIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
  </svg>
)

const SkipPrevIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
  </svg>
)

const SkipNextIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
  </svg>
)

const ShuffleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
  </svg>
)

const RepeatIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
  </svg>
)

const Repeat1Icon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v6H13z" />
  </svg>
)

const VolumeIcon = ({ muted }: { muted: boolean }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="rgba(255,255,255,0.4)">
    {muted ? (
      <path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
    ) : (
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
    )}
  </svg>
)