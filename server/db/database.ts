/**
 * Database Module - libSQL Client
 * Pure JavaScript SQLite implementation using @libsql/client
 * No native compilation required (uses WebAssembly)
 */
import { createClient, type Client, type ResultSet, type InValue } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { dbConfig } from './config.js';

dotenv.config();

// Ensure data directory exists
const dbDir: string = path.dirname(dbConfig.sqlite.path);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let client: Client | null = null;

/**
 * Database wrapper that provides a familiar interface
 * similar to better-sqlite3 but with async operations
 */
export interface DatabaseWrapper {
  /**
   * Execute a query and return all rows
   */
  all<T = Record<string, unknown>>(sql: string, params?: InValue[]): Promise<T[]>;

  /**
   * Execute a query and return the first row
   */
  get<T = Record<string, unknown>>(sql: string, params?: InValue[]): Promise<T | undefined>;

  /**
   * Execute an INSERT/UPDATE/DELETE and return result info
   */
  run(
    sql: string,
    params?: InValue[]
  ): Promise<{ changes: number; lastInsertRowid: number | bigint }>;

  /**
   * Execute raw SQL (for schema creation, multiple statements)
   */
  exec(sql: string): Promise<void>;

  /**
   * Execute a query with the raw libsql client
   */
  execute(sql: string, params?: InValue[]): Promise<ResultSet>;

  /**
   * Close the database connection
   */
  close(): void;

  /**
   * Get the underlying libsql client
   */
  getClient(): Client;
}

/**
 * Create the database wrapper
 */
function createDatabaseWrapper(libsqlClient: Client): DatabaseWrapper {
  return {
    async all<T = Record<string, unknown>>(sql: string, params?: InValue[]): Promise<T[]> {
      const result = await libsqlClient.execute({
        sql,
        args: params || [],
      });
      return result.rows as T[];
    },

    async get<T = Record<string, unknown>>(
      sql: string,
      params?: InValue[]
    ): Promise<T | undefined> {
      const result = await libsqlClient.execute({
        sql,
        args: params || [],
      });
      return result.rows[0] as T | undefined;
    },

    async run(
      sql: string,
      params?: InValue[]
    ): Promise<{ changes: number; lastInsertRowid: number | bigint }> {
      const result = await libsqlClient.execute({
        sql,
        args: params || [],
      });
      return {
        changes: result.rowsAffected,
        lastInsertRowid: result.lastInsertRowid || 0,
      };
    },

    async exec(sql: string): Promise<void> {
      // Split by semicolons and execute each statement
      // Filter out empty statements
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        await libsqlClient.execute(statement);
      }
    },

    async execute(sql: string, params?: InValue[]): Promise<ResultSet> {
      return libsqlClient.execute({
        sql,
        args: params || [],
      });
    },

    close(): void {
      libsqlClient.close();
    },

    getClient(): Client {
      return libsqlClient;
    },
  };
}

let db: DatabaseWrapper | null = null;

/**
 * Initializes and returns the database wrapper
 * This is the primary database access function
 */
export const getDb = (): DatabaseWrapper => {
  if (!db) {
    // Convert path to file: URL format for libsql
    const dbPath = path.resolve(dbConfig.sqlite.path);
    const fileUrl = `file:${dbPath}`;

    client = createClient({
      url: fileUrl,
    });

    db = createDatabaseWrapper(client);
  }
  return db;
};

/**
 * Initialize database with pragmas
 * Call this after getDb() to set up pragmas
 */
export const initDbPragmas = async (): Promise<void> => {
  const database = getDb();
  // Note: WAL mode may not be fully supported in all libsql configurations
  // but we try to set these for compatibility
  try {
    await database.execute('PRAGMA journal_mode = WAL');
    await database.execute('PRAGMA synchronous = NORMAL');
    await database.execute('PRAGMA foreign_keys = ON');
  } catch (err) {
    // Pragmas may fail in some environments, log but continue
    console.warn('[DB] Some pragmas may not be supported:', (err as Error).message);
  }
};

/**
 * Alias for getDb() - provides backward compatibility
 * @deprecated Use getDb() instead
 */
export const getRegistryDb = (): DatabaseWrapper => getDb();

/**
 * Checkpoint the WAL file to persist changes to the main database
 * This is important to ensure data is written to the main .db file
 */
export const checkpointDatabase = async (): Promise<void> => {
  if (db) {
    try {
      await db.execute('PRAGMA wal_checkpoint(TRUNCATE)');
    } catch (err) {
      console.warn('[DB] Checkpoint failed:', (err as Error).message);
    }
  }
};

/**
 * Closes the database connection
 * Performs a checkpoint before closing to ensure all data is persisted
 */
export const closeDatabase = async (): Promise<void> => {
  if (db) {
    // Checkpoint before closing to ensure data is written to main db file
    await checkpointDatabase();
    db.close();
    db = null;
    client = null;
  }
};

/**
 * Alias for closeDatabase() - provides backward compatibility
 * @deprecated Use closeDatabase() instead
 */
export const closeDataBases = async (): Promise<void> => closeDatabase();

// Re-export types for convenience
export type { Client, ResultSet, InValue };
