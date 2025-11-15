import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

export class DatabaseManager {
  private db: Database.Database;
  private dbPath: string;

  constructor(storagePath: string) {
    // Ensure directory exists
    if (!fs.existsSync(storagePath)) {
      fs.mkdirSync(storagePath, { recursive: true });
    }

    this.dbPath = path.join(storagePath, 'bpo-tracker.db');
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL'); // Better performance for concurrent access
  }

  async initialize() {
    // Create tables
    this.db.exec(`
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
        server_id INTEGER,
        synced INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME,
        FOREIGN KEY (assigned_to) REFERENCES users(id)
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
      CREATE INDEX IF NOT EXISTS idx_sync_queue_pending ON sync_queue(table_name, record_id) WHERE synced = 0;
    `);

    console.log('Database initialized at:', this.dbPath);
  }

  query(sql: string, params: any[] = []): any[] {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  execute(sql: string, params: any[] = []): any {
    const stmt = this.db.prepare(sql);
    return stmt.run(...params);
  }

  // Case operations
  async createCase(caseData: any) {
    const stmt = this.db.prepare(`
      INSERT INTO cases (case_number, customer_name, customer_email, customer_phone, 
                        case_type, priority, description, assigned_to, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      caseData.case_number,
      caseData.customer_name,
      caseData.customer_email,
      caseData.customer_phone,
      caseData.case_type,
      caseData.priority || 'medium',
      caseData.description,
      caseData.assigned_to,
      'open'
    );

    // Add to case history
    this.addCaseHistory(result.lastInsertRowid as number, caseData.assigned_to, 'Case created', caseData.description);

    return { id: result.lastInsertRowid, ...caseData };
  }

  async updateCase(id: number, caseData: any) {
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
    const stmt = this.db.prepare(sql);
    stmt.run(...params);

    this.addCaseHistory(id, caseData.user_id, 'Case updated', JSON.stringify(caseData));

    return { id, ...caseData };
  }

  async closeCase(id: number) {
    const stmt = this.db.prepare(`
      UPDATE cases 
      SET status = 'closed', 
          resolved_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP,
          synced = 0
      WHERE id = ?
    `);

    stmt.run(id);
    this.addCaseHistory(id, null, 'Case closed', null);

    return { id, status: 'closed' };
  }

  async getCurrentCase() {
    const stmt = this.db.prepare(`
      SELECT * FROM cases 
      WHERE status IN ('open', 'in_progress')
      ORDER BY created_at DESC 
      LIMIT 1
    `);

    return stmt.get();
  }

  private addCaseHistory(caseId: number, userId: number | null, action: string, notes: string | null) {
    const stmt = this.db.prepare(`
      INSERT INTO case_history (case_id, user_id, action, notes)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(caseId, userId, action, notes);
  }

  // Attendance operations
  async checkIn() {
    const today = new Date().toISOString().split('T')[0];
    const userId = 1; // Get from current user session

    const stmt = this.db.prepare(`
      INSERT INTO attendance (user_id, check_in, date, status)
      VALUES (?, CURRENT_TIMESTAMP, ?, 'active')
    `);

    const result = stmt.run(userId, today);

    return { id: result.lastInsertRowid, user_id: userId, check_in: new Date().toISOString() };
  }

  async checkOut() {
    const today = new Date().toISOString().split('T')[0];
    const userId = 1;

    const stmt = this.db.prepare(`
      UPDATE attendance
      SET check_out = CURRENT_TIMESTAMP,
          status = 'completed',
          updated_at = CURRENT_TIMESTAMP,
          synced = 0
      WHERE user_id = ? AND date = ? AND check_out IS NULL
    `);

    stmt.run(userId, today);

    return { user_id: userId, check_out: new Date().toISOString() };
  }

  // Sync operations
  markAsSynced(tableName: string, id: number, serverId: number) {
    const stmt = this.db.prepare(`
      UPDATE ${tableName}
      SET synced = 1, server_id = ?
      WHERE id = ?
    `);

    stmt.run(serverId, id);
  }

  getUnsyncedRecords(tableName: string, limit: number = 100) {
    const stmt = this.db.prepare(`
      SELECT * FROM ${tableName}
      WHERE synced = 0
      LIMIT ?
    `);

    return stmt.all(limit);
  }

  close() {
    this.db.close();
  }
}
