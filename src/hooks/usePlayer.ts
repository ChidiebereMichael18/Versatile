import { useState, useEffect, useRef, useCallback } from 'react'
import type { Track, PlayerState } from '../types'

const DEFAULT_STATE: PlayerState = {
  tracks: [],
  currentIndex: -1,
  playing: false,
  volume: 0.8,
  progress: 0,
  duration: 0,
  shuffle: false,
  repeat: 'none',
  isExternal: false,       
  externalTrack: null, 
}

export function usePlayer() {
  const [state, setState] = useState<PlayerState>(DEFAULT_STATE)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio()
    audio.volume = DEFAULT_STATE.volume
    audioRef.current = audio

    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('loadedmetadata', () => {
      setState(s => ({ ...s, duration: audio.duration }))
    })
    audio.addEventListener('play', () => setState(s => ({ ...s, playing: true })))
    audio.addEventListener('pause', () => setState(s => ({ ...s, playing: false })))

    return () => {
      audio.pause()
      audio.removeEventListener('ended', handleEnded)
      if (progressInterval.current) clearInterval(progressInterval.current)
    }
  }, [])

  const setExternalTrack = useCallback((track: Track & { isExternal: boolean; appId: string }) => {
  setState(s => ({
    ...s,
    isExternal: true,
    externalTrack: track,
    playing: true,
  }))
}, [])

const clearExternalTrack = useCallback(() => {
  setState(s => ({
    ...s,
    isExternal: false,
    externalTrack: null,
    playing: false,
  }))
}, [])

  // Progress ticker
  useEffect(() => {
    if (progressInterval.current) clearInterval(progressInterval.current)

    if (state.playing) {
      progressInterval.current = setInterval(() => {
        const audio = audioRef.current
        if (audio && audio.duration) {
          setState(s => ({
            ...s,
            progress: audio.currentTime / audio.duration,
          }))
        }
      }, 500)
    }

    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current)
    }
  }, [state.playing])

  function handleEnded() {
    setState(s => {
      if (s.repeat === 'one') {
        audioRef.current?.play()
        return { ...s, progress: 0 }
      }
      if (s.shuffle) {
        const nextIndex = Math.floor(Math.random() * s.tracks.length)
        playTrackAtIndex(nextIndex)
        return s
      }
      const nextIndex = s.currentIndex + 1
      if (nextIndex >= s.tracks.length) {
        if (s.repeat === 'all') {
          playTrackAtIndex(0)
        }
        return { ...s, playing: false, progress: 0 }
      }
      playTrackAtIndex(nextIndex)
      return s
    })
  }

  const playTrackAtIndex = useCallback(async (index: number) => {
    setState(s => {
      if (index < 0 || index >= s.tracks.length) return s
      const track = s.tracks[index]

      const audio = audioRef.current
      if (!audio) return s

      // Get file URL via IPC and play
      if (window.electronAPI) {
        window.electronAPI.getFileUrl(track.path).then(url => {
          audio.src = url
          audio.load()
          audio.play().catch(console.error)
        })
      } else {
        // Dev fallback
        audio.src = track.path
        audio.load()
        audio.play().catch(console.error)
      }

      return { ...s, currentIndex: index, progress: 0, duration: track.duration }
    })
  }, [])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    if (state.currentIndex === -1 && state.tracks.length > 0) {
      playTrackAtIndex(0)
      return
    }

    if (state.playing) {
      audio.pause()
    } else {
      audio.play().catch(console.error)
    }
  }, [state.playing, state.currentIndex, state.tracks.length, playTrackAtIndex])

  const next = useCallback(() => {
    setState(s => {
      if (s.tracks.length === 0) return s
      let nextIndex: number
      if (s.shuffle) {
        nextIndex = Math.floor(Math.random() * s.tracks.length)
      } else {
        nextIndex = s.repeat === 'all'
          ? (s.currentIndex + 1) % s.tracks.length
          : Math.min(s.currentIndex + 1, s.tracks.length - 1)
      }
      playTrackAtIndex(nextIndex)
      return { ...s, currentIndex: nextIndex }
    })
  }, [playTrackAtIndex])

  const prev = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    // If more than 3s in, restart
    if (audio.currentTime > 3) {
      audio.currentTime = 0
      return
    }

    setState(s => {
      const prevIndex = Math.max(0, s.currentIndex - 1)
      playTrackAtIndex(prevIndex)
      return { ...s, currentIndex: prevIndex }
    })
  }, [playTrackAtIndex])

  const setVolume = useCallback((vol: number) => {
    if (audioRef.current) audioRef.current.volume = vol
    setState(s => ({ ...s, volume: vol }))
  }, [])

  const seek = useCallback((progress: number) => {
    const audio = audioRef.current
    if (!audio || !audio.duration) return
    audio.currentTime = progress * audio.duration
    setState(s => ({ ...s, progress }))
  }, [])

  const addTracks = useCallback((newTracks: Track[]) => {
    setState(s => {
      const merged = [...s.tracks]
      for (const t of newTracks) {
        if (!merged.find(x => x.path === t.path)) merged.push(t)
      }
      return { ...s, tracks: merged }
    })
  }, [])

  const setTracks = useCallback((tracks: Track[], startIndex = 0) => {
    setState(s => ({ ...s, tracks, currentIndex: -1 }))
    if (tracks.length > 0) playTrackAtIndex(startIndex)
  }, [playTrackAtIndex])

  const toggleShuffle = useCallback(() => {
    setState(s => ({ ...s, shuffle: !s.shuffle }))
  }, [])

  const toggleRepeat = useCallback(() => {
    setState(s => {
      const cycle: PlayerState['repeat'][] = ['none', 'all', 'one']
      const next = cycle[(cycle.indexOf(s.repeat) + 1) % cycle.length]
      return { ...s, repeat: next }
    })
  }, [])

  const currentTrack = state.currentIndex >= 0 ? state.tracks[state.currentIndex] : null

  return {
    state,
    currentTrack,
    togglePlay,
    next,
    prev,
    setVolume,
    seek,
    addTracks,
    setTracks,
    playTrackAtIndex,
    toggleShuffle,
    toggleRepeat,
    setExternalTrack,     
  clearExternalTrack,
  }
}