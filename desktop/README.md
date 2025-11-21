# BPO Tracker Desktop Application

Windows desktop application for BPO Tracker with local-first storage and automatic cloud sync.

## Features

- **Windows Executable**: Standalone desktop application
- **Keyboard Shortcuts**:
  - `Ctrl+Shift+C`: Open case entry drawer
  - `E`: Close current case (when drawer is focused)
  - Shortcuts are customizable in settings
- **Floating Drawer**: Movable, resizable case entry window that starts center-top
- **Local-First Storage**: 
  - Uses SQLite for local data storage
  - Saves to OneDrive if available, falls back to local AppData
  - Works offline, syncs when connection is available
- **Automatic Sync**: Periodically syncs with PostgreSQL server (every 5 minutes)
- **System Tray**: Runs in background, accessible from system tray
- **Fallback Web Access**: Web application remains available if desktop app crashes

## Technology Stack

- **Electron**: Desktop framework
- **SQLite (sql.js)**: Local database
- **React**: UI (reuses existing frontend components)
- **TypeScript**: Type-safe development
- **electron-store**: Settings persistence
- **electron-builder**: Windows installer generation

## Installation

### From Source

1. Navigate to desktop directory:
```bash
cd desktop
```

2. Install dependencies:
```bash
npm install
```

3. Run in development mode:
```bash
npm run dev
```

### Build Windows Installer

```bash
npm run package:win
```

The installer will be created in `desktop/release/` directory.

## Configuration

### Storage Location

By default, data is stored in:
- **Primary**: `%OneDrive%\BPOTracker\bpo-tracker.db` (if OneDrive is available)
- **Fallback**: `%AppData%\bpo-tracker-desktop\data\bpo-tracker.db`

### Server Connection

Configure server URL and authentication in the app settings:
- Server URL: Default `http://localhost:3000/api`
- Auth Token: Obtained from web app login

### Keyboard Shortcuts

Customize shortcuts in Settings:
- Default start case: `Ctrl+Shift+C`
- Default close case: `E`

## Usage

### First Time Setup

1. Launch the application
2. Log in using web credentials
3. The app will download existing data from server
4. Start working offline

### Case Management

#### Start a Case (Ctrl+Shift+C):
1. Press `Ctrl+Shift+C` to open drawer
2. Enter case number, customer name, case type
3. Click "Start Case"

#### Close a Case (E):
1. With drawer focused and active case displayed
2. Press `E` to close current case
3. Or click "Close Case" button

#### Copy Case ID:
- Click 📋 button next to case number in drawer

### Sync Status

- View sync status in system tray tooltip
- Manual sync: Right-click tray icon > Sync Now
- Auto-sync runs every 5 minutes

### System Tray

Right-click tray icon for options:
- **Show App**: Open main window
- **Show Drawer**: Open floating case drawer
- **Quit**: Exit application

## Architecture

### Local Database (SQLite)

Tables mirror the PostgreSQL schema:
- `users` - User accounts
- `attendance` - Attendance records
- `cases` - Customer cases
- `case_history` - Case audit trail
- `sync_queue` - Pending sync operations

Each table has:
- `server_id`: ID from PostgreSQL server
- `synced`: 0 = needs sync, 1 = synced

### Sync Strategy

1. **Local-First**: All operations write to local SQLite first
2. **Queue**: Unsynced records are queued for sync
3. **Periodic Sync**: Every 5 minutes, sync unsynced records to server
4. **Conflict Resolution**: Server timestamp wins in case of conflicts
5. **Retry Logic**: Failed syncs are retried on next cycle

### IPC Architecture

```
Main Process (Electron)
├── DatabaseManager (SQLite operations)
├── SyncManager (Server sync)
└── IPC Handlers (Communication with renderer)

Renderer Process (React)
├── Main Window (Full app UI)
└── Drawer Window (Floating case entry)

Communication via contextBridge (secure)
```

## File Structure

```
desktop/
├── src/
│   ├── main/
│   │   ├── main.ts          # Electron main process
│   │   ├── database.ts      # SQLite database manager
│   │   └── sync.ts          # Sync manager
│   ├── preload/
│   │   └── preload.ts       # IPC bridge (secure)
│   └── renderer/
│       └── components/
│           ├── CaseDrawer.tsx
│           └── CaseDrawer.css
├── assets/
│   ├── icon.ico             # Windows icon
│   └── tray-icon.png        # System tray icon
├── package.json
└── tsconfig.main.json
```

## Development

### Running in Development

Terminal 1 - Main process:
```bash
npm run dev:main
```

Terminal 2 - Renderer (Vite):
```bash
npm run dev:renderer
```

Or both together:
```bash
npm run dev
```

### Building for Production

```bash
npm run build        # Build TypeScript
npm run package:win  # Create Windows installer
```

### Debugging

- Main process: Check console output
- Renderer process: Open DevTools with Ctrl+Shift+I
- SQLite data: Use DB Browser for SQLite to inspect `bpo-tracker.db`

## Troubleshooting

### App won't start
- Check if another instance is running (single instance enforced)
- Delete `%AppData%\bpo-tracker-desktop` and restart

### Sync not working
- Verify server URL in settings
- Check auth token is valid
- Ensure network connectivity
- Check sync status in tray tooltip

### Database locked
- Close all instances of the app
- SQLite uses WAL mode for better concurrency

### OneDrive not detected
- Check environment variables: `%OneDrive%` or `%OneDriveConsumer%`
- App will fall back to local AppData automatically

## Security

- Local database is stored unencrypted (Windows file system encryption recommended)
- Auth tokens stored in electron-store (encrypted by OS)
- IPC uses contextBridge for secure communication
- Server communication over HTTPS in production

## Updates

Auto-updates using electron-updater:
- Checks for updates on launch
- Downloads in background
- Prompts user to restart when ready

## Performance

- SQLite WAL mode for concurrent access
- Indexed queries for fast lookups
- Batch sync operations (50 records per sync)
- Minimal memory footprint (~100MB)

## Limitations

- Windows only (can be extended to macOS/Linux)
- Requires .NET Framework 4.5+ (usually pre-installed)
- OneDrive detection limited to standard installations

## Future Enhancements

- Offline conflict resolution UI
- Customizable sync intervals
- Data export/import tools
- Advanced keyboard shortcuts
- Multi-language support
