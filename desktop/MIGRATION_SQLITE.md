# Migration from better-sqlite3 to sql.js

## Overview

This document describes the migration from better-sqlite3 to sql.js for the BPO Tracker Desktop application.

## Problem Statement

The original implementation used better-sqlite3, which requires native compilation using node-gyp. This caused installation failures on Windows with Node.js 22.17.0 due to:
- Visual Studio 2024 Community not being properly detected by node-gyp
- Requirement for specific build tools and configurations
- Platform-specific compilation issues

## Solution

Replaced better-sqlite3 with sql.js, a pure JavaScript/WebAssembly implementation of SQLite that:
- Requires no native compilation
- Works across all platforms without build tools
- Uses WebAssembly for performance
- Has a similar API to SQLite

## Key Changes

### Dependencies

**Removed:**
- `better-sqlite3@^9.2.2`
- `@types/better-sqlite3@^7.6.8`

**Added:**
- `sql.js@^1.13.0`
- `@types/sql.js@^1.4.9`
- `axios@^1.13.2` (updated from 1.7.9 for security)

### Code Changes

#### Database Manager (`desktop/src/main/database.ts`)

**Before (better-sqlite3):**
```typescript
import Database from 'better-sqlite3';

export class DatabaseManager {
  private db: Database.Database;
  
  constructor(storagePath: string) {
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
  }
  
  query(sql: string, params: any[] = []): any[] {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }
}
```

**After (sql.js):**
```typescript
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';

export class DatabaseManager {
  private db: SqlJsDatabase | null = null;
  private SQL: any = null;
  
  private async initializeSqlJs() {
    this.SQL = await initSqlJs({
      locateFile: (file: string) => {
        // Load wasm file from node_modules
      }
    });
  }
  
  private loadDatabase() {
    if (fs.existsSync(this.dbPath)) {
      const buffer = fs.readFileSync(this.dbPath);
      this.db = new this.SQL.Database(new Uint8Array(buffer));
    } else {
      this.db = new this.SQL.Database();
    }
  }
  
  private saveDatabase() {
    if (this.db) {
      const data = this.db.export();
      fs.writeFileSync(this.dbPath, data);
    }
  }
  
  query(sql: string, params: any[] = []): any[] {
    const stmt = this.db.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params);
    }
    
    const results: any[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }
}
```

### API Differences

| Operation | better-sqlite3 | sql.js |
|-----------|---------------|---------|
| **Initialization** | `new Database(path)` | `await initSqlJs()` then `new SQL.Database()` |
| **Persistence** | Automatic | Manual via `export()` and file I/O |
| **Query execution** | `db.exec(sql)` | `db.run(sql)` |
| **Prepared statements** | `stmt.all()`, `stmt.get()` | `stmt.step()` + `stmt.getAsObject()` |
| **Parameter binding** | `stmt.run(...params)` | `stmt.bind(params)` |
| **Cleanup** | Automatic | Manual via `stmt.free()` |
| **Last insert ID** | `result.lastInsertRowid` | Custom query via `SELECT last_insert_rowid()` |

## Important Implementation Details

### 1. Database Persistence

sql.js stores the database in memory by default. To persist changes:
- Load database file on initialization using `fs.readFileSync()`
- Call `saveDatabase()` after each modification
- Export database using `db.export()` to get a Uint8Array
- Write to disk using `fs.writeFileSync()`

### 2. WASM File Loading

The WebAssembly file must be accessible at runtime:

```typescript
await initSqlJs({
  locateFile: (file: string) => {
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
      return path.join(__dirname, '../../node_modules/sql.js/dist/', file);
    } else {
      const { app } = require('electron');
      return path.join(app.getAppPath(), 'node_modules/sql.js/dist/', file);
    }
  }
});
```

### 3. Electron Builder Configuration

Updated `package.json` to include wasm files:

```json
{
  "build": {
    "files": [
      "dist/**/*",
      "node_modules/sql.js/dist/**/*",
      "package.json"
    ],
    "asarUnpack": [
      "node_modules/sql.js/dist/*.wasm"
    ]
  }
}
```

## Testing

All database operations have been tested:
- ✅ Database initialization
- ✅ Table creation
- ✅ INSERT operations
- ✅ SELECT queries
- ✅ UPDATE operations
- ✅ DELETE operations
- ✅ Database export/persistence
- ✅ Prepared statements
- ✅ Parameter binding

## Installation

The new implementation requires no special build tools:

```bash
npm install
```

This will work on:
- Windows (without Visual Studio)
- macOS
- Linux

## Performance Considerations

- **Memory Usage**: sql.js loads the entire database into memory. For small to medium databases (< 100MB), this is not an issue.
- **Persistence Overhead**: Each write operation requires exporting and saving the database file. This is acceptable for desktop applications with moderate write frequency.
- **Query Performance**: sql.js uses WebAssembly, which is nearly as fast as native SQLite for most operations.

## Migration Impact

✅ **Pros:**
- No native compilation required
- Cross-platform compatibility
- Easier installation and deployment
- No dependency on system libraries
- Works with newer Node.js versions

⚠️ **Considerations:**
- Manual persistence required
- Entire database loaded in memory
- Slightly different API requiring code changes

## Rollback Plan

If needed, to rollback to better-sqlite3:

1. Restore previous `package.json` dependencies
2. Restore previous `database.ts` implementation
3. Run `npm install`
4. Rebuild the application

The database file format is standard SQLite, so no data migration is needed.

## References

- [sql.js Documentation](https://sql.js.org/documentation/)
- [sql.js GitHub](https://github.com/sql-js/sql.js)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
