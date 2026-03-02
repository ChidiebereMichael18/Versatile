import { exec } from 'child_process'
import { BrowserWindow } from 'electron'

// PowerShell script that reads Windows Media Session
const PS_SCRIPT = `
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' })[0]

Function Await($WinRtTask, $ResultType) {
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtTask))
    $netTask.Wait(-1) | Out-Null
    $netTask.Result
}

[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime] | Out-Null
$sessions = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
$currentSession = $sessions.GetCurrentSession()
if ($currentSession -eq $null) { Write-Output '{}'; exit }

$mediaProperties = Await ($currentSession.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
$playbackInfo = $currentSession.GetPlaybackInfo()

$status = @{
    title = $mediaProperties.Title
    artist = $mediaProperties.Artist
    album = $mediaProperties.AlbumTitle
    playing = ($playbackInfo.PlaybackStatus -eq [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionPlaybackStatus]::Playing)
    appId = $currentSession.SourceAppUserModelId
} | ConvertTo-Json
Write-Output $status
`

export interface MediaInfo {
  title: string
  artist: string
  album: string
  playing: boolean
  appId: string
}

let pollInterval: NodeJS.Timeout | null = null
let lastTitle = ''

export function startMediaWatcher(islandWin: BrowserWindow) {
  if (pollInterval) return

  const poll = () => {
    exec(
      `powershell -NoProfile -NonInteractive -Command "${PS_SCRIPT.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`,
      { timeout: 3000 },
      (err, stdout) => {
        if (err || !stdout.trim()) return
        try {
          const info: MediaInfo = JSON.parse(stdout.trim())
          // Only send update if something changed
          if (info.title !== lastTitle) {
            lastTitle = info.title
            if (!islandWin.isDestroyed()) {
              islandWin.webContents.send('system-media-update', info)
            }
          }
        } catch {}
      }
    )
  }

  poll() // immediate first poll
  pollInterval = setInterval(poll, 2000) // poll every 2 seconds
}

export function stopMediaWatcher() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}