import { useState, useEffect, useRef, useCallback } from 'react'
import type { TimerState } from '../types'

export function useTimer() {
  const [timer, setTimer] = useState<TimerState>({
    running: false,
    totalSeconds: 0,
    remainingSeconds: 0,
    label: 'Timer',
  })
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const start = useCallback((seconds: number, label = 'Timer') => {
    if (intervalRef.current) clearInterval(intervalRef.current)

    setTimer({ running: true, totalSeconds: seconds, remainingSeconds: seconds, label })

    intervalRef.current = setInterval(() => {
      setTimer(s => {
        if (s.remainingSeconds <= 1) {
          clearInterval(intervalRef.current!)
          intervalRef.current = null
          return { ...s, running: false, remainingSeconds: 0 }
        }
        return { ...s, remainingSeconds: s.remainingSeconds - 1 }
      })
    }, 1000)
  }, [])

  const pause = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setTimer(s => ({ ...s, running: false }))
  }, [])

  const resume = useCallback(() => {
    if (timer.remainingSeconds <= 0 || timer.running) return

    intervalRef.current = setInterval(() => {
      setTimer(s => {
        if (s.remainingSeconds <= 1) {
          clearInterval(intervalRef.current!)
          intervalRef.current = null
          return { ...s, running: false, remainingSeconds: 0 }
        }
        return { ...s, remainingSeconds: s.remainingSeconds - 1 }
      })
    }, 1000)

    setTimer(s => ({ ...s, running: true }))
  }, [timer.remainingSeconds, timer.running])

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setTimer(s => ({ ...s, running: false, remainingSeconds: s.totalSeconds }))
  }, [])

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setTimer({ running: false, totalSeconds: 0, remainingSeconds: 0, label: 'Timer' })
  }, [])

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const progress = timer.totalSeconds > 0
    ? 1 - timer.remainingSeconds / timer.totalSeconds
    : 0

  return { timer, start, pause, resume, reset, stop, formatTime, progress }
}