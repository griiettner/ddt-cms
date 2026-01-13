/**
 * Database connection and setup
 * Uses better-sqlite3 for synchronous SQLite operations
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Environment configuration
const DB_PATH = process.env.DATABASE_PATH || './data/cms-ddt.db';
const dbFilePath = path.resolve(DB_PATH);
const dbDir = path.dirname(dbFilePath);

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log(`Created database directory: ${dbDir}`);
}

// Create database connection
const db = new Database(dbFilePath, {
  verbose: process.env.NODE_ENV === 'development' ? console.log : null
});

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Enable Write-Ahead Logging for better concurrency
db.pragma('journal_mode = WAL');

console.log(`Database connected: ${dbFilePath}`);

/**
 * Helper function to run migrations
 */
function runMigration(migrationSQL) {
  try {
    db.exec(migrationSQL);
    console.log('Migration executed successfully');
    return true;
  } catch (error) {
    console.error('Migration failed:', error.message);
    return false;
  }
}

/**
 * Get database instance
 */
function getDatabase() {
  return db;
}

/**
 * Close database connection
 */
function closeDatabase() {
  if (db) {
    db.close();
    console.log('Database connection closed');
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeDatabase();
  process.exit(0);
});

module.exports = {
  db,
  getDatabase,
  closeDatabase,
  runMigration
};
