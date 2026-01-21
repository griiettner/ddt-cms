/**
 * Migration Script: Multi-DB to Single-DB
 *
 * This script migrates data from the multi-SQLite architecture
 * (registry.db + per-release DBs) to a single unified database (app.db).
 *
 * Usage: npx tsx server/db/migrate-to-single-db.ts
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { dbConfig } from './config.js';
import { initSchema } from './migrations.js';
import type { DatabaseInstance } from '../types/index.js';

dotenv.config();

// Old database paths
const OLD_REGISTRY_DB_PATH = process.env.REGISTRY_DB_PATH || 'data/registry.db';
const OLD_RELEASES_DB_DIR = process.env.RELEASES_DB_DIR || 'data/releases';

// New unified database path
const NEW_DB_PATH = dbConfig.sqlite.path;

// Archive directory for old databases
const ARCHIVE_DIR = 'data/archive';

interface ReleaseRow {
  id: number;
  release_number: string;
}

interface TestSetRow {
  id: number;
  release_id: number;
  category_id: number | null;
  name: string;
  description: string | null;
  created_at: string;
  created_by: string | null;
}

interface TestCaseRow {
  id: number;
  test_set_id: number;
  name: string;
  description: string | null;
  order_index: number;
  created_at: string;
}

interface TestScenarioRow {
  id: number;
  test_case_id: number;
  name: string;
  description: string | null;
  order_index: number;
  created_at: string;
}

interface TestStepRow {
  id: number;
  test_scenario_id: number;
  order_index: number;
  step_definition: string;
  type: string | null;
  element_id: string | null;
  action: string | null;
  action_result: string | null;
  select_config_id: number | null;
  match_config_id: number | null;
  required: number;
  expected_results: string | null;
  created_at: string;
  updated_at: string;
}

interface ConfigOptionRow {
  id: number;
  category: string;
  key: string;
  display_name: string;
  result_type: string | null;
  default_value: string | null;
  config_data: string | null;
  is_active: number;
  order_index: number;
}

interface IdMapping {
  testSets: Map<number, number>; // oldId -> newId
  testCases: Map<number, number>;
  testScenarios: Map<number, number>;
}

/**
 * Main migration function
 */
async function migrate(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Starting Migration: Multi-DB to Single-DB');
  console.log('='.repeat(60));

  // Check if old registry database exists
  if (!fs.existsSync(OLD_REGISTRY_DB_PATH)) {
    console.log('No existing registry database found. Creating fresh database...');
    initSchema();
    console.log('Fresh database created at:', NEW_DB_PATH);
    return;
  }

  // Create backup/archive directory
  if (!fs.existsSync(ARCHIVE_DIR)) {
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  }

  // Ensure new database directory exists
  const newDbDir = path.dirname(NEW_DB_PATH);
  if (!fs.existsSync(newDbDir)) {
    fs.mkdirSync(newDbDir, { recursive: true });
  }

  // Remove existing new database if it exists (for clean migration)
  if (fs.existsSync(NEW_DB_PATH)) {
    console.log('Removing existing app.db for clean migration...');
    fs.unlinkSync(NEW_DB_PATH);
    // Also remove WAL and SHM files if they exist
    if (fs.existsSync(NEW_DB_PATH + '-wal')) fs.unlinkSync(NEW_DB_PATH + '-wal');
    if (fs.existsSync(NEW_DB_PATH + '-shm')) fs.unlinkSync(NEW_DB_PATH + '-shm');
  }

  // Initialize new database schema
  console.log('\n1. Initializing new unified database schema...');
  initSchema();

  // Open databases
  const oldRegistry: DatabaseInstance = new Database(OLD_REGISTRY_DB_PATH, { readonly: true });
  const newDb: DatabaseInstance = new Database(NEW_DB_PATH);
  newDb.pragma('foreign_keys = OFF'); // Temporarily disable for migration

  try {
    // Copy registry tables
    console.log('\n2. Migrating registry tables...');
    migrateRegistryTables(oldRegistry, newDb);

    // Get all releases
    const releases = oldRegistry
      .prepare('SELECT id, release_number FROM releases')
      .all() as ReleaseRow[];
    console.log(`   Found ${releases.length} releases to migrate`);

    // Migrate each release's data
    console.log('\n3. Migrating release-specific data...');
    for (const release of releases) {
      const releaseDbPath = path.join(OLD_RELEASES_DB_DIR, `${release.id}.db`);
      if (fs.existsSync(releaseDbPath)) {
        console.log(`   Migrating release ${release.id} (${release.release_number})...`);
        migrateReleaseData(releaseDbPath, newDb, release.id);
      } else {
        console.log(`   Skipping release ${release.id} - no database file found`);
      }
    }

    // Seed default configuration if none exists
    console.log('\n4. Ensuring default configuration exists...');
    seedDefaultConfiguration(newDb);

    // Re-enable foreign keys and verify
    newDb.pragma('foreign_keys = ON');
    console.log('\n5. Verifying migration...');
    verifyMigration(newDb);

    // Archive old databases
    console.log('\n6. Archiving old databases...');
    archiveOldDatabases();

    console.log('\n' + '='.repeat(60));
    console.log('Migration completed successfully!');
    console.log('='.repeat(60));
    console.log(`\nNew database: ${NEW_DB_PATH}`);
    console.log(`Archived files: ${ARCHIVE_DIR}/`);
    console.log('\nPlease update your .env file:');
    console.log('  - Remove REGISTRY_DB_PATH');
    console.log('  - Remove RELEASES_DB_DIR');
    console.log('  - Add DB_PATH=data/app.db (optional, this is the default)');
  } finally {
    oldRegistry.close();
    newDb.close();
  }
}

