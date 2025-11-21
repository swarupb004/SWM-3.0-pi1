import { app, BrowserWindow, globalShortcut, ipcMain, Menu, Tray } from 'electron';
import * as path from 'path';
import { DatabaseManager } from './database';
import { SyncManager } from './sync';
import Store from 'electron-store';

interface StoreSchema {
  shortcuts?: {
    startCase?: string;
    closeCase?: string;
  };
  [key: string]: any;
}

const store = new Store<StoreSchema>();
let mainWindow: BrowserWindow | null = null;
let drawerWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let dbManager: DatabaseManager;
let syncManager: SyncManager;
let isQuitting = false;

// Get OneDrive path or fallback to local AppData
function getStoragePath(): string {
  const oneDrivePath = process.env.OneDrive || process.env.OneDriveConsumer;
  if (oneDrivePath) {
    return path.join(oneDrivePath, 'BPOTracker');
  }
  return path.join(app.getPath('userData'), 'data');
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.js')
    },
    icon: path.join(__dirname, '../../assets/icon.ico')
  });

  // In development, load from Vite dev server
  // In production, load from built files
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
}

function createDrawerWindow() {
  drawerWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    resizable: true,
    movable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.js')
    }
  });

  // Position at center-top
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workAreaSize;
  drawerWindow.setPosition(Math.floor((width - 400) / 2), 50);

  if (process.env.NODE_ENV === 'development') {
    drawerWindow.loadURL('http://localhost:5173/#/drawer');
  } else {
    drawerWindow.loadFile(path.join(__dirname, '../renderer/index.html'), {
      hash: '/drawer'
    });
  }

  drawerWindow.on('closed', () => {
    drawerWindow = null;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '../../assets/tray-icon.png');
  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        mainWindow?.show();
      }
    },
    {
      label: 'Show Drawer',
      click: () => {
        if (!drawerWindow) {
          createDrawerWindow();
        } else {
          drawerWindow.show();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('BPO Tracker');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    mainWindow?.isVisible() ? mainWindow.hide() : mainWindow?.show();
  });
}

function registerGlobalShortcuts() {
  // Get shortcuts from settings or use defaults
  const startCaseShortcut = store.get('shortcuts.startCase', 'CommandOrControl+Shift+C') as string;
  const closeCaseShortcut = store.get('shortcuts.closeCase', 'E') as string;

  // Register start case shortcut
  globalShortcut.register(startCaseShortcut, () => {
    if (!drawerWindow) {
      createDrawerWindow();
    } else {
      drawerWindow.show();
      drawerWindow.focus();
    }
  });

  // Register close case shortcut (when drawer is focused)
  globalShortcut.register(closeCaseShortcut, () => {
    if (drawerWindow && drawerWindow.isFocused()) {
      drawerWindow.webContents.send('close-case');
    }
  });

  console.log('Global shortcuts registered:', {
    startCase: startCaseShortcut,
    closeCase: closeCaseShortcut
  });
}

app.on('ready', async () => {
  // Initialize database
  const storagePath = getStoragePath();
  dbManager = new DatabaseManager(storagePath);
  await dbManager.initialize();

  // Initialize sync manager
  syncManager = new SyncManager(dbManager);
  syncManager.startPeriodicSync(5 * 60 * 1000); // Sync every 5 minutes

  createMainWindow();
  createTray();
  registerGlobalShortcuts();

  // Handle IPC messages
  setupIpcHandlers();
});

app.on('window-all-closed', () => {
  // Don't quit on window close, keep running in tray
  // Only quit when explicitly requested
});

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  syncManager.stopPeriodicSync();
});

function setupIpcHandlers() {
  // Database operations
  ipcMain.handle('db:query', async (event, sql, params) => {
    return dbManager.query(sql, params);
  });

  ipcMain.handle('db:execute', async (event, sql, params) => {
    return dbManager.execute(sql, params);
  });

  // Case operations
  ipcMain.handle('case:create', async (event, caseData) => {
    const result = await dbManager.createCase(caseData);
    syncManager.queueSync('case', result.id);
    return result;
  });

  ipcMain.handle('case:update', async (event, id, caseData) => {
    const result = await dbManager.updateCase(id, caseData);
    syncManager.queueSync('case', id);
    return result;
  });

  ipcMain.handle('case:close', async (event, id) => {
    const result = await dbManager.closeCase(id);
    syncManager.queueSync('case', id);
    return result;
  });

  ipcMain.handle('case:getCurrent', async () => {
    return dbManager.getCurrentCase();
  });

  // Attendance operations
  ipcMain.handle('attendance:checkIn', async () => {
    const result = await dbManager.checkIn();
    syncManager.queueSync('attendance', result.id);
    return result;
  });

  ipcMain.handle('attendance:checkOut', async () => {
    const result = await dbManager.checkOut();
    syncManager.queueSync('attendance', result.id);
    return result;
  });

  // Sync operations
  ipcMain.handle('sync:now', async () => {
    return syncManager.syncNow();
  });

  ipcMain.handle('sync:status', async () => {
    return syncManager.getStatus();
  });

  // Settings
  ipcMain.handle('settings:get', async (event, key) => {
    return store.get(key);
  });

  ipcMain.handle('settings:set', async (event, key, value) => {
    store.set(key, value);
    
    // Re-register shortcuts if they were changed
    if (key.startsWith('shortcuts.')) {
      globalShortcut.unregisterAll();
      registerGlobalShortcuts();
    }
    
    return true;
  });

  // Copy to clipboard
  ipcMain.handle('clipboard:write', async (event, text) => {
    const { clipboard } = require('electron');
    clipboard.writeText(text);
    return true;
  });

  // Window operations
  ipcMain.handle('window:minimize', () => {
    if (drawerWindow) drawerWindow.minimize();
  });

  ipcMain.handle('window:close', () => {
    if (drawerWindow) drawerWindow.close();
  });

  ipcMain.handle('window:toggleDrawer', () => {
    if (!drawerWindow) {
      createDrawerWindow();
    } else if (drawerWindow.isVisible()) {
      drawerWindow.hide();
    } else {
      drawerWindow.show();
    }
  });
}

// Make app a single instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
