"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const media_watcher_1 = require("./media-watcher.cjs");
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const electron_store_1 = __importDefault(require("electron-store"));
const { parseFile } = require('music-metadata');
// ─── Store ──────────────────────────────────────────────────────────────────
const store = new electron_store_1.default({
    defaults: {
        position: 'top-center',
        theme: 'dark',
        opacity: 1.0,
        alwaysOnTop: true,
        showOnAllWorkspaces: true,
        hotkey: 'CommandOrControl+Shift+I',
        musicFolder: '',
        notificationsEnabled: true,
        timerEnabled: true,
        customPosition: { x: -1, y: -1 },
        islandSize: 'normal', // normal | compact | large
        accentColor: '#6c63ff',
    },
});
// ─── Globals ─────────────────────────────────────────────────────────────────
let islandWin = null;
let settingsWin = null;
let tray = null;
let currentHotkey = store.get('hotkey');
let isVisible = true;
const isDev = process.env.NODE_ENV === 'development' || !electron_1.app.isPackaged;
const RENDERER_URL = 'http://localhost:5173';
// ─── Get island position ──────────────────────────────────────────────────────
function getIslandBounds() {
    const display = electron_1.screen.getPrimaryDisplay();
    const { width: sw } = display.workAreaSize;
    const pos = store.get('position');
    const size = store.get('islandSize');
    const customPos = store.get('customPosition');
    const islandWidth = size === 'compact' ? 160 : size === 'large' ? 500 : 380;
    const islandHeight = size === 'large' ? 120 : 100;
    const winWidth = 560;
    const winHeight = 200;
    const yOffset = 8;
    if (pos === 'custom' && customPos.x >= 0) {
        return { x: customPos.x, y: customPos.y, width: winWidth, height: winHeight };
    }
    let x = 0;
    if (pos === 'top-left')
        x = 20;
    else if (pos === 'top-right')
        x = sw - winWidth - 20;
    else
        x = Math.floor(sw / 2 - winWidth / 2); // center
    return { x, y: yOffset, width: winWidth, height: winHeight };
}
// ─── Create island window ────────────────────────────────────────────────────
function createIslandWindow() {
    const bounds = getIslandBounds();
    islandWin = new electron_1.BrowserWindow({
        ...bounds,
        frame: false,
        transparent: true,
        hasShadow: false,
        resizable: false,
        movable: true,
        alwaysOnTop: store.get('alwaysOnTop'),
        skipTaskbar: true,
        focusable: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        // macOS: float above fullscreen apps
        type: process.platform === 'darwin' ? 'panel' : 'toolbar',
    });
    if (store.get('showOnAllWorkspaces')) {
        islandWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    }
    if (isDev) {
        islandWin.loadURL(RENDERER_URL + '/#island');
    }
    else {
        islandWin.loadFile(path.join(__dirname, '../dist/index.html'), {
            hash: 'island',
        });
    }
    // Set level so it floats above everything
    if (process.platform === 'darwin') {
        islandWin.setAlwaysOnTop(true, 'floating', 1);
        islandWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    }
    else {
        islandWin.setAlwaysOnTop(true, 'screen-saver');
    }
    islandWin.setIgnoreMouseEvents(false);
    islandWin.on('closed', () => {
        islandWin = null;
    });
    islandWin.on('moved', () => {
        if (islandWin) {
            const [x, y] = islandWin.getPosition();
            store.set('customPosition', { x, y });
            store.set('position', 'custom');
        }
    });
}
// ─── Create settings window ──────────────────────────────────────────────────
function createSettingsWindow() {
    if (settingsWin) {
        settingsWin.focus();
        return;
    }
    const display = electron_1.screen.getPrimaryDisplay();
    const { width: sw, height: sh } = display.workAreaSize;
    settingsWin = new electron_1.BrowserWindow({
        width: 720,
        height: 580,
        x: Math.floor(sw / 2 - 360),
        y: Math.floor(sh / 2 - 290),
        frame: false,
        transparent: false,
        resizable: false,
        alwaysOnTop: false,
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#0f0f13',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    if (isDev) {
        settingsWin.loadURL(RENDERER_URL + '/#settings');
        settingsWin.webContents.openDevTools({ mode: 'detach' });
    }
    else {
        settingsWin.loadFile(path.join(__dirname, '../dist/index.html'), {
            hash: 'settings',
        });
    }
    settingsWin.on('closed', () => {
        settingsWin = null;
    });
}
// ─── Tray ────────────────────────────────────────────────────────────────────
function createTray() {
    const icon = electron_1.nativeImage.createEmpty();
    tray = new electron_1.Tray(icon);
    const updateMenu = () => {
        const contextMenu = electron_1.Menu.buildFromTemplate([
            {
                label: '🏝  Dynamic Island',
                enabled: false,
            },
            { type: 'separator' },
            {
                label: isVisible ? 'Hide Island' : 'Show Island',
                click: () => {
                    if (islandWin) {
                        if (isVisible) {
                            islandWin.hide();
                            isVisible = false;
                        }
                        else {
                            islandWin.show();
                            isVisible = true;
                        }
                        updateMenu();
                    }
                },
            },
            {
                label: 'Settings...',
                accelerator: 'CommandOrControl+,',
                click: () => createSettingsWindow(),
            },
            { type: 'separator' },
            {
                label: 'Reset Position',
                click: () => {
                    store.set('position', 'top-center');
                    store.set('customPosition', { x: -1, y: -1 });
                    if (islandWin) {
                        const bounds = getIslandBounds();
                        islandWin.setBounds(bounds, true);
                    }
                },
            },
            { type: 'separator' },
            {
                label: 'Quit Dynamic Island',
                accelerator: 'CommandOrControl+Q',
                click: () => electron_1.app.quit(),
            },
        ]);
        tray.setContextMenu(contextMenu);
    };
    updateMenu();
    tray.setToolTip('Dynamic Island');
    tray.on('click', () => {
        if (islandWin) {
            if (isVisible)
                islandWin.focus();
            else {
                islandWin.show();
                isVisible = true;
            }
        }
    });
}
// ─── Register global hotkey ──────────────────────────────────────────────────
function registerHotkey(hotkey) {
    try {
        electron_1.globalShortcut.unregisterAll();
        electron_1.globalShortcut.register(hotkey, () => {
            if (islandWin) {
                if (isVisible) {
                    islandWin.hide();
                    isVisible = false;
                }
                else {
                    islandWin.show();
                    isVisible = true;
                }
            }
        });
        currentHotkey = hotkey;
        store.set('hotkey', hotkey);
    }
    catch (e) {
        console.error('Failed to register hotkey:', e);
    }
}
// ─── IPC Handlers ────────────────────────────────────────────────────────────
function setupIPC() {
    // Settings: get all
    electron_1.ipcMain.handle('get-settings', () => store.store);
    electron_1.ipcMain.handle('get-system-media', async () => {
        // returns current snapshot on demand
    });
    // Settings: set one key
    electron_1.ipcMain.handle('set-setting', (_e, key, value) => {
        store.set(key, value);
        // React to certain settings immediately
        if (key === 'alwaysOnTop' && islandWin) {
            islandWin.setAlwaysOnTop(value, process.platform === 'darwin' ? 'floating' : 'screen-saver');
        }
        if (key === 'position' || key === 'islandSize') {
            if (islandWin) {
                const bounds = getIslandBounds();
                islandWin.setBounds(bounds, true);
            }
        }
        if (key === 'hotkey') {
            registerHotkey(value);
        }
        if (key === 'showOnAllWorkspaces' && islandWin) {
            islandWin.setVisibleOnAllWorkspaces(value, { visibleOnFullScreen: true });
        }
        // Notify island window of settings change
        if (islandWin && !islandWin.isDestroyed()) {
            islandWin.webContents.send('settings-changed', store.store);
        }
        return true;
    });
    // Open folder picker for music
    electron_1.ipcMain.handle('pick-music-folder', async () => {
        const result = await electron_1.dialog.showOpenDialog({
            properties: ['openDirectory'],
            title: 'Select Music Folder',
        });
        if (!result.canceled && result.filePaths[0]) {
            store.set('musicFolder', result.filePaths[0]);
            return result.filePaths[0];
        }
        return null;
    });
    // Open individual music files
    electron_1.ipcMain.handle('pick-music-files', async () => {
        const result = await electron_1.dialog.showOpenDialog({
            properties: ['openFile', 'multiSelections'],
            title: 'Add Music Files',
            filters: [
                { name: 'Audio', extensions: ['mp3', 'flac', 'wav', 'aac', 'm4a', 'ogg', 'opus'] },
            ],
        });
        if (!result.canceled) {
            return result.filePaths;
        }
        return [];
    });
    // Scan music folder and return track metadata
    electron_1.ipcMain.handle('scan-music', async (_e, folderPath) => {
        const tracks = [];
        const validExt = ['.mp3', '.flac', '.wav', '.aac', '.m4a', '.ogg', '.opus'];
        const scanDir = (dir) => {
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    if (entry.isDirectory()) {
                        scanDir(fullPath);
                    }
                    else if (validExt.includes(path.extname(entry.name).toLowerCase())) {
                        tracks.push(fullPath);
                    }
                }
            }
            catch { }
        };
        scanDir(folderPath);
        // Parse metadata for each track (limit to first 200 for speed)
        const limited = tracks.slice(0, 200);
        const results = await Promise.allSettled(limited.map(async (filePath) => {
            try {
                const meta = await parseFile(filePath, { duration: true });
                return {
                    path: filePath,
                    title: meta.common.title || path.basename(filePath, path.extname(filePath)),
                    artist: meta.common.artist || 'Unknown Artist',
                    album: meta.common.album || 'Unknown Album',
                    duration: meta.format.duration || 0,
                    picture: meta.common.picture?.[0]
                        ? {
                            data: Buffer.from(meta.common.picture[0].data).toString('base64'),
                            format: meta.common.picture[0].format,
                        }
                        : null,
                };
            }
            catch {
                return {
                    path: filePath,
                    title: path.basename(filePath, path.extname(filePath)),
                    artist: 'Unknown Artist',
                    album: 'Unknown Album',
                    duration: 0,
                    picture: null,
                };
            }
        }));
        return results
            .filter((r) => r.status === 'fulfilled')
            .map((r) => r.value);
    });
    // Read single file metadata
    electron_1.ipcMain.handle('get-track-meta', async (_e, filePath) => {
        try {
            const meta = await parseFile(filePath, { duration: true });
            return {
                path: filePath,
                title: meta.common.title || path.basename(filePath, path.extname(filePath)),
                artist: meta.common.artist || 'Unknown Artist',
                album: meta.common.album || 'Unknown Album',
                duration: meta.format.duration || 0,
                picture: meta.common.picture?.[0]
                    ? {
                        data: Buffer.from(meta.common.picture[0].data).toString('base64'),
                        format: meta.common.picture[0].format,
                    }
                    : null,
            };
        }
        catch {
            return null;
        }
    });
    // Open settings window from island
    electron_1.ipcMain.handle('open-settings', () => {
        createSettingsWindow();
    });
    // Close settings window
    electron_1.ipcMain.handle('close-settings', () => {
        settingsWin?.close();
    });
    // Cross-window messaging: island ↔ settings
    electron_1.ipcMain.handle('island-to-settings', (_e, payload) => {
        settingsWin?.webContents.send('from-island', payload);
    });
    electron_1.ipcMain.handle('settings-to-island', (_e, payload) => {
        islandWin?.webContents.send('from-settings', payload);
    });
    // Convert file path to safe URL for audio
    electron_1.ipcMain.handle('get-file-url', (_e, filePath) => {
        return `file://${filePath.replace(/\\/g, '/')}`;
    });
    // Get home directory for default paths
    electron_1.ipcMain.handle('get-home-dir', () => os.homedir());
    // Notify island from system events
    electron_1.ipcMain.handle('trigger-notification', (_e, payload) => {
        islandWin?.webContents.send('show-notification', payload);
    });
    // Window dragging
    electron_1.ipcMain.on('start-drag', (_e, { mouseX, mouseY }) => {
        if (!islandWin)
            return;
        const [winX, winY] = islandWin.getPosition();
        const startX = winX;
        const startY = winY;
        const onMouseMove = (e, data) => {
            islandWin?.setPosition(startX + data.x - mouseX, startY + data.y - mouseY);
        };
        electron_1.ipcMain.once('end-drag', () => { });
    });
}
// ─── App lifecycle ────────────────────────────────────────────────────────────
electron_1.app.whenReady().then(() => {
    createIslandWindow();
    (0, media_watcher_1.startMediaWatcher)(islandWin);
    createTray();
    setupIPC();
    registerHotkey(currentHotkey);
    electron_1.app.on('activate', () => {
        if (!islandWin)
            createIslandWindow();
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
electron_1.app.on('will-quit', () => {
    electron_1.globalShortcut.unregisterAll();
    (0, media_watcher_1.stopMediaWatcher)();
});
