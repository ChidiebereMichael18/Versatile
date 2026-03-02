import React from 'react'
import { trackArtUrl, colorFromString } from '../../utils'
import type { Track } from '../../types'

interface Props {
  track: Track | null
  size?: number
  className?: string
  spinning?: boolean
}

export function AlbumArt({ track, size = 56, className = '', spinning = false }: Props) {
  const artUrl = track ? trackArtUrl(track.picture) : null
  const bg = track ? colorFromString(track.album) : '#333'

  return (
    <div
      className={`relative overflow-hidden rounded-xl flex-shrink-0 ${spinning ? 'vinyl-spin' : ''} ${className}`}
      style={{ width: size, height: size }}
    >
      {artUrl ? (
        <img
          src={artUrl}
          alt={track?.album}
          className="w-full h-full object-cover"
          style={{ borderRadius: size * 0.2 }}
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${bg}cc, ${bg}44)`,
            borderRadius: size * 0.2,
          }}
        >
          <svg width={size * 0.45} height={size * 0.45} viewBox="0 0 24 24" fill="none">
            <path
              d="M9 18V5l12-2v13M9 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm12 0c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z"
              stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
      {/* Sheen overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius: size * 0.2,
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)',
        }}
      />
    </div>
  )
}