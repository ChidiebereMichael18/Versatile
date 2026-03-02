export function formatTime(secs: number): string {
  if (!secs || isNaN(secs)) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.floor(secs % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val))
}

export function trackArtUrl(picture: { data: string; format: string } | null): string | null {
  if (!picture) return null
  return `data:${picture.format};base64,${picture.data}`
}

export function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Nice color from string (for notification icons without art)
export function colorFromString(str: string): string {
  const colors = [
    '#6c63ff', '#ff6b9d', '#43e97b', '#f093fb',
    '#4facfe', '#fa709a', '#30cfd0', '#a18cd1',
  ]
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + (hash << 5) - hash
  return colors[Math.abs(hash) % colors.length]
}