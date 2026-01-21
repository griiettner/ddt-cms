import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import type { DatabaseInstance, ReleaseRow, TableColumnInfo } from '../types/index.js';

dotenv.config();

const REGISTRY_DB_PATH: string = process.env.REGISTRY_DB_PATH || 'data/registry.db';
const RELEASES_DB_DIR: string = process.env.RELEASES_DB_DIR || 'data/releases';

// Ensure directories exist
const registryDir: string = path.dirname(REGISTRY_DB_PATH);
if (!fs.existsSync(registryDir)) {
  fs.mkdirSync(registryDir, { recursive: true });
}
if (!fs.existsSync(RELEASES_DB_DIR)) {
  fs.mkdirSync(RELEASES_DB_DIR, { recursive: true });
}

let registryDb: DatabaseInstance | null = null;
const releaseDbs = new Map<string | number, DatabaseInstance>();

/**
 * Initializes and returns the registry database connection
 */
export const getRegistryDb = (): DatabaseInstance => {
  if (!registryDb) {
    registryDb = new Database(REGISTRY_DB_PATH);
    registryDb.pragma('journal_mode = WAL');
    registryDb.pragma('synchronous = NORMAL');
  }
  return registryDb;
};

/**
 * Run migrations on a release database to ensure schema is up to date
 * @param db - The database connection
 */
const migrateReleaseDb = (db: DatabaseInstance): void => {
  try {
    // Migration: Add category_id to test_sets
    const testSetsInfo = db.prepare('PRAGMA table_info(test_sets)').all() as TableColumnInfo[];
    const testSetsColumns: string[] = testSetsInfo.map((col) => col.name);

    if (!testSetsColumns.includes('category_id')) {
      db.exec('ALTER TABLE test_sets ADD COLUMN category_id INTEGER');
      db.exec('CREATE INDEX IF NOT EXISTS idx_test_sets_category ON test_sets(category_id)');
      console.log('  -> Added category_id to test_sets');
    }

    // Migration: Add select_config_id and match_config_id to test_steps
    const testStepsInfo = db.prepare('PRAGMA table_info(test_steps)').all() as TableColumnInfo[];
    const testStepsColumns: string[] = testStepsInfo.map((col) => col.name);

    if (!testStepsColumns.includes('select_config_id')) {
      db.exec('ALTER TABLE test_steps ADD COLUMN select_config_id INTEGER');
      console.log('  -> Added select_config_id to test_steps');
    }

    if (!testStepsColumns.includes('match_config_id')) {
      db.exec('ALTER TABLE test_steps ADD COLUMN match_config_id INTEGER');
      console.log('  -> Added match_config_id to test_steps');
    }
  } catch (err) {
    const error = err as Error;
    console.error('Migration warning (non-fatal):', error.message);
  }
};

/**
 * Initializes and returns a connection to a specific release database
 * @param releaseId - The release ID
 */
export const getReleaseDb = (releaseId: string | number): DatabaseInstance => {
  const cached = releaseDbs.get(releaseId);
  if (cached) {
    return cached;
  }

  // Find the release path from the registry
  const registry = getRegistryDb();
  const release = registry
    .prepare('SELECT id, release_number FROM releases WHERE id = ?')
    .get(releaseId) as Pick<ReleaseRow, 'id' | 'release_number'> | undefined;

  if (!release) {
    throw new Error(`Release with ID ${releaseId} not found`);
  }

  const dbPath: string = path.join(RELEASES_DB_DIR, `${releaseId}.db`);
  const db: DatabaseInstance = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');

  // Run migrations to ensure schema is up to date
  migrateReleaseDb(db);

  releaseDbs.set(releaseId, db);
  return db;
};

/**
 * Closes all database connections
 */
export const closeDataBases = (): void => {
  if (registryDb) {
    registryDb.close();
    registryDb = null;
  }
  for (const [, db] of releaseDbs) {
    db.close();
  }
  releaseDbs.clear();
};
