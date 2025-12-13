import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import * as path from 'path';
import * as fs from 'fs';

export class DatabaseManager {
  private db: SqlJsDatabase | null = null;
  private dbPath: string;
  private SQL: any = null;

  constructor(storagePath: string) {
    // Ensure directory exists
    if (!fs.existsSync(storagePath)) {
      fs.mkdirSync(storagePath, { recursive: true });
    }

    this.dbPath = path.join(storagePath, 'bpo-tracker.db');
  }

  private async initializeSqlJs() {
    if (!this.SQL) {
      this.SQL = await initSqlJs({
        locateFile: (file: string) => {
          // In Electron, we need to find the wasm file in node_modules
          // The __dirname will be in dist/main after compilation
          const isDev = process.env.NODE_ENV === 'development';
          if (isDev) {
            // In development, use the direct path to node_modules
            return path.join(__dirname, '../../node_modules/sql.js/dist/', file);
          } else {
            // In production (after electron-builder packages), use app.asar or resources
            const { app } = require('electron');
            return path.join(app.getAppPath(), 'node_modules/sql.js/dist/', file);
          }
        }
      });
    }
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

  async initialize() {
    await this.initializeSqlJs();
    this.loadDatabase();

    // Create tables
    this.db!.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'agent',
        team TEXT,
        server_id INTEGER,
        synced INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        check_in DATETIME NOT NULL,
        check_out DATETIME,
        break_start DATETIME,
        break_end DATETIME,
        total_break_minutes INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        date DATE NOT NULL,
        server_id INTEGER,
        synced INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS cases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_number TEXT UNIQUE NOT NULL,
        customer_name TEXT NOT NULL,
        customer_email TEXT,
        customer_phone TEXT,
        case_type TEXT NOT NULL,
        priority TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'open',
        description TEXT,
        assigned_to INTEGER,
        resolution TEXT,
        booked_out_at DATETIME,
        booked_out_by INTEGER,
        server_id INTEGER,
        synced INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME,
        FOREIGN KEY (assigned_to) REFERENCES users(id),
        FOREIGN KEY (booked_out_by) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS case_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER NOT NULL,
        user_id INTEGER,
        action TEXT NOT NULL,
        notes TEXT,
        server_id INTEGER,
        synced INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (case_id) REFERENCES cases(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_id INTEGER NOT NULL,
        operation TEXT NOT NULL,
        retry_count INTEGER DEFAULT 0,
        last_error TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, date);
      CREATE INDEX IF NOT EXISTS idx_cases_assigned ON cases(assigned_to);
      CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
      CREATE INDEX IF NOT EXISTS idx_cases_booked_out ON cases(booked_out_by);
      CREATE INDEX IF NOT EXISTS idx_sync_queue_pending ON sync_queue(table_name, record_id) WHERE synced = 0;
    `);

    // Add book-out columns if they don't exist (for existing databases)
    try {
      this.db!.run(`ALTER TABLE cases ADD COLUMN booked_out_at DATETIME`);
    } catch (e) {
      // Column may already exist
    }
    try {
      this.db!.run(`ALTER TABLE cases ADD COLUMN booked_out_by INTEGER`);
    } catch (e) {
      // Column may already exist
    }

    this.saveDatabase();
    console.log('Database initialized at:', this.dbPath);
  }

  query(sql: string, params: any[] = []): any[] {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params);
    }
    
    const results: any[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push(row);
    }
    stmt.free();
    return results;
  }

  execute(sql: string, params: any[] = []): any {
    if (!this.db) throw new Error('Database not initialized');
    this.db.run(sql, params);
    this.saveDatabase();
    
    // Get last insert rowid and changes count
    const lastIdResult = this.db.exec("SELECT last_insert_rowid() as lastInsertRowid");
    const changesResult = this.db.exec("SELECT changes() as changes");
    
    return {
      lastInsertRowid: lastIdResult[0]?.values[0]?.[0] || null,
      changes: changesResult[0]?.values[0]?.[0] || 0
    };
  }

  // Case operations
  async createCase(caseData: any) {
    if (!this.db) throw new Error('Database not initialized');
    
    const result = this.execute(`
      INSERT INTO cases (case_number, customer_name, customer_email, customer_phone, 
                        case_type, priority, description, assigned_to, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      caseData.case_number,
      caseData.customer_name,
      caseData.customer_email,
      caseData.customer_phone,
      caseData.case_type,
      caseData.priority || 'medium',
      caseData.description,
      caseData.assigned_to,
      'open'
    ]);

    // Add to case history
    this.addCaseHistory(result.lastInsertRowid as number, caseData.assigned_to, 'Case created', caseData.description);

    return { id: result.lastInsertRowid, ...caseData };
  }

