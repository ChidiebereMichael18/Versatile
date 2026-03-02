import React from 'react'
import type { TimerState } from '../../types'

interface Props {
  timer: TimerState
  progress: number
  onPause: () => void
  onResume: () => void
  onStop: () => void
  formatTime: (s: number) => string
  accentColor?: string
}

export function TimerPanel({ timer, progress, onPause, onResume, onStop, formatTime, accentColor = '#43e97b' }: Props) {
  const circumference = 2 * Math.PI * 18
  const offset = circumference * (1 - progress)

  const isFinished = timer.remainingSeconds === 0 && timer.totalSeconds > 0

  return (
    <div className="flex items-center justify-between w-full h-full px-5 no-drag animate-fade-in">
      <div>
        <p className="text-white/40 text-[10px] uppercase tracking-wider">{timer.label}</p>
        <p
          className={`text-white text-2xl font-semibold font-mono tracking-tight mt-0.5 ${
            isFinished ? 'text-red-400 animate-pulse' : ''
          }`}
        >
          {formatTime(timer.remainingSeconds)}
        </p>
      </div>

      {/* Ring progress */}
      <div className="relative w-12 h-12 flex items-center justify-center">
        <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90">
          <circle cx="24" cy="24" r="18" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
          <circle
            cx="24" cy="24" r="18"
            fill="none"
            stroke={isFinished ? '#ff3b30' : accentColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className="absolute flex gap-1">
          {timer.running ? (
            <button onClick={onPause} className="text-white/60 hover:text-white transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            </button>
          ) : (
            <button onClick={onResume} className="text-white/60 hover:text-white transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <button
        onClick={onStop}
        className="text-white/30 hover:text-white/70 transition-colors text-xs"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
        </svg>
      </button>
    </div>
  )
}