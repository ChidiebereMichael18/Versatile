import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { IslandApp } from './components/island/IslandApp'
import { SettingsApp } from './components/settings/SettingsApp'

// Route based on URL hash — Electron loads with #island or #settings
function App() {
  const hash = window.location.hash

  if (hash === '#settings') {
    return <SettingsApp />
  }

  return <IslandApp />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)