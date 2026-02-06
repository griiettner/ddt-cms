-- ============================================
-- UAT DDT CMS - Aurora PostgreSQL Schema
-- ============================================
--
-- Execute this script in the 'uatcms' database:
--   psql -h <aurora-host> -U <user> -d uatcms -f aurora-schema.sql
--
-- ============================================

-- ============================================
-- RELEASES
-- ============================================
CREATE TABLE IF NOT EXISTS releases (
    id SERIAL PRIMARY KEY,
    release_number VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed', 'archived')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_releases_status ON releases(status);
CREATE INDEX IF NOT EXISTS idx_releases_number ON releases(release_number);

-- ============================================
-- CATEGORIES (Hierarchical)
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    tree_index VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_tree ON categories(tree_index);

-- ============================================
-- TEST SETS
-- ============================================
CREATE TABLE IF NOT EXISTS test_sets (
    id SERIAL PRIMARY KEY,
    release_id INTEGER NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_test_sets_release ON test_sets(release_id);
CREATE INDEX IF NOT EXISTS idx_test_sets_category ON test_sets(category_id);

-- ============================================
-- TEST CASES
-- ============================================
CREATE TABLE IF NOT EXISTS test_cases (
    id SERIAL PRIMARY KEY,
    release_id INTEGER NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
    test_set_id INTEGER NOT NULL REFERENCES test_sets(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_test_cases_release ON test_cases(release_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_test_set ON test_cases(test_set_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_order ON test_cases(test_set_id, order_index);

-- ============================================
-- TEST SCENARIOS
-- ============================================
CREATE TABLE IF NOT EXISTS test_scenarios (
    id SERIAL PRIMARY KEY,
    release_id INTEGER NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
    test_case_id INTEGER NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_test_scenarios_release ON test_scenarios(release_id);
CREATE INDEX IF NOT EXISTS idx_test_scenarios_test_case ON test_scenarios(test_case_id);
CREATE INDEX IF NOT EXISTS idx_test_scenarios_order ON test_scenarios(test_case_id, order_index);

-- ============================================
-- SELECT CONFIGS (Dropdown Options)
-- ============================================
CREATE TABLE IF NOT EXISTS select_configs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    options JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- MATCH CONFIGS (Assertion Options)
-- ============================================
CREATE TABLE IF NOT EXISTS match_configs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    options JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TEST STEPS
-- ============================================
CREATE TABLE IF NOT EXISTS test_steps (
    id SERIAL PRIMARY KEY,
    release_id INTEGER NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
    test_scenario_id INTEGER NOT NULL REFERENCES test_scenarios(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0,
    step_definition TEXT,
    type VARCHAR(100),
    element_id VARCHAR(500),
    action VARCHAR(100),
    action_result TEXT,
    select_config_id INTEGER REFERENCES select_configs(id) ON DELETE SET NULL,
    match_config_id INTEGER REFERENCES match_configs(id) ON DELETE SET NULL,
    required BOOLEAN DEFAULT true,
    expected_results TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_test_steps_release ON test_steps(release_id);
CREATE INDEX IF NOT EXISTS idx_test_steps_scenario ON test_steps(test_scenario_id);
CREATE INDEX IF NOT EXISTS idx_test_steps_order ON test_steps(test_scenario_id, order_index);

-- ============================================
-- CONFIGURATION OPTIONS (Per-Release)
-- ============================================
CREATE TABLE IF NOT EXISTS configuration_options (
    id SERIAL PRIMARY KEY,
    release_id INTEGER NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
    option_type VARCHAR(50) NOT NULL CHECK (option_type IN ('type', 'action')),
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    order_index INTEGER DEFAULT 0,
    result_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_config_options_release ON configuration_options(release_id);
CREATE INDEX IF NOT EXISTS idx_config_options_type ON configuration_options(release_id, option_type);

-- ============================================
-- ENVIRONMENT CONFIGS
-- ============================================
CREATE TABLE IF NOT EXISTS environment_configs (
    id SERIAL PRIMARY KEY,
    release_id INTEGER REFERENCES releases(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(release_id, name)
);

CREATE INDEX IF NOT EXISTS idx_env_configs_release ON environment_configs(release_id);

-- ============================================
-- REUSABLE CASES (Templates)
-- ============================================
CREATE TABLE IF NOT EXISTS reusable_cases (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- REUSABLE CASE STEPS
-- ============================================
CREATE TABLE IF NOT EXISTS reusable_case_steps (
    id SERIAL PRIMARY KEY,
    reusable_case_id INTEGER NOT NULL REFERENCES reusable_cases(id) ON DELETE CASCADE,
    scenario_name VARCHAR(255),
    order_index INTEGER DEFAULT 0,
    step_definition TEXT,
    type VARCHAR(100),
    element_id VARCHAR(500),
    action VARCHAR(100),
    action_result TEXT,
    required BOOLEAN DEFAULT true,
    expected_results TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reusable_steps_case ON reusable_case_steps(reusable_case_id);
CREATE INDEX IF NOT EXISTS idx_reusable_steps_order ON reusable_case_steps(reusable_case_id, order_index);

-- ============================================
-- TEST RUNS
-- ============================================
CREATE TABLE IF NOT EXISTS test_runs (
    id SERIAL PRIMARY KEY,
    release_id INTEGER NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
    test_set_id INTEGER NOT NULL REFERENCES test_sets(id) ON DELETE CASCADE,
    test_set_name VARCHAR(255),
    environment VARCHAR(100),
    base_url TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'passed', 'failed')),
    batch_id VARCHAR(100),
    duration_ms INTEGER,
    total_scenarios INTEGER DEFAULT 0,
    total_steps INTEGER DEFAULT 0,
    passed_steps INTEGER DEFAULT 0,
    failed_steps INTEGER DEFAULT 0,
    video_path TEXT,
    failed_details JSONB,
    executed_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_test_runs_release ON test_runs(release_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_test_set ON test_runs(test_set_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_batch ON test_runs(batch_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_status ON test_runs(status);

-- ============================================
-- TEST RUN STEPS (Results)
-- ============================================
CREATE TABLE IF NOT EXISTS test_run_steps (
    id SERIAL PRIMARY KEY,
    test_run_id INTEGER NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
    test_step_id INTEGER,
    scenario_id INTEGER,
    scenario_name VARCHAR(255),
    case_name VARCHAR(255),
    step_definition TEXT,
    expected_results TEXT,
    status VARCHAR(20) CHECK (status IN ('passed', 'failed', 'skipped')),
    error_message TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_test_run_steps_run ON test_run_steps(test_run_id);
CREATE INDEX IF NOT EXISTS idx_test_run_steps_status ON test_run_steps(status);

-- ============================================
-- AUDIT LOGS (Deferred - Later Phase)
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_eid VARCHAR(100),
    user_name VARCHAR(255),
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id INTEGER,
    resource_name VARCHAR(255),
    release_id INTEGER REFERENCES releases(id) ON DELETE SET NULL,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_eid);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_release ON audit_logs(release_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- ============================================
-- HELPER FUNCTION: Auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- TRIGGERS: Apply to all tables with updated_at
-- ============================================
DROP TRIGGER IF EXISTS update_releases_updated_at ON releases;
CREATE TRIGGER update_releases_updated_at BEFORE UPDATE ON releases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_test_sets_updated_at ON test_sets;
CREATE TRIGGER update_test_sets_updated_at BEFORE UPDATE ON test_sets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_test_cases_updated_at ON test_cases;
CREATE TRIGGER update_test_cases_updated_at BEFORE UPDATE ON test_cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_test_scenarios_updated_at ON test_scenarios;
CREATE TRIGGER update_test_scenarios_updated_at BEFORE UPDATE ON test_scenarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_test_steps_updated_at ON test_steps;
CREATE TRIGGER update_test_steps_updated_at BEFORE UPDATE ON test_steps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_config_options_updated_at ON configuration_options;
CREATE TRIGGER update_config_options_updated_at BEFORE UPDATE ON configuration_options
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_env_configs_updated_at ON environment_configs;
CREATE TRIGGER update_env_configs_updated_at BEFORE UPDATE ON environment_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_select_configs_updated_at ON select_configs;
CREATE TRIGGER update_select_configs_updated_at BEFORE UPDATE ON select_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_match_configs_updated_at ON match_configs;
CREATE TRIGGER update_match_configs_updated_at BEFORE UPDATE ON match_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reusable_cases_updated_at ON reusable_cases;
CREATE TRIGGER update_reusable_cases_updated_at BEFORE UPDATE ON reusable_cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reusable_case_steps_updated_at ON reusable_case_steps;
CREATE TRIGGER update_reusable_case_steps_updated_at BEFORE UPDATE ON reusable_case_steps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_test_runs_updated_at ON test_runs;
CREATE TRIGGER update_test_runs_updated_at BEFORE UPDATE ON test_runs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SCHEMA COMPLETE
-- ============================================
-- Total Tables: 15
--   - releases
--   - categories
--   - test_sets
--   - test_cases
--   - test_scenarios
--   - test_steps
--   - select_configs
--   - match_configs
--   - configuration_options
--   - environment_configs
--   - reusable_cases
--   - reusable_case_steps
--   - test_runs
--   - test_run_steps
--   - audit_logs
-- ============================================