  async updateCase(id: number, caseData: any) {
    if (!this.db) throw new Error('Database not initialized');
    
    const updates: string[] = [];
    const params: any[] = [];

    Object.keys(caseData).forEach(key => {
      if (caseData[key] !== undefined) {
        updates.push(`${key} = ?`);
        params.push(caseData[key]);
      }
    });

    updates.push('updated_at = CURRENT_TIMESTAMP');
    updates.push('synced = 0');
    params.push(id);

    const sql = `UPDATE cases SET ${updates.join(', ')} WHERE id = ?`;
    this.execute(sql, params);

    this.addCaseHistory(id, caseData.user_id, 'Case updated', JSON.stringify(caseData));

    return { id, ...caseData };
  }

  async closeCase(id: number) {
    if (!this.db) throw new Error('Database not initialized');
    
    this.execute(`
      UPDATE cases 
      SET status = 'closed', 
          resolved_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP,
          synced = 0
      WHERE id = ?
    `, [id]);

    this.addCaseHistory(id, null, 'Case closed', null);

    return { id, status: 'closed' };
  }

  // Book out a case locally
  async bookOutCase(id: number, userId: number) {
    if (!this.db) throw new Error('Database not initialized');
    
    // Check if case exists and is available
    const caseResults = this.query(`
      SELECT * FROM cases WHERE id = ?
    `, [id]);

    if (caseResults.length === 0) {
      throw new Error('Case not found');
    }

    const caseData = caseResults[0];

    // Check if already booked out by another user
    if (caseData.booked_out_by && caseData.booked_out_by !== userId) {
      return {
        success: false,
        conflict: true,
        message: 'Case already booked out by another user',
        booked_out_by: caseData.booked_out_by,
        action_required: 'Please add a new case or select a different case to book out'
      };
    }

    // Check if case is already completed
    if (caseData.status === 'closed' || caseData.status === 'resolved') {
      return {
        success: false,
        conflict: true,
        message: `Case is already ${caseData.status}`,
        status: caseData.status,
        action_required: 'Please add a new case or select a different case to book out'
      };
    }

    // Book out the case
    this.execute(`
      UPDATE cases 
      SET booked_out_at = CURRENT_TIMESTAMP,
          booked_out_by = ?,
          status = 'in_progress',
          updated_at = CURRENT_TIMESTAMP,
          synced = 0
      WHERE id = ?
    `, [userId, id]);

    this.addCaseHistory(id, userId, 'Case booked out', `Case booked out by user ${userId}`);

    const updatedCase = this.query(`SELECT * FROM cases WHERE id = ?`, [id])[0];

    return {
      success: true,
      message: 'Case booked out successfully',
      case: updatedCase
    };
  }

  // Release a booked out case
  async releaseCase(id: number, userId: number) {
    if (!this.db) throw new Error('Database not initialized');
    
    const caseResults = this.query(`SELECT * FROM cases WHERE id = ?`, [id]);

    if (caseResults.length === 0) {
      throw new Error('Case not found');
    }

    const caseData = caseResults[0];

    // Check if user can release this case
    if (caseData.booked_out_by !== userId) {
      throw new Error('Not authorized to release this case');
    }

    this.execute(`
      UPDATE cases 
      SET booked_out_at = NULL,
          booked_out_by = NULL,
          status = 'open',
          updated_at = CURRENT_TIMESTAMP,
          synced = 0
      WHERE id = ?
    `, [id]);

    this.addCaseHistory(id, userId, 'Case released', `Case released by user ${userId}`);

    return { id, status: 'open' };
  }

  // Get all allocated cases for the current user
  getAllocatedCases(userId: number) {
    if (!this.db) throw new Error('Database not initialized');
    
    const allCases = this.query(`
      SELECT * FROM cases 
      WHERE assigned_to = ? 
        AND status NOT IN ('closed', 'resolved')
      ORDER BY 
        CASE priority 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'low' THEN 3 
          ELSE 4 
        END,
        created_at ASC
    `, [userId]);

    const availableCases = allCases.filter((c: any) => !c.booked_out_by);
    const bookedOutCases = allCases.filter((c: any) => c.booked_out_by);

    return {
      total: allCases.length,
      available: availableCases.length,
      booked_out: bookedOutCases.length,
      cases: allCases,
      available_cases: availableCases,
      booked_out_cases: bookedOutCases
    };
  }

