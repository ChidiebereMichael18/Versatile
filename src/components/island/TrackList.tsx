import React, { useState } from 'react'
import type { Track } from '../../types'
import { formatTime } from '../../utils'
import { AlbumArt } from '../shared/AlbumArt'

interface Props {
  tracks: Track[]
  currentIndex: number
  onPlay: (index: number) => void
  onAdd: () => void
  onScan: () => void
  playing: boolean
}

export function TrackList({ tracks, currentIndex, onPlay, onAdd, onScan, playing }: Props) {
  const [search, setSearch] = useState('')

  const filtered = tracks.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.artist.toLowerCase().includes(search.toLowerCase()) ||
    t.album.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full no-drag">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span className="text-white/60 text-xs font-medium uppercase tracking-wider">
          Queue · {tracks.length} tracks
        </span>
        <div className="flex gap-2">
          <button
            onClick={onAdd}
            className="text-white/40 hover:text-white text-xs transition-colors flex items-center gap-1"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
            Add Files
          </button>
          <button
            onClick={onScan}
            className="text-white/40 hover:text-white text-xs transition-colors"
          >
            Scan Folder
          </button>
        </div>
      </div>

      {/* Search */}
      {tracks.length > 0 && (
        <div className="px-4 pb-2">
          <input
            type="text"
            placeholder="Search tracks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white/70 text-xs placeholder-white/25 outline-none focus:border-white/20"
          />
        </div>
      )}

      {/* Track list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-3 text-white/20">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
            </svg>
            <p className="text-xs text-center">
              {tracks.length === 0 ? 'No tracks yet.\nAdd files or scan a folder.' : 'No results found.'}
            </p>
          </div>
        ) : (
          filtered.map((track, i) => {
            const isActive = tracks.indexOf(track) === currentIndex
            return (
              <button
                key={track.path}
                onClick={() => onPlay(tracks.indexOf(track))}
                className={`w-full flex items-center gap-3 px-4 py-2 transition-colors text-left group ${
                  isActive ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                <div className="w-8 h-8 flex-shrink-0 relative">
                  <AlbumArt track={track} size={32} />
                  {isActive && playing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                      <div className="flex gap-px items-end h-3">
                        {[0, 0.2, 0.1].map((d, idx) => (
                          <div
                            key={idx}
                            className="w-0.5 bg-white rounded-full"
                            style={{
                              height: '100%',
                              animation: `waveBar 0.7s ${d}s ease-in-out infinite alternate`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium truncate ${isActive ? 'text-white' : 'text-white/70 group-hover:text-white/90'}`}>
                    {track.title}
                  </p>
                  <p className="text-[10px] text-white/35 truncate">{track.artist}</p>
                </div>
                <span className="text-[10px] text-white/25 flex-shrink-0 font-mono">
                  {formatTime(track.duration)}
                </span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}