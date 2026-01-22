import { getDb } from './database.js';
import type { DatabaseInstance, TableColumnInfo } from '../types/index.js';

/**
 * Initializes the unified database schema
 * This schema combines all tables (formerly split between registry and release DBs)
 * into a single database with multi-tenancy via release_id foreign keys
 */
export const initSchema = (): void => {
  const db: DatabaseInstance = getDb();

  db.exec(`
    -- ================================
    -- Core Registry Tables
    -- ================================

    -- Releases table
    CREATE TABLE IF NOT EXISTS releases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      release_number VARCHAR(50) UNIQUE NOT NULL,
      description TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by VARCHAR(255),
      closed_at TIMESTAMP,
      closed_by VARCHAR(255),
      status VARCHAR(20) DEFAULT 'open' CHECK(status IN ('open', 'closed', 'archived'))
    );

    CREATE INDEX IF NOT EXISTS idx_releases_status ON releases(status);

    -- Test runs table
    CREATE TABLE IF NOT EXISTS test_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      release_id INTEGER NOT NULL,
      test_set_id INTEGER,
      test_set_name VARCHAR(255),
      status VARCHAR(20) CHECK(status IN ('passed', 'failed', 'running')),
      executed_by VARCHAR(255),
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      duration_ms INTEGER DEFAULT 0,
      total_scenarios INTEGER DEFAULT 0,
      total_steps INTEGER DEFAULT 0,
      passed_steps INTEGER DEFAULT 0,
      failed_steps INTEGER DEFAULT 0,
      failed_details TEXT,
      FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_test_runs_release ON test_runs(release_id);
    CREATE INDEX IF NOT EXISTS idx_test_runs_executed ON test_runs(executed_at DESC);

    -- Global reusable select box configurations (for Custom Select / URL actions)
    CREATE TABLE IF NOT EXISTS select_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(255) NOT NULL UNIQUE,
      options TEXT NOT NULL DEFAULT '[]',
      config_type VARCHAR(50) DEFAULT 'custom_select',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_select_configs_name ON select_configs(name);
    CREATE INDEX IF NOT EXISTS idx_select_configs_type ON select_configs(config_type);

    -- Global reusable match configurations (for Options Match action)
    CREATE TABLE IF NOT EXISTS match_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(255) NOT NULL UNIQUE,
      options TEXT NOT NULL DEFAULT '[]',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_match_configs_name ON match_configs(name);

    -- Categories for organizing test sets (Joomla-style tree structure)
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      path TEXT NOT NULL DEFAULT '',
      level INTEGER NOT NULL DEFAULT 0,
      lft INTEGER NOT NULL DEFAULT 0,
      rgt INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
    CREATE INDEX IF NOT EXISTS idx_categories_path ON categories(path);
    CREATE INDEX IF NOT EXISTS idx_categories_lft_rgt ON categories(lft, rgt);

    -- Reusable Cases (global templates that can be copied to any release)
    CREATE TABLE IF NOT EXISTS reusable_cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by VARCHAR(255),
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_reusable_cases_name ON reusable_cases(name);

    -- Steps for reusable cases
    CREATE TABLE IF NOT EXISTS reusable_case_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reusable_case_id INTEGER NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      step_definition TEXT,
      type VARCHAR(50),
      element_id VARCHAR(255),
      action VARCHAR(50),
      action_result TEXT,
      select_config_id INTEGER,
      match_config_id INTEGER,
      required BOOLEAN DEFAULT 0,
      expected_results TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reusable_case_id) REFERENCES reusable_cases(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_reusable_case_steps_case ON reusable_case_steps(reusable_case_id);
    CREATE INDEX IF NOT EXISTS idx_reusable_case_steps_order ON reusable_case_steps(reusable_case_id, order_index);

    -- ================================
    -- Release-Specific Tables (with release_id FK)
    -- ================================

    -- Test sets (formerly in per-release DBs)
    CREATE TABLE IF NOT EXISTS test_sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      release_id INTEGER NOT NULL,
      category_id INTEGER,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by VARCHAR(255),
      FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_test_sets_release ON test_sets(release_id);
    CREATE INDEX IF NOT EXISTS idx_test_sets_category ON test_sets(category_id);

    -- Test cases (formerly in per-release DBs)
    CREATE TABLE IF NOT EXISTS test_cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      release_id INTEGER NOT NULL,
      test_set_id INTEGER NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE,
      FOREIGN KEY (test_set_id) REFERENCES test_sets(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_test_cases_release ON test_cases(release_id);
    CREATE INDEX IF NOT EXISTS idx_test_cases_set ON test_cases(test_set_id);
    CREATE INDEX IF NOT EXISTS idx_test_cases_order ON test_cases(test_set_id, order_index);

    -- Test scenarios (formerly in per-release DBs)
    CREATE TABLE IF NOT EXISTS test_scenarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      release_id INTEGER NOT NULL,
      test_case_id INTEGER NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE,
      FOREIGN KEY (test_case_id) REFERENCES test_cases(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_test_scenarios_release ON test_scenarios(release_id);
    CREATE INDEX IF NOT EXISTS idx_test_scenarios_case ON test_scenarios(test_case_id);
    CREATE INDEX IF NOT EXISTS idx_test_scenarios_order ON test_scenarios(test_case_id, order_index);

    -- Test steps (formerly in per-release DBs)
    CREATE TABLE IF NOT EXISTS test_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      release_id INTEGER NOT NULL,
      test_scenario_id INTEGER NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      step_definition TEXT NOT NULL,
      type VARCHAR(50),
      element_id VARCHAR(255),
      action VARCHAR(50),
      action_result TEXT,
      select_config_id INTEGER,
      match_config_id INTEGER,
      required BOOLEAN DEFAULT 0,
      expected_results TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE,
      FOREIGN KEY (test_scenario_id) REFERENCES test_scenarios(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_test_steps_release ON test_steps(release_id);
    CREATE INDEX IF NOT EXISTS idx_test_steps_scenario ON test_steps(test_scenario_id);
    CREATE INDEX IF NOT EXISTS idx_test_steps_order ON test_steps(test_scenario_id, order_index);

    -- Configuration options (formerly in per-release DBs, now with optional release_id)
    -- NULL release_id = global defaults, value = release-specific override
    CREATE TABLE IF NOT EXISTS configuration_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      release_id INTEGER,
      category VARCHAR(50) NOT NULL CHECK(category IN ('type', 'action')),
      key VARCHAR(100) NOT NULL,
      display_name VARCHAR(255) NOT NULL,
      result_type VARCHAR(50),
      default_value TEXT,
      config_data TEXT,
      is_active BOOLEAN DEFAULT 1,
      order_index INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE,
      UNIQUE(release_id, category, key)
    );

    CREATE INDEX IF NOT EXISTS idx_config_category ON configuration_options(category, is_active);
    CREATE INDEX IF NOT EXISTS idx_config_release ON configuration_options(release_id);

    -- ================================
    -- Audit Logs Table
    -- ================================

    -- Audit logs for tracking user actions
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      user_eid VARCHAR(255) NOT NULL,
      user_name VARCHAR(255),
      action VARCHAR(50) NOT NULL,
      resource_type VARCHAR(100) NOT NULL,
      resource_id INTEGER,
      resource_name VARCHAR(255),
      release_id INTEGER,
      details TEXT,
      ip_address VARCHAR(45),
      user_agent TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_eid);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_release ON audit_logs(release_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

    -- ================================
    -- Playwright Test Execution Tables
    -- ================================

    -- Environment configurations for test execution
    CREATE TABLE IF NOT EXISTS environment_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      release_id INTEGER,
      environment VARCHAR(50) NOT NULL,
      value TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE,
      UNIQUE(release_id, environment)
    );

    CREATE INDEX IF NOT EXISTS idx_environment_configs_release ON environment_configs(release_id);
    CREATE INDEX IF NOT EXISTS idx_environment_configs_env ON environment_configs(environment);

    -- Detailed step results for test runs
    CREATE TABLE IF NOT EXISTS test_run_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_run_id INTEGER NOT NULL,
      test_step_id INTEGER NOT NULL,
      scenario_id INTEGER NOT NULL,
      scenario_name VARCHAR(255),
      case_name VARCHAR(255),
      step_definition TEXT,
      status VARCHAR(20) CHECK(status IN ('passed', 'failed', 'skipped')),
      error_message TEXT,
      duration_ms INTEGER DEFAULT 0,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_test_run_steps_run ON test_run_steps(test_run_id);
    CREATE INDEX IF NOT EXISTS idx_test_run_steps_scenario ON test_run_steps(scenario_id);
    CREATE INDEX IF NOT EXISTS idx_test_run_steps_status ON test_run_steps(status);
  `);

  // Run migrations to ensure schema is up to date
  runMigrations(db);
};