/**
 * Migrate registry tables (releases, test_runs, select_configs, etc.)
 */
function migrateRegistryTables(oldDb: DatabaseInstance, newDb: DatabaseInstance): void {
  // Migrate releases
  const releases = oldDb.prepare('SELECT * FROM releases').all();
  if (releases.length > 0) {
    const insertRelease = newDb.prepare(`
      INSERT INTO releases (id, release_number, description, notes, created_at, created_by, closed_at, closed_by, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const r of releases as Record<string, unknown>[]) {
      insertRelease.run(
        r.id,
        r.release_number,
        r.description,
        r.notes,
        r.created_at,
        r.created_by,
        r.closed_at,
        r.closed_by,
        r.status
      );
    }
    console.log(`   - Migrated ${releases.length} releases`);
  }

  // Migrate test_runs
  try {
    const testRuns = oldDb.prepare('SELECT * FROM test_runs').all();
    if (testRuns.length > 0) {
      const insertRun = newDb.prepare(`
        INSERT INTO test_runs (id, release_id, test_set_id, test_set_name, status, executed_by, executed_at, duration_ms, total_scenarios, total_steps, passed_steps, failed_steps, failed_details)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const r of testRuns as Record<string, unknown>[]) {
        insertRun.run(
          r.id,
          r.release_id,
          r.test_set_id,
          r.test_set_name,
          r.status,
          r.executed_by,
          r.executed_at,
          r.duration_ms || 0,
          r.total_scenarios || 0,
          r.total_steps || 0,
          r.passed_steps || 0,
          r.failed_steps || 0,
          r.failed_details
        );
      }
      console.log(`   - Migrated ${testRuns.length} test runs`);
    }
  } catch {
    console.log('   - No test_runs table found in old registry');
  }

  // Migrate select_configs
  try {
    const selectConfigs = oldDb.prepare('SELECT * FROM select_configs').all();
    if (selectConfigs.length > 0) {
      const insertConfig = newDb.prepare(`
        INSERT INTO select_configs (id, name, options, config_type, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const c of selectConfigs as Record<string, unknown>[]) {
        insertConfig.run(c.id, c.name, c.options, c.config_type, c.created_at, c.updated_at);
      }
      console.log(`   - Migrated ${selectConfigs.length} select configs`);
    }
  } catch {
    console.log('   - No select_configs table found in old registry');
  }

  // Migrate match_configs
  try {
    const matchConfigs = oldDb.prepare('SELECT * FROM match_configs').all();
    if (matchConfigs.length > 0) {
      const insertConfig = newDb.prepare(`
        INSERT INTO match_configs (id, name, options, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const c of matchConfigs as Record<string, unknown>[]) {
        insertConfig.run(c.id, c.name, c.options, c.created_at, c.updated_at);
      }
      console.log(`   - Migrated ${matchConfigs.length} match configs`);
    }
  } catch {
    console.log('   - No match_configs table found in old registry');
  }

  // Migrate categories
  try {
    const categories = oldDb.prepare('SELECT * FROM categories').all();
    if (categories.length > 0) {
      const insertCategory = newDb.prepare(`
        INSERT INTO categories (id, parent_id, name, description, path, level, lft, rgt, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const c of categories as Record<string, unknown>[]) {
        insertCategory.run(
          c.id,
          c.parent_id,
          c.name,
          c.description,
          c.path,
          c.level,
          c.lft,
          c.rgt,
          c.created_at,
          c.updated_at
        );
      }
      console.log(`   - Migrated ${categories.length} categories`);
    }
  } catch {
    console.log('   - No categories table found in old registry');
  }

  // Migrate reusable_cases
  try {
    const reusableCases = oldDb.prepare('SELECT * FROM reusable_cases').all();
    if (reusableCases.length > 0) {
      const insertCase = newDb.prepare(`
        INSERT INTO reusable_cases (id, name, description, created_at, created_by, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const c of reusableCases as Record<string, unknown>[]) {
        insertCase.run(c.id, c.name, c.description, c.created_at, c.created_by, c.updated_at);
      }
      console.log(`   - Migrated ${reusableCases.length} reusable cases`);
    }
  } catch {
    console.log('   - No reusable_cases table found in old registry');
  }

  // Migrate reusable_case_steps
  try {
    const reusableSteps = oldDb.prepare('SELECT * FROM reusable_case_steps').all();
    if (reusableSteps.length > 0) {
      const insertStep = newDb.prepare(`
        INSERT INTO reusable_case_steps (id, reusable_case_id, order_index, step_definition, type, element_id, action, action_result, select_config_id, match_config_id, required, expected_results, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const s of reusableSteps as Record<string, unknown>[]) {
        insertStep.run(
          s.id,
          s.reusable_case_id,
          s.order_index,
          s.step_definition,
          s.type,
          s.element_id,
          s.action,
          s.action_result,
          s.select_config_id,
          s.match_config_id,
          s.required,
          s.expected_results,
          s.created_at
        );
      }
      console.log(`   - Migrated ${reusableSteps.length} reusable case steps`);
    }
  } catch {
    console.log('   - No reusable_case_steps table found in old registry');
  }
}

/**
 * Migrate data from a release database
 */
function migrateReleaseData(
  releaseDbPath: string,
  newDb: DatabaseInstance,
  releaseId: number
): void {
  const releaseDb: DatabaseInstance = new Database(releaseDbPath, { readonly: true });
  const mapping: IdMapping = {
    testSets: new Map(),
    testCases: new Map(),
    testScenarios: new Map(),
  };

  try {
    // Migrate test_sets
    const testSets = releaseDb.prepare('SELECT * FROM test_sets').all() as TestSetRow[];
    const insertTestSet = newDb.prepare(`
      INSERT INTO test_sets (release_id, category_id, name, description, created_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const ts of testSets) {
      const result = insertTestSet.run(
        releaseId,
        ts.category_id,
        ts.name,
        ts.description,
        ts.created_at,
        ts.created_by
      );
      mapping.testSets.set(ts.id, result.lastInsertRowid as number);
    }

    // Migrate test_cases
    const testCases = releaseDb.prepare('SELECT * FROM test_cases').all() as TestCaseRow[];
    const insertTestCase = newDb.prepare(`
      INSERT INTO test_cases (release_id, test_set_id, name, description, order_index, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const tc of testCases) {
      const newTestSetId = mapping.testSets.get(tc.test_set_id);
      if (newTestSetId !== undefined) {
        const result = insertTestCase.run(
          releaseId,
          newTestSetId,
          tc.name,
          tc.description,
          tc.order_index,
          tc.created_at
        );
        mapping.testCases.set(tc.id, result.lastInsertRowid as number);
      }
    }

    // Migrate test_scenarios
    const testScenarios = releaseDb
      .prepare('SELECT * FROM test_scenarios')
      .all() as TestScenarioRow[];
    const insertScenario = newDb.prepare(`
      INSERT INTO test_scenarios (release_id, test_case_id, name, description, order_index, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const ts of testScenarios) {
      const newTestCaseId = mapping.testCases.get(ts.test_case_id);
      if (newTestCaseId !== undefined) {
        const result = insertScenario.run(
          releaseId,
          newTestCaseId,
          ts.name,
          ts.description,
          ts.order_index,
          ts.created_at
        );
        mapping.testScenarios.set(ts.id, result.lastInsertRowid as number);
      }
    }

    // Migrate test_steps
    const testSteps = releaseDb.prepare('SELECT * FROM test_steps').all() as TestStepRow[];
    const insertStep = newDb.prepare(`
      INSERT INTO test_steps (release_id, test_scenario_id, order_index, step_definition, type, element_id, action, action_result, select_config_id, match_config_id, required, expected_results, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const step of testSteps) {
      const newScenarioId = mapping.testScenarios.get(step.test_scenario_id);
      if (newScenarioId !== undefined) {
        insertStep.run(
          releaseId,
          newScenarioId,
          step.order_index,
          step.step_definition,
          step.type,
          step.element_id,
          step.action,
          step.action_result,
          step.select_config_id,
          step.match_config_id,
          step.required,
          step.expected_results,
          step.created_at,
          step.updated_at
        );
      }
    }

    // Migrate configuration_options for this release
    try {
      const configs = releaseDb
        .prepare('SELECT * FROM configuration_options')
        .all() as ConfigOptionRow[];
      const insertConfig = newDb.prepare(`
        INSERT OR IGNORE INTO configuration_options (release_id, category, key, display_name, result_type, default_value, config_data, is_active, order_index)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const c of configs) {
        insertConfig.run(
          releaseId,
          c.category,
          c.key,
          c.display_name,
          c.result_type,
          c.default_value,
          c.config_data,
          c.is_active,
          c.order_index
        );
      }
    } catch {
      // Configuration table may not exist in all release DBs
    }

    console.log(
      `     - ${testSets.length} test sets, ${testCases.length} cases, ${testScenarios.length} scenarios, ${testSteps.length} steps`
    );
  } finally {
    releaseDb.close();
  }
}

/**
 * Seed default configuration options if none exist
 */
function seedDefaultConfiguration(db: DatabaseInstance): void {
  interface CountResult {
    count: number;
  }
  const existing = db
    .prepare('SELECT COUNT(*) as count FROM configuration_options WHERE release_id IS NULL')
    .get() as CountResult;
  if (existing.count > 0) {
    console.log('   - Default configuration already exists');
    return;
  }

  const types = [
    { key: 'button-click', name: 'button-click' },
    { key: 'button-click-redirect', name: 'button-click-redirect' },
    { key: 'field-checkbox', name: 'field-checkbox' },
    { key: 'field-error', name: 'field-error' },
    { key: 'field-input', name: 'field-input' },
    { key: 'field-label', name: 'field-label' },
    { key: 'field-options', name: 'field-options' },
    { key: 'field-radio', name: 'field-radio' },
    { key: 'field-select', name: 'field-select' },
    { key: 'field-textarea', name: 'field-textarea' },
    { key: 'text-link', name: 'text-link' },
    { key: 'text-plain', name: 'text-plain' },
    { key: 'ui-card', name: 'ui-card' },
    { key: 'ui-element', name: 'ui-element' },
    { key: 'url-validate', name: 'url-validate' },
    { key: 'url-visit', name: 'url-visit' },
  ];

  const actions = [
    { key: 'Active', name: 'Active', result_type: 'text' },
    { key: 'Click', name: 'Click', result_type: 'disabled' },
    { key: 'Custom Select', name: 'Custom Select', result_type: 'select' },
    { key: 'Options Match', name: 'Options Match', result_type: 'array' },
    { key: 'Text Match', name: 'Text Match', result_type: 'text' },
    { key: 'Text Plain', name: 'Text Plain', result_type: 'text' },
    { key: 'URL', name: 'URL', result_type: 'select' },
    { key: 'Visible', name: 'Visible', result_type: 'bool' },
  ];

  const insertConfig = db.prepare(`
    INSERT INTO configuration_options (release_id, category, key, display_name, result_type, order_index)
    VALUES (NULL, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    types.forEach((t, i) => insertConfig.run('type', t.key, t.name, null, i));
    actions.forEach((a, i) => insertConfig.run('action', a.key, a.name, a.result_type, i));
  });

  transaction();
  console.log('   - Seeded default configuration options');
}

/**
 * Verify migration was successful
 */
function verifyMigration(db: DatabaseInstance): void {
  interface CountResult {
    count: number;
  }

  const counts = {
    releases: (db.prepare('SELECT COUNT(*) as count FROM releases').get() as CountResult).count,
    testSets: (db.prepare('SELECT COUNT(*) as count FROM test_sets').get() as CountResult).count,
    testCases: (db.prepare('SELECT COUNT(*) as count FROM test_cases').get() as CountResult).count,
    testScenarios: (db.prepare('SELECT COUNT(*) as count FROM test_scenarios').get() as CountResult)
      .count,
    testSteps: (db.prepare('SELECT COUNT(*) as count FROM test_steps').get() as CountResult).count,
    configOptions: (
      db.prepare('SELECT COUNT(*) as count FROM configuration_options').get() as CountResult
    ).count,
  };

  console.log('   Verification counts:');
  console.log(`   - Releases: ${counts.releases}`);
  console.log(`   - Test Sets: ${counts.testSets}`);
  console.log(`   - Test Cases: ${counts.testCases}`);
  console.log(`   - Test Scenarios: ${counts.testScenarios}`);
  console.log(`   - Test Steps: ${counts.testSteps}`);
  console.log(`   - Config Options: ${counts.configOptions}`);
}

/**
 * Archive old database files
 */
function archiveOldDatabases(): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archiveSubdir = path.join(ARCHIVE_DIR, `migration-${timestamp}`);
  fs.mkdirSync(archiveSubdir, { recursive: true });

  // Archive registry database
  if (fs.existsSync(OLD_REGISTRY_DB_PATH)) {
    const filename = path.basename(OLD_REGISTRY_DB_PATH);
    fs.copyFileSync(OLD_REGISTRY_DB_PATH, path.join(archiveSubdir, filename));
    // Also copy WAL and SHM files if they exist
    if (fs.existsSync(OLD_REGISTRY_DB_PATH + '-wal')) {
      fs.copyFileSync(OLD_REGISTRY_DB_PATH + '-wal', path.join(archiveSubdir, filename + '-wal'));
    }
    if (fs.existsSync(OLD_REGISTRY_DB_PATH + '-shm')) {
      fs.copyFileSync(OLD_REGISTRY_DB_PATH + '-shm', path.join(archiveSubdir, filename + '-shm'));
    }
    console.log(`   - Archived ${filename}`);
  }

  // Archive release databases
  if (fs.existsSync(OLD_RELEASES_DB_DIR)) {
    const releasesArchiveDir = path.join(archiveSubdir, 'releases');
    fs.mkdirSync(releasesArchiveDir, { recursive: true });

    const files = fs.readdirSync(OLD_RELEASES_DB_DIR);
    for (const file of files) {
      const srcPath = path.join(OLD_RELEASES_DB_DIR, file);
      const destPath = path.join(releasesArchiveDir, file);
      if (fs.statSync(srcPath).isFile()) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
    console.log(`   - Archived ${files.length} release database files`);
  }

  console.log(`   - Archive location: ${archiveSubdir}`);
}

// Run migration
migrate().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
