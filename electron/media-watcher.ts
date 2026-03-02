import { exec } from 'child_process'
import { BrowserWindow } from 'electron'

export interface MediaInfo {
  title: string
  artist: string
  album: string
  playing: boolean
  appId: string
}

const PS_SCRIPT = `
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' })[0]
function Await($op, $type) {
  $m = $asTask.MakeGenericMethod($type)
  $t = $m.Invoke($null, @($op))
  $t.Wait(-1) | Out-Null
  return $t.Result
}
[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime] | Out-Null
$mgr = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
$session = $mgr.GetCurrentSession()
if ($session -eq $null) { Write-Output 'NOMEDIA'; exit }
$props = Await ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
$pb = $session.GetPlaybackInfo()
$isPlaying = ($pb.PlaybackStatus -eq [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionPlaybackStatus]::Playing)
$result = @{
  title = if ($props.Title) { $props.Title } else { '' }
  artist = if ($props.Artist) { $props.Artist } else { '' }
  album = if ($props.AlbumTitle) { $props.AlbumTitle } else { '' }
  playing = $isPlaying
  appId = if ($session.SourceAppUserModelId) { $session.SourceAppUserModelId } else { '' }
}
$result | ConvertTo-Json -Compress
`

let pollInterval: NodeJS.Timeout | null = null
let lastTitle = ''
let lastPlaying = false

export function startMediaWatcher(islandWin: BrowserWindow) {
  if (pollInterval) return

  const poll = () => {
    exec(
      `powershell -NoProfile -NonInteractive -WindowStyle Hidden -Command "${PS_SCRIPT.replace(/\r?\n/g, ' ').replace(/"/g, '\\"')}"`,
      { timeout: 5000 },
      (_err, stdout) => {
        const out = (stdout || '').trim()

        if (!out || out === 'NOMEDIA' || out === '{}') {
          if (lastTitle !== '') {
            lastTitle = ''
            lastPlaying = false
            if (!islandWin.isDestroyed()) {
              islandWin.webContents.send('system-media-update', {
                title: '', artist: '', album: '', playing: false, appId: '',
              })
            }
          }
          return
        }

        try {
          const info: MediaInfo = JSON.parse(out)
          if (info.title !== lastTitle || info.playing !== lastPlaying) {
            lastTitle = info.title || ''
            lastPlaying = !!info.playing
            if (!islandWin.isDestroyed()) {
              islandWin.webContents.send('system-media-update', info)
            }
          }
        } catch {}
      }
    )
  }

  poll()
  pollInterval = setInterval(poll, 2000)
}

export function stopMediaWatcher() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}