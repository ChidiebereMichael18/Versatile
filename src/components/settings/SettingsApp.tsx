import React, { useState, useEffect } from 'react'
import type { AppSettings } from '../../types'

const DEFAULT: AppSettings = {
  position: 'top-center', theme: 'dark', opacity: 1, alwaysOnTop: true,
  showOnAllWorkspaces: true, hotkey: 'CommandOrControl+Shift+I',
  musicFolder: '', notificationsEnabled: true, timerEnabled: true,
  customPosition: { x: -1, y: -1 }, islandSize: 'normal', accentColor: '#6c63ff',
}

const ACCENT_PRESETS = [
  '#6c63ff', '#ff6b9d', '#43e97b', '#f093fb', '#4facfe',
  '#fa709a', '#30cfd0', '#ff9f0a', '#ff3b30', '#34c759',
]

const TABS = ['Island', 'Music', 'Notifications', 'Timer', 'About']

export function SettingsApp() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT)
  const [activeTab, setActiveTab] = useState('Island')
  const [timerInput, setTimerInput] = useState({ m: 5, s: 0, label: 'Focus' })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!window.electronAPI) return
    window.electronAPI.getSettings().then(s => { if (s) setSettings(s) })
    const unsub = window.electronAPI.onFromIsland((payload: any) => {
      if (payload.type === 'settings-update') setSettings(payload.data)
    })
    return unsub
  }, [])

  const updateSetting = async (key: keyof AppSettings, value: unknown) => {
    const next = { ...settings, [key]: value }
    setSettings(next)
    if (window.electronAPI) {
      await window.electronAPI.setSetting(key, value)
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    }
  }

  const handlePickFolder = async () => {
    if (!window.electronAPI) return
    const folder = await window.electronAPI.pickMusicFolder()
    if (folder) updateSetting('musicFolder', folder)
  }

  const startTimer = () => {
    const seconds = timerInput.m * 60 + timerInput.s
    if (seconds <= 0) return
    window.electronAPI?.settingsToIsland({
      type: 'start-timer', seconds, label: timerInput.label,
    })
    window.electronAPI?.closeSettings()
  }

  const sendTestNotification = () => {
    window.electronAPI?.triggerNotification({
      icon: '🧪', app: 'Versatile', message: 'Test notification is working!',
      color: 'rgba(108,99,255,0.2)', duration: 3000,
    })
    window.electronAPI?.closeSettings()
  }

  return (
    <div
      className="w-full h-screen flex flex-col"
      style={{ background: '#0f0f13', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}
    >
      {/* Title bar */}
      <div
        className="flex items-center justify-between px-5 pt-4 pb-3"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-sm"
            style={{ background: settings.accentColor + '30', border: `1px solid ${settings.accentColor}40` }}
          >
            🏝
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white leading-none">Dynamic Island</h1>
            <p className="text-[10px] text-white/35 mt-0.5">Settings</p>
          </div>
        </div>
        <button
          onClick={() => window.electronAPI?.closeSettings()}
          className="w-7 h-7 rounded-full flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-5 overflow-x-auto pb-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0  transition-all ${
              activeTab === tab
                ? 'text-white'
                : 'text-white/40 hover:text-white/70'
            }`}
            style={activeTab === tab ? { background: settings.accentColor + '25', border: `1px solid ${settings.accentColor}40` } : {}}
          >
            {tab}
          </button>
        ))}
        {saved && (
          <span className="ml-auto text-xs text-green-400/70 flex items-center gap-1 animate-fade-in">
            ✓ Saved
          </span>
        )}
      </div>

      <div
        className="flex-1 overflow-y-auto px-5 pb-5"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* ── Island Tab ── */}
        {activeTab === 'Island' && (
          <div className="space-y-5">
            <Section title="Position">
              <div className="grid grid-cols-3 gap-2">
                {(['top-left', 'top-center', 'top-right'] as const).map(pos => (
                  <button
                    key={pos}
                    onClick={() => updateSetting('position', pos)}
                    className={`p-2.5 rounded-xl border text-xs transition-all ${
                      settings.position === pos
                        ? 'text-white border-transparent'
                        : 'text-white/40 border-white/10 hover:border-white/20'
                    }`}
                    style={settings.position === pos ? { background: settings.accentColor + '30', borderColor: settings.accentColor + '60' } : {}}
                  >
                    <div className="h-6 relative rounded-md border border-current/20 mb-1.5 bg-white/5">
                      <div
                        className="absolute top-0.5 h-1 rounded-full"
                        style={{
                          width: '30%',
                          left: pos === 'top-left' ? '4px' : pos === 'top-right' ? 'auto' : '50%',
                          right: pos === 'top-right' ? '4px' : undefined,
                          transform: pos === 'top-center' ? 'translateX(-50%)' : undefined,
                          background: settings.position === pos ? settings.accentColor : 'rgba(255,255,255,0.3)',
                        }}
                      />
                    </div>
                    <span className="capitalize">{pos.replace('top-', '')}</span>
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Size">
              <div className="grid grid-cols-3 gap-2">
                {(['compact', 'normal', 'large'] as const).map(size => (
                  <button
                    key={size}
                    onClick={() => updateSetting('islandSize', size)}
                    className={`p-2.5 rounded-xl border text-xs transition-all capitalize ${
                      settings.islandSize === size ? 'text-white' : 'text-white/40 border-white/10 hover:border-white/20'
                    }`}
                    style={settings.islandSize === size ? { background: settings.accentColor + '30', borderColor: settings.accentColor + '60' } : {}}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Accent Color">
              <div className="flex gap-2 flex-wrap">
                {ACCENT_PRESETS.map(color => (
                  <button
                    key={color}
                    onClick={() => updateSetting('accentColor', color)}
                    className="w-8 h-8 rounded-full transition-all hover:scale-110"
                    style={{
                      background: color,
                      boxShadow: settings.accentColor === color ? `0 0 0 2px #0f0f13, 0 0 0 4px ${color}` : 'none',
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={settings.accentColor}
                  onChange={e => updateSetting('accentColor', e.target.value)}
                  className="w-8 h-8 rounded-full cursor-pointer border-0 bg-transparent"
                  title="Custom color"
                />
              </div>
            </Section>

            <Section title="Opacity">
              <div className="flex items-center gap-3">
                <input
                  type="range" min="0.3" max="1" step="0.05"
                  value={settings.opacity}
                  onChange={e => updateSetting('opacity', Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-white/50 text-xs w-10 text-right font-mono">
                  {Math.round(settings.opacity * 100)}%
                </span>
              </div>
            </Section>

            <Section title="Behavior">
              <div className="space-y-3">
                <Toggle
                  label="Always on top"
                  description="Float above all other windows"
                  value={settings.alwaysOnTop}
                  onChange={v => updateSetting('alwaysOnTop', v)}
                  accent={settings.accentColor}
                />
                <Toggle
                  label="Show on all workspaces"
                  description="Visible across all desktops/spaces"
                  value={settings.showOnAllWorkspaces}
                  onChange={v => updateSetting('showOnAllWorkspaces', v)}
                  accent={settings.accentColor}
                />
              </div>
            </Section>

            <Section title="Global Shortcut">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                  <p className="text-white/70 text-xs font-mono">{settings.hotkey}</p>
                </div>
                <button
                  onClick={() => {
                    const hotkey = prompt('Enter new hotkey (e.g. CommandOrControl+Shift+I)')
                    if (hotkey) updateSetting('hotkey', hotkey)
                  }}
                  className="text-xs text-white/40 hover:text-white transition-colors px-3 py-2 rounded-lg border border-white/10 hover:border-white/20"
                >
                  Change
                </button>
              </div>
            </Section>
          </div>
        )}

        {/* ── Music Tab ── */}
        {activeTab === 'Music' && (
          <div className="space-y-5">
            <Section title="Music Folder">
              <div className="space-y-2">
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(255,255,255,0.4)">
                    <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                  </svg>
                  <p className="text-white/50 text-xs flex-1 truncate font-mono">
                    {settings.musicFolder || 'No folder selected'}
                  </p>
                </div>
                <button
                  onClick={handlePickFolder}
                  className="w-full py-2 rounded-xl text-xs font-medium transition-all text-white"
                  style={{ background: settings.accentColor + '25', border: `1px solid ${settings.accentColor}40` }}
                >
                  Choose Music Folder
                </button>
              </div>
            </Section>

            <Section title="Supported Formats">
              <div className="flex flex-wrap gap-1.5">
                {['MP3', 'FLAC', 'WAV', 'AAC', 'M4A', 'OGG', 'OPUS'].map(f => (
                  <span key={f} className="px-2 py-0.5 rounded-md bg-white/8 text-white/50 text-[10px] font-mono border border-white/10">
                    {f}
                  </span>
                ))}
              </div>
            </Section>
          </div>
        )}

        {/* ── Notifications Tab ── */}
        {activeTab === 'Notifications' && (
          <div className="space-y-5">
            <Section title="Notifications">
              <Toggle
                label="Enable notifications"
                description="Show system notifications in the island"
                value={settings.notificationsEnabled}
                onChange={v => updateSetting('notificationsEnabled', v)}
                accent={settings.accentColor}
              />
            </Section>
            {settings.notificationsEnabled && (
              <Section title="Test">
                <button
                  onClick={sendTestNotification}
                  className="w-full py-2 rounded-xl text-xs font-medium text-white transition-all"
                  style={{ background: settings.accentColor + '25', border: `1px solid ${settings.accentColor}40` }}
                >
                  Send Test Notification
                </button>
              </Section>
            )}
          </div>
        )}

        {/* ── Timer Tab ── */}
        {activeTab === 'Timer' && (
          <div className="space-y-5">
            <Section title="Quick Start Timer">
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="text-[10px] text-white/35 uppercase tracking-wider block mb-1">Label</label>
                  <input
                    type="text"
                    value={timerInput.label}
                    onChange={e => setTimerInput(s => ({ ...s, label: e.target.value }))}
                    placeholder="Focus, Break, Cook..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/70 text-xs outline-none focus:border-white/20"
                  />
                </div>
                <div className="w-20">
                  <label className="text-[10px] text-white/35 uppercase tracking-wider block mb-1">Minutes</label>
                  <input
                    type="number" min="0" max="99"
                    value={timerInput.m}
                    onChange={e => setTimerInput(s => ({ ...s, m: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/70 text-xs outline-none focus:border-white/20 text-center"
                  />
                </div>
                <div className="w-20">
                  <label className="text-[10px] text-white/35 uppercase tracking-wider block mb-1">Seconds</label>
                  <input
                    type="number" min="0" max="59"
                    value={timerInput.s}
                    onChange={e => setTimerInput(s => ({ ...s, s: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/70 text-xs outline-none focus:border-white/20 text-center"
                  />
                </div>
              </div>
              <button
                onClick={startTimer}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white mt-3 transition-all hover:brightness-110"
                style={{ background: settings.accentColor }}
              >
                Start Timer
              </button>
            </Section>

            <Section title="Presets">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Pomodoro', m: 25, s: 0 },
                  { label: 'Short Break', m: 5, s: 0 },
                  { label: 'Long Break', m: 15, s: 0 },
                  { label: 'Workout', m: 1, s: 30 },
                  { label: 'Quick', m: 0, s: 30 },
                  { label: 'Hour', m: 60, s: 0 },
                ].map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => setTimerInput(preset)}
                    className="py-2 px-3 rounded-xl border border-white/10 hover:border-white/20 text-xs text-white/50 hover:text-white transition-all text-left"
                  >
                    <div className="font-medium text-white/70">{preset.label}</div>
                    <div className="text-white/35 text-[10px] font-mono mt-0.5">
                      {preset.m}:{String(preset.s).padStart(2, '0')}
                    </div>
                  </button>
                ))}
              </div>
            </Section>
          </div>
        )}

        {/* ── About Tab ── */}
        {activeTab === 'About' && (
          <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{ background: settings.accentColor + '20', border: `1px solid ${settings.accentColor}30` }}
            >
              🏝
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Versatile</h2>
              <p className="text-white/40 text-xs mt-1">Version 1.0.0</p>
            </div>
            <p className="text-white/35 text-xs max-w-xs leading-relaxed">
              A living, breathing Dynamic Island for your laptop.
              Plays music, shows notifications, runs timers — all in a pill at the top of your screen.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[10px] text-white/35 uppercase tracking-widest font-medium mb-2.5 ml-0.5">{title}</h3>
      <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-3.5">
        {children}
      </div>
    </div>
  )
}

function Toggle({
  label, description, value, onChange, accent,
}: {
  label: string; description?: string; value: boolean; onChange: (v: boolean) => void; accent: string
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1">
        <p className="text-white/75 text-sm">{label}</p>
        {description && <p className="text-white/35 text-xs mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className="w-10 h-6 rounded-full transition-all flex-shrink-0 relative"
        style={{ background: value ? accent : 'rgba(255,255,255,0.1)' }}
      >
        <div
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all"
          style={{ left: value ? '18px' : '2px' }}
        />
      </button>
    </div>
  )
}