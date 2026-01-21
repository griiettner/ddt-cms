import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { dbConfig } from './config.js';
import type { DatabaseInstance } from '../types/index.js';

dotenv.config();

// Ensure data directory exists
const dbDir: string = path.dirname(dbConfig.sqlite.path);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db: DatabaseInstance | null = null;

/**
 * Initializes and returns the single database connection
 * This is the primary database access function for the unified schema
 */
export const getDb = (): DatabaseInstance => {
  if (!db) {
    db = new Database(dbConfig.sqlite.path);
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('foreign_keys = ON'); // Enable FK enforcement
  }
  return db;
};

/**
 * Alias for getDb() - provides backward compatibility
 * @deprecated Use getDb() instead
 */
export const getRegistryDb = (): DatabaseInstance => getDb();

/**
 * Closes the database connection
 */
export const closeDatabase = (): void => {
  if (db) {
    db.close();
    db = null;
  }
};

/**
 * Alias for closeDatabase() - provides backward compatibility
 * @deprecated Use closeDatabase() instead
 */
export const closeDataBases = (): void => closeDatabase();
