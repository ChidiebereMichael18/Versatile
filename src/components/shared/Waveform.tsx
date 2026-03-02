import React from 'react'

interface Props {
  playing: boolean
  color?: string
  bars?: number
  height?: number
}

export function Waveform({ playing, color = '#6c63ff', bars = 5, height = 16 }: Props) {
  const delays = [0, 0.15, 0.3, 0.1, 0.25]

  return (
    <div className="flex items-center gap-px" style={{ height }}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className="w-0.5 rounded-full transition-all duration-200"
          style={{
            height: playing ? `${height}px` : `${height * 0.25}px`,
            background: color,
            animation: playing ? `waveBar 0.7s ease-in-out infinite alternate` : 'none',
            animationDelay: `${delays[i] || i * 0.1}s`,
            transform: 'scaleY(0.5)',
            transformOrigin: 'center',
          }}
        />
      ))}
    </div>
  )
}