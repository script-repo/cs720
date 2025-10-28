import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../.cs720/cs720.db');

const SCHEMA_PATH = (() => {
  const localPath = path.join(__dirname, 'schema.sql');
  if (fs.existsSync(localPath)) {
    return localPath;
  }
  return path.join(__dirname, '../../src/db/schema.sql');
})();

let db: Database.Database | null = null;

/**
 * Initialize SQLite database with schema
 */
export function initDatabase(): Database.Database {
  if (db) {
    return db;
  }

  // Ensure directory exists
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  console.log('[DB] Initializing database at:', DB_PATH);

  db = new Database(DB_PATH);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Load and execute schema
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  db.exec(schema);

  console.log('[DB] Database initialized successfully');

  return db;
}

/**
 * Get database instance (initializes if needed)
 */
export function getDatabase(): Database.Database {
  if (!db) {
    return initDatabase();
  }
  return db;
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('[DB] Database connection closed');
  }
}

/**
 * Execute a transaction
 */
export function transaction<T>(fn: (db: Database.Database) => T): T {
  const database = getDatabase();
  const txn = database.transaction(fn);
  return txn(database);
}

/**
 * Health check for database
 */
export function checkDatabaseHealth(): { healthy: boolean; message?: string } {
  try {
    const database = getDatabase();
    const result = database.prepare('SELECT 1').get();
    return { healthy: true };
  } catch (error) {
    return {
      healthy: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export default {
  initDatabase,
  getDatabase,
  closeDatabase,
  transaction,
  checkDatabaseHealth
};