  // Import cases from server to local database
  async importCasesFromServer(cases: any[]) {
    if (!this.db) throw new Error('Database not initialized');
    
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const errors: any[] = [];

    for (const caseData of cases) {
      try {
        // Check if case exists by server_id
        const existing = this.query(`SELECT id FROM cases WHERE server_id = ?`, [caseData.id]);

        if (existing.length > 0) {
          // Update existing case
          this.execute(`
            UPDATE cases SET
              case_number = ?,
              customer_name = ?,
              customer_email = ?,
              customer_phone = ?,
              case_type = ?,
              priority = ?,
              status = ?,
              description = ?,
              assigned_to = ?,
              booked_out_at = ?,
              booked_out_by = ?,
              synced = 1,
              updated_at = CURRENT_TIMESTAMP
            WHERE server_id = ?
          `, [
            caseData.case_number,
            caseData.customer_name,
            caseData.customer_email,
            caseData.customer_phone,
            caseData.case_type,
            caseData.priority,
            caseData.status,
            caseData.description,
            caseData.assigned_to,
            caseData.booked_out_at,
            caseData.booked_out_by,
            caseData.id
          ]);
          updated++;
        } else {
          // Check if case exists by case_number (may have been created locally)
          const existingByNumber = this.query(`SELECT id FROM cases WHERE case_number = ?`, [caseData.case_number]);
          
          if (existingByNumber.length > 0) {
            // Update and link to server
            this.execute(`
              UPDATE cases SET
                server_id = ?,
                status = ?,
                booked_out_at = ?,
                booked_out_by = ?,
                synced = 1,
                updated_at = CURRENT_TIMESTAMP
              WHERE case_number = ?
            `, [
              caseData.id,
              caseData.status,
              caseData.booked_out_at,
              caseData.booked_out_by,
              caseData.case_number
            ]);
            updated++;
          } else {
            // Insert new case
            this.execute(`
              INSERT INTO cases (
                case_number, customer_name, customer_email, customer_phone,
                case_type, priority, status, description, assigned_to,
                booked_out_at, booked_out_by, server_id, synced
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            `, [
              caseData.case_number,
              caseData.customer_name,
              caseData.customer_email,
              caseData.customer_phone,
              caseData.case_type,
              caseData.priority,
              caseData.status,
              caseData.description,
              caseData.assigned_to,
              caseData.booked_out_at,
              caseData.booked_out_by,
              caseData.id
            ]);
            imported++;
          }
        }
      } catch (error: any) {
        skipped++;
        errors.push({ case_number: caseData.case_number, error: error.message });
      }
    }

    return { imported, updated, skipped, errors };
  }

  async getCurrentCase() {
    if (!this.db) throw new Error('Database not initialized');
    
    const results = this.query(`
      SELECT * FROM cases 
      WHERE status IN ('open', 'in_progress')
      ORDER BY created_at DESC 
      LIMIT 1
    `);

    return results.length > 0 ? results[0] : null;
  }

  private addCaseHistory(caseId: number, userId: number | null, action: string, notes: string | null) {
    if (!this.db) throw new Error('Database not initialized');
    
    this.execute(`
      INSERT INTO case_history (case_id, user_id, action, notes)
      VALUES (?, ?, ?, ?)
    `, [caseId, userId, action, notes]);
  }

  // Attendance operations
  async checkIn() {
    if (!this.db) throw new Error('Database not initialized');
    
    const today = new Date().toISOString().split('T')[0];
    const userId = 1; // Get from current user session

    const result = this.execute(`
      INSERT INTO attendance (user_id, check_in, date, status)
      VALUES (?, CURRENT_TIMESTAMP, ?, 'active')
    `, [userId, today]);

    return { id: result.lastInsertRowid, user_id: userId, check_in: new Date().toISOString() };
  }

  async checkOut() {
    if (!this.db) throw new Error('Database not initialized');
    
    const today = new Date().toISOString().split('T')[0];
    const userId = 1;

    // First get the attendance record id
    const attendanceRecords = this.query(`
      SELECT id FROM attendance
      WHERE user_id = ? AND date = ? AND check_out IS NULL
      LIMIT 1
    `, [userId, today]);

    if (attendanceRecords.length === 0) {
      throw new Error('No active attendance record found');
    }

    const attendanceId = attendanceRecords[0].id;

    this.execute(`
      UPDATE attendance
      SET check_out = CURRENT_TIMESTAMP,
          status = 'completed',
          updated_at = CURRENT_TIMESTAMP,
          synced = 0
      WHERE id = ?
    `, [attendanceId]);

    return { id: attendanceId, user_id: userId, check_out: new Date().toISOString() };
  }

  // Sync operations
  markAsSynced(tableName: string, id: number, serverId: number) {
    if (!this.db) throw new Error('Database not initialized');
    
    this.execute(`
      UPDATE ${tableName}
      SET synced = 1, server_id = ?
      WHERE id = ?
    `, [serverId, id]);
  }

  getUnsyncedRecords(tableName: string, limit: number = 100) {
    if (!this.db) throw new Error('Database not initialized');
    
    return this.query(`
      SELECT * FROM ${tableName}
      WHERE synced = 0
      LIMIT ?
    `, [limit]);
  }

  close() {
    if (this.db) {
      this.saveDatabase();
      this.db.close();
      this.db = null;
    }
  }
}