/**
 * Run migrations to update schema for existing databases
 */
const runMigrations = (db: DatabaseInstance): void => {
  try {
    // Migration: Add new columns to test_runs if they don't exist
    const testRunsColumns = db.prepare('PRAGMA table_info(test_runs)').all() as TableColumnInfo[];
    const testRunsColumnNames: string[] = testRunsColumns.map((c) => c.name);

    if (!testRunsColumnNames.includes('test_set_name')) {
      db.exec('ALTER TABLE test_runs ADD COLUMN test_set_name VARCHAR(255)');
    }
    if (!testRunsColumnNames.includes('total_scenarios')) {
      db.exec('ALTER TABLE test_runs ADD COLUMN total_scenarios INTEGER DEFAULT 0');
    }
    if (!testRunsColumnNames.includes('total_steps')) {
      db.exec('ALTER TABLE test_runs ADD COLUMN total_steps INTEGER DEFAULT 0');
    }
    if (!testRunsColumnNames.includes('passed_steps')) {
      db.exec('ALTER TABLE test_runs ADD COLUMN passed_steps INTEGER DEFAULT 0');
    }
    if (!testRunsColumnNames.includes('failed_steps')) {
      db.exec('ALTER TABLE test_runs ADD COLUMN failed_steps INTEGER DEFAULT 0');
    }
    if (!testRunsColumnNames.includes('failed_details')) {
      db.exec('ALTER TABLE test_runs ADD COLUMN failed_details TEXT');
    }

    // Migration: Add release_id to test_cases if not present (for legacy data)
    const testCasesColumns = db.prepare('PRAGMA table_info(test_cases)').all() as TableColumnInfo[];
    const testCasesColumnNames: string[] = testCasesColumns.map((c) => c.name);

    if (!testCasesColumnNames.includes('release_id')) {
      db.exec('ALTER TABLE test_cases ADD COLUMN release_id INTEGER');
      db.exec('CREATE INDEX IF NOT EXISTS idx_test_cases_release ON test_cases(release_id)');
    }

    // Migration: Add release_id to test_scenarios if not present
    const testScenariosColumns = db
      .prepare('PRAGMA table_info(test_scenarios)')
      .all() as TableColumnInfo[];
    const testScenariosColumnNames: string[] = testScenariosColumns.map((c) => c.name);

    if (!testScenariosColumnNames.includes('release_id')) {
      db.exec('ALTER TABLE test_scenarios ADD COLUMN release_id INTEGER');
      db.exec(
        'CREATE INDEX IF NOT EXISTS idx_test_scenarios_release ON test_scenarios(release_id)'
      );
    }

    // Migration: Add release_id to test_steps if not present
    const testStepsColumns = db.prepare('PRAGMA table_info(test_steps)').all() as TableColumnInfo[];
    const testStepsColumnNames: string[] = testStepsColumns.map((c) => c.name);

    if (!testStepsColumnNames.includes('release_id')) {
      db.exec('ALTER TABLE test_steps ADD COLUMN release_id INTEGER');
      db.exec('CREATE INDEX IF NOT EXISTS idx_test_steps_release ON test_steps(release_id)');
    }

    // Migration: Add release_id to configuration_options if not present
    const configColumns = db
      .prepare('PRAGMA table_info(configuration_options)')
      .all() as TableColumnInfo[];
    const configColumnNames: string[] = configColumns.map((c) => c.name);

    if (!configColumnNames.includes('release_id')) {
      db.exec('ALTER TABLE configuration_options ADD COLUMN release_id INTEGER');
      db.exec('CREATE INDEX IF NOT EXISTS idx_config_release ON configuration_options(release_id)');
    }

    // Migration: Add environment column to test_runs if not present (for Playwright execution)
    if (!testRunsColumnNames.includes('environment')) {
      db.exec('ALTER TABLE test_runs ADD COLUMN environment VARCHAR(50)');
    }

    // Migration: Add base_url column to test_runs if not present
    if (!testRunsColumnNames.includes('base_url')) {
      db.exec('ALTER TABLE test_runs ADD COLUMN base_url TEXT');
    }
  } catch (err) {
    const error = err as Error;
    console.error('Migration warning (non-fatal):', error.message);
  }
};

/**
 * @deprecated Use initSchema() instead - this is kept for backward compatibility
 */
export const initRegistrySchema = (): void => {
  initSchema();
};

/**
 * @deprecated No longer needed - release data is now in the unified database
 */
export const initReleaseSchema = (_dbPath: string): void => {
  console.warn('initReleaseSchema is deprecated - using unified schema');
  initSchema();
};
