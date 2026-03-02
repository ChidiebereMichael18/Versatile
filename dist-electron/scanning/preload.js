"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Type-safe API exposed to renderer
const api = {
    // Settings
    getSettings: () => electron_1.ipcRenderer.invoke('get-settings'),
    setSetting: (key, value) => electron_1.ipcRenderer.invoke('set-setting', key, value),
    // File ops
    pickMusicFolder: () => electron_1.ipcRenderer.invoke('pick-music-folder'),
    pickMusicFiles: () => electron_1.ipcRenderer.invoke('pick-music-files'),
    scanMusic: (folder) => electron_1.ipcRenderer.invoke('scan-music', folder),
    getTrackMeta: (filePath) => electron_1.ipcRenderer.invoke('get-track-meta', filePath),
    getFileUrl: (filePath) => electron_1.ipcRenderer.invoke('get-file-url', filePath),
    getHomeDir: () => electron_1.ipcRenderer.invoke('get-home-dir'),
    // Window
    openSettings: () => electron_1.ipcRenderer.invoke('open-settings'),
    closeSettings: () => electron_1.ipcRenderer.invoke('close-settings'),
    // Cross-window comms
    islandToSettings: (payload) => electron_1.ipcRenderer.invoke('island-to-settings', payload),
    settingsToIsland: (payload) => electron_1.ipcRenderer.invoke('settings-to-island', payload),
    triggerNotification: (payload) => electron_1.ipcRenderer.invoke('trigger-notification', payload),
    // Listeners
    onSettingsChanged: (cb) => {
        electron_1.ipcRenderer.on('settings-changed', (_e, data) => cb(data));
        return () => electron_1.ipcRenderer.removeAllListeners('settings-changed');
    },
    onShowNotification: (cb) => {
        electron_1.ipcRenderer.on('show-notification', (_e, data) => cb(data));
        return () => electron_1.ipcRenderer.removeAllListeners('show-notification');
    },
    onFromSettings: (cb) => {
        electron_1.ipcRenderer.on('from-settings', (_e, data) => cb(data));
        return () => electron_1.ipcRenderer.removeAllListeners('from-settings');
    },
    onFromIsland: (cb) => {
        electron_1.ipcRenderer.on('from-island', (_e, data) => cb(data));
        return () => electron_1.ipcRenderer.removeAllListeners('from-island');
    },
};
electron_1.contextBridge.exposeInMainWorld('electronAPI', api);
