import { getRegistryDb } from './database.js';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

/**
 * Initializes the registry database schema
 */
export const initRegistrySchema = () => {
  const db = getRegistryDb();

  db.exec(`
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

    CREATE TABLE IF NOT EXISTS test_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      release_id INTEGER NOT NULL,
      test_set_id INTEGER,
      status VARCHAR(20) CHECK(status IN ('passed', 'failed', 'running')),
      executed_by VARCHAR(255),
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      duration_ms INTEGER DEFAULT 0,
      total_tests INTEGER DEFAULT 0,
      passed_tests INTEGER DEFAULT 0,
      failed_tests INTEGER DEFAULT 0,
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
  `);
};

/**
 * Initializes the schema for a specific release database
 * @param {string} dbPath 
 */
export const initReleaseSchema = (dbPath) => {
  const db = new Database(dbPath);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS test_sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      release_id INTEGER NOT NULL,
      category_id INTEGER,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by VARCHAR(255)
    );

    CREATE INDEX IF NOT EXISTS idx_test_sets_release ON test_sets(release_id);
    CREATE INDEX IF NOT EXISTS idx_test_sets_category ON test_sets(category_id);

    CREATE TABLE IF NOT EXISTS test_cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_set_id INTEGER NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (test_set_id) REFERENCES test_sets(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_test_cases_set ON test_cases(test_set_id);
    CREATE INDEX IF NOT EXISTS idx_test_cases_order ON test_cases(test_set_id, order_index);

    CREATE TABLE IF NOT EXISTS test_scenarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_case_id INTEGER NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (test_case_id) REFERENCES test_cases(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_test_scenarios_case ON test_scenarios(test_case_id);
    CREATE INDEX IF NOT EXISTS idx_test_scenarios_order ON test_scenarios(test_case_id, order_index);

    CREATE TABLE IF NOT EXISTS test_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      FOREIGN KEY (test_scenario_id) REFERENCES test_scenarios(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_test_steps_scenario ON test_steps(test_scenario_id);
    CREATE INDEX IF NOT EXISTS idx_test_steps_order ON test_steps(test_scenario_id, order_index);

    CREATE TABLE IF NOT EXISTS configuration_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category VARCHAR(50) NOT NULL CHECK(category IN ('type', 'action')),
      key VARCHAR(100) NOT NULL,
      display_name VARCHAR(255) NOT NULL,
      result_type VARCHAR(50),
      default_value TEXT,
      config_data TEXT,
      is_active BOOLEAN DEFAULT 1,
      order_index INTEGER NOT NULL DEFAULT 0,
      UNIQUE(category, key)
    );

    CREATE INDEX IF NOT EXISTS idx_config_category ON configuration_options(category, is_active);
  `);

  db.close();
};
