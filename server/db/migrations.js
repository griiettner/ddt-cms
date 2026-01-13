/**
 * Database Migrations
 * Creates all tables for the CMS DDT system
 */

const { db, runMigration } = require('./database');

const SCHEMA_VERSION = 1;

/**
 * Main migration SQL - creates all tables
 */
const MIGRATION_SQL = `
-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Releases table
CREATE TABLE IF NOT EXISTS releases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  release_number VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK(status IN ('active', 'archived')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(100) NOT NULL,
  archived_at TIMESTAMP,
  archived_by VARCHAR(100)
);

-- Test Sets table
CREATE TABLE IF NOT EXISTS test_sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  release_id INTEGER NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(100) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE
);

-- Test Cases table (Accordions)
CREATE TABLE IF NOT EXISTS test_cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  test_set_id INTEGER NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(100) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (test_set_id) REFERENCES test_sets(id) ON DELETE CASCADE
);

-- Test Steps table (Rows in the table - 7 columns)
CREATE TABLE IF NOT EXISTS test_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  test_case_id INTEGER NOT NULL,
  order_index INTEGER DEFAULT 0,
  step_definition TEXT,
  type VARCHAR(50),
  element_id VARCHAR(100),
  action VARCHAR(50),
  action_result TEXT,
  required BOOLEAN DEFAULT 0,
  expected_results TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(100),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(100),
  FOREIGN KEY (test_case_id) REFERENCES test_cases(id) ON DELETE CASCADE
);

-- Configuration Options table (Types and Actions)
CREATE TABLE IF NOT EXISTS configuration_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category VARCHAR(20) NOT NULL CHECK(category IN ('type', 'action')),
  key VARCHAR(50) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  result_type VARCHAR(20) CHECK(result_type IN ('bool', 'text', 'select', 'disable', 'array', 'url')),
  default_value TEXT,
  config_data TEXT,
  is_active BOOLEAN DEFAULT 1,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(category, key)
);

-- Test Runs table (Execution history)
CREATE TABLE IF NOT EXISTS test_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  release_id INTEGER NOT NULL,
  test_set_id INTEGER,
  status VARCHAR(20) DEFAULT 'running' CHECK(status IN ('passed', 'failed', 'running', 'cancelled')),
  executed_by VARCHAR(100) NOT NULL,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  total_tests INTEGER DEFAULT 0,
  passed_tests INTEGER DEFAULT 0,
  failed_tests INTEGER DEFAULT 0,
  execution_log TEXT,
  FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE,
  FOREIGN KEY (test_set_id) REFERENCES test_sets(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_releases_status ON releases(status);
CREATE INDEX IF NOT EXISTS idx_test_sets_release ON test_sets(release_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_test_set ON test_cases(test_set_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_order ON test_cases(test_set_id, order_index);
CREATE INDEX IF NOT EXISTS idx_test_steps_test_case ON test_steps(test_case_id);
CREATE INDEX IF NOT EXISTS idx_test_steps_order ON test_steps(test_case_id, order_index);
CREATE INDEX IF NOT EXISTS idx_config_category ON configuration_options(category, is_active);
CREATE INDEX IF NOT EXISTS idx_test_runs_release ON test_runs(release_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_executed ON test_runs(executed_at DESC);
`;

/**
 * Run all migrations
 */
function migrate() {
  console.log('Starting database migrations...');

  // Check current schema version
  try {
    const versionRow = db.prepare('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1').get();
    if (versionRow && versionRow.version >= SCHEMA_VERSION) {
      console.log(`Database already at version ${versionRow.version}`);
      return true;
    }
  } catch (error) {
    console.log('Schema version table does not exist yet, creating...');
  }

  // Run migration
  const success = runMigration(MIGRATION_SQL);

  if (success) {
    // Update schema version
    const stmt = db.prepare('INSERT OR REPLACE INTO schema_version (version) VALUES (?)');
    stmt.run(SCHEMA_VERSION);
    console.log(`Database migrated to version ${SCHEMA_VERSION}`);
  }

  return success;
}

/**
 * Drop all tables (for testing/reset)
 */
function dropAll() {
  console.log('Dropping all tables...');
  const tables = [
    'test_runs',
    'test_steps',
    'test_cases',
    'test_sets',
    'releases',
    'configuration_options',
    'schema_version'
  ];

  tables.forEach(table => {
    try {
      db.prepare(`DROP TABLE IF EXISTS ${table}`).run();
      console.log(`Dropped table: ${table}`);
    } catch (error) {
      console.error(`Error dropping ${table}:`, error.message);
    }
  });
}

// Run migrations if this file is executed directly
if (require.main === module) {
  migrate();
  console.log('Migration complete. Database is ready.');
  process.exit(0);
}

module.exports = {
  migrate,
  dropAll,
  SCHEMA_VERSION
};
