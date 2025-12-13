import { Pool as PgPool } from 'pg';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Database type: 'postgresql' (default) or 'mysql'
const DB_TYPE = (process.env.DB_TYPE || 'postgresql').toLowerCase();

// Connection pool instances
let pgPool: PgPool | null = null;
let mysqlPool: mysql.Pool | null = null;

// Initialize PostgreSQL pool
function initPgPool(): PgPool {
  if (!pgPool) {
    pgPool = new PgPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'bpo_tracker',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pgPool.on('error', (err) => {
      console.error('Unexpected PostgreSQL error:', err);
    });
  }
  return pgPool;
}

// Initialize MySQL pool
function initMysqlPool(): mysql.Pool {
  if (!mysqlPool) {
    mysqlPool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      database: process.env.DB_NAME || 'bpo_tracker',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      waitForConnections: true,
      connectionLimit: 20,
      queueLimit: 0,
    });
  }
  return mysqlPool;
}

// Convert PostgreSQL-style $1, $2 placeholders to MySQL ? placeholders
function convertPlaceholders(text: string): string {
  if (DB_TYPE === 'mysql') {
    return text.replace(/\$\d+/g, '?');
  }
  return text;
}

// Query function that works with both databases
export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  const convertedText = convertPlaceholders(text);

  try {
    let res: any;

    if (DB_TYPE === 'mysql') {
      const pool = initMysqlPool();
      const [rows, fields] = await pool.execute(convertedText, params || []);
      res = {
        rows: Array.isArray(rows) ? rows : [rows],
        rowCount: Array.isArray(rows) ? rows.length : 1,
        fields,
      };
    } else {
      const pool = initPgPool();
      res = await pool.query(text, params);
    }

    const duration = Date.now() - start;
    console.log('Executed query', { text: convertedText.substring(0, 100), duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Get a client/connection for transactions
export const getClient = async () => {
  if (DB_TYPE === 'mysql') {
    const pool = initMysqlPool();
    return await pool.getConnection();
  } else {
    const pool = initPgPool();
    return await pool.connect();
  }
};

// Get the database type
export const getDatabaseType = () => DB_TYPE;

// Initialize database schema
export const initializeDatabase = async () => {
  try {
    if (DB_TYPE === 'mysql') {
      await initializeMySQLSchema();
    } else {
      await initializePostgreSQLSchema();
    }
    console.log(`Database schema initialized successfully (${DB_TYPE})`);
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// PostgreSQL schema initialization
async function initializePostgreSQLSchema() {
  // Users table
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'agent',
      team VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Attendance table
  await query(`
    CREATE TABLE IF NOT EXISTS attendance (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      check_in TIMESTAMP NOT NULL,
      check_out TIMESTAMP,
      break_start TIMESTAMP,
      break_end TIMESTAMP,
      total_break_minutes INTEGER DEFAULT 0,
      status VARCHAR(50) DEFAULT 'active',
      date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Cases table with book-out fields
  await query(`
    CREATE TABLE IF NOT EXISTS cases (
      id SERIAL PRIMARY KEY,
      case_number VARCHAR(100) UNIQUE NOT NULL,
      customer_name VARCHAR(255) NOT NULL,
      customer_email VARCHAR(255),
      customer_phone VARCHAR(50),
      case_type VARCHAR(100) NOT NULL,
      priority VARCHAR(50) DEFAULT 'medium',
      status VARCHAR(50) DEFAULT 'open',
      description TEXT,
      assigned_to INTEGER REFERENCES users(id),
      resolution TEXT,
      booked_out_at TIMESTAMP,
      booked_out_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      resolved_at TIMESTAMP
    )
  `);

  // Add book-out columns if they don't exist (for existing installations)
  try {
    await query(`ALTER TABLE cases ADD COLUMN IF NOT EXISTS booked_out_at TIMESTAMP`);
    await query(`ALTER TABLE cases ADD COLUMN IF NOT EXISTS booked_out_by INTEGER REFERENCES users(id)`);
  } catch (error) {
    // Columns may already exist, ignore error
  }

  // Case history table
  await query(`
    CREATE TABLE IF NOT EXISTS case_history (
      id SERIAL PRIMARY KEY,
      case_id INTEGER REFERENCES cases(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id),
      action VARCHAR(255) NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// MySQL schema initialization
async function initializeMySQLSchema() {
  // Users table
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'agent',
      team VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // Attendance table
  await query(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      check_in TIMESTAMP NOT NULL,
      check_out TIMESTAMP NULL,
      break_start TIMESTAMP NULL,
      break_end TIMESTAMP NULL,
      total_break_minutes INT DEFAULT 0,
      status VARCHAR(50) DEFAULT 'active',
      date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Cases table with book-out fields
  await query(`
    CREATE TABLE IF NOT EXISTS cases (
      id INT AUTO_INCREMENT PRIMARY KEY,
      case_number VARCHAR(100) UNIQUE NOT NULL,
      customer_name VARCHAR(255) NOT NULL,
      customer_email VARCHAR(255),
      customer_phone VARCHAR(50),
      case_type VARCHAR(100) NOT NULL,
      priority VARCHAR(50) DEFAULT 'medium',
      status VARCHAR(50) DEFAULT 'open',
      description TEXT,
      assigned_to INT,
      resolution TEXT,
      booked_out_at TIMESTAMP NULL,
      booked_out_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      resolved_at TIMESTAMP NULL,
      FOREIGN KEY (assigned_to) REFERENCES users(id),
      FOREIGN KEY (booked_out_by) REFERENCES users(id)
    )
  `);

  // Add book-out columns if they don't exist (for existing installations)
  try {
    await query(`ALTER TABLE cases ADD COLUMN booked_out_at TIMESTAMP NULL`);
    await query(`ALTER TABLE cases ADD COLUMN booked_out_by INT`);
  } catch (error) {
    // Columns may already exist, ignore error
  }

  // Case history table
  await query(`
    CREATE TABLE IF NOT EXISTS case_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      case_id INT NOT NULL,
      user_id INT,
      action VARCHAR(255) NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
}

// Export the pool for direct access if needed
export const getPool = () => {
  if (DB_TYPE === 'mysql') {
    return initMysqlPool();
  }
  return initPgPool();
};

export default getPool;
