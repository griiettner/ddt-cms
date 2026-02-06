# New Architecture - Distributed Services

## Overview

This document describes the architectural transition from a monolithic Docker container to a serverless distributed service model with three independent components.

**Related Documents:**
- [E1TS Adaptation Proposal](./E1TS_ADAPTATION.md) - Detailed implementation guide for E1TS migration

**Infrastructure Summary:**

- **CMS** → AWS Lambda (serverless)
- **7PS** → Ephemeral service (managed by platform team)
- **E1TS** → Separate repository (cloned on-demand by 7PS)

---

## Architecture Comparison

### Current Architecture (Monolithic)

```
┌───────────────────────────────────────────────────────────────┐
│                    Single Docker Container                    │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                     CMS Application                      │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │ │
│  │  │   React UI   │  │  Express API │  │  SQLite DB   │    │ │
│  │  └──────────────┘  └──────┬───────┘  └──────────────┘    │ │
│  │                           │                              │ │
│  │  ┌────────────────────────▼────────────────────────────┐ │ │
│  │  │              Test Execution Engine                  │ │ │
│  │  │  • testExecutionQueue.ts (single)                   │ │ │
│  │  │  • parallelTestExecution.ts (7PS batch)             │ │ │
│  │  │  • tests/runner.ts (Playwright)                     │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

**Characteristics:**

- Everything runs in one container
- Internal API calls between components
- SQLite database (local file)
- Test runner spawned as child process
- Direct file system access for reports/videos

**Communication:**

- runner.ts outputs PROGRESS:{json} for real-time updates
- runner.ts outputs RESULT:{json} for final results
- Parent process parses stdout for status tracking
- Results saved to SQLite after execution

**Key Files:**

- server/services/testExecutionQueue.ts
- server/services/parallelTestExecution.ts
- tests/runner.ts
- tests/fixtures/actionHandlers.ts
- scripts/run-7ps.sh

---

### New Architecture (Distributed Serverless)

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                              AWS Infrastructure                                │
│                                                                                │
│  ┌─────────────────────┐     ┌─────────────────────┐     ┌──────────────────┐  │
│  │        CMS          │     │        7PS          │     │      E1TS        │  │
│  │    (AWS Lambda)     │     │   (Ephemeral Svc)   │     │ (Separate Repo)  │  │
│  │                     │     │                     │     │                  │  │
│  │  • React UI (S3)    │     │  • Receives POST    │     │  • Playwright    │  │
│  │  • Express API (λ)  │     │  • Clones E1TS repo │     │  • Reads Aurora  │  │
│  │  • Test Management  │     │  • Runs tests       │     │  • Generates     │  │
│  │                     │     │  • Spins up/down    │     │    reports       │  │
│  └──────────┬──────────┘     └──────────┬──────────┘     └────────┬─────────┘  │
│             │                           │                         │            │
│             │    1 POST (JSON+YAML)     │    2 Clone & Run        │            │
│             └──────────────────────────►│◄────────────────────────┘            │
│             │                           │                         │            │
│             │    5 Poll Status/Results  │    3 Read Test Data     │            │
│             │◄──────────────────────────┤                         │            │
│             │                           │                         │            │
│  ┌──────────▼───────────────────────────┴─────────────────────────▼─────────┐  │
│  │                        Aurora PostgreSQL                                 │  │
│  │                     (Shared Database - uatcms)                           │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

**No Docker containers in the new architecture.** All services are serverless or ephemeral.

**Data Flow:**

```
1 CMS sends POST to 7PS with JSON payload (contains YAML configuration)
2 7PS clones E1TS repository and runs test commands
3 E1TS reads test data directly from Aurora PostgreSQL
4 E1TS executes Playwright tests and generates Cucumber reports
5 CMS polls 7PS for status and retrieves results
```

**Key Changes (No Docker)**

- CMS → AWS Lambda (serverless)
- 7PS → Ephemeral service (spins up/down on demand)
- E1TS → Separate repo (cloned fresh each run)
- Aurora → Shared database (replaces SQLite)

---

## Component Specifications

### 1. CMS (UAT Data-Driven Testing CMS)

**Repository:** Current repository (quizzical-hypatia)

**Deployment:** AWS Lambda (serverless)

- React UI served from S3 + CloudFront
- Express API runs as Lambda function (via API Gateway)
- No Docker containers

**Responsibilities:**

- Test case management (releases, test sets, cases, scenarios, steps)
- Configuration management (types, actions, environments)
- User interface for test authoring
- Trigger test execution via 7PS API
- Poll for test results
- Display test reports

**Database Access:** Aurora PostgreSQL (read/write)

**Changes Required:**

- Replace SQLite with PostgreSQL client
- Remove internal test execution (`testExecutionQueue.ts`, `parallelTestExecution.ts`)
- Add 7PS API integration (POST to trigger, GET to poll)
- Remove `tests/` folder (moves to E1TS)
- Configure for Lambda deployment (serverless framework or SAM)

---

### 2. 7PS (7 Parallel Sets - External Testing Framework)

**Repository:** External (managed by platform team)

**Deployment:** Ephemeral Service

- Spins up on-demand when CMS triggers execution
- Spins down after test completion
- No persistent infrastructure
- Managed entirely by platform team

**Responsibilities:**

- Receive test execution requests from CMS
- Clone and run E1TS repository
- Execute test commands from YAML configuration
- Provide status polling endpoint
- Return test results

**Database Access:** None (stateless execution)

**API Endpoints (consumed by CMS):**

- `POST /execute` - Start test execution
- `GET /status/:executionId` - Poll execution status
- `GET /results/:executionId` - Retrieve test results

---

### 3. E1TS (E1 Testing Suite)

**Repository:** Separate repository (`cof-primary/ExceptionsOne-E1TS`)

- Completely independent from CMS repository
- Cloned fresh by 7PS for each test execution
- No Docker - runs in 7PS ephemeral environment

**Responsibilities:**

- Playwright test runner
- Direct database queries to Aurora PostgreSQL
- Generate Cucumber/BDD reports
- Same test execution logic as current `tests/runner.ts`

**Database Access:** Aurora PostgreSQL (read for test data, write for test results)

- **READ**: `releases`, `test_sets`, `test_cases`, `test_scenarios`, `test_steps`, `configuration_options`, `environment_configs`
- **WRITE**: `test_runs`, `test_run_steps`

**Key Difference from Current Runner:**
| Aspect | Current `runner.ts` | New E1TS |
|--------|---------------------|----------|
| Test Data Source | CMS API (`/api/test-generation`) | Direct Aurora DB queries |
| Invocation | Child process spawn | Cloned & run by 7PS |
| Configuration | Environment variables | YAML args from 7PS |
| Location | Same container as CMS | Separate repository |

---

## Database Migration: SQLite → Aurora PostgreSQL

### PostgreSQL DDL Script

The following DDL creates all tables in Aurora PostgreSQL. Execute this in the `uatcms` database.

```sql
-- ============================================
-- UAT DDT CMS - Aurora PostgreSQL Schema
-- ============================================

-- Enable UUID extension if needed
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- RELEASES
-- ============================================
CREATE TABLE releases (
    id SERIAL PRIMARY KEY,
    release_number VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed', 'archived')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_releases_status ON releases(status);
CREATE INDEX idx_releases_number ON releases(release_number);

-- ============================================
-- CATEGORIES (Hierarchical)
-- ============================================
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    tree_index VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_tree ON categories(tree_index);

-- ============================================
-- TEST SETS
-- ============================================
CREATE TABLE test_sets (
    id SERIAL PRIMARY KEY,
    release_id INTEGER NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_test_sets_release ON test_sets(release_id);
CREATE INDEX idx_test_sets_category ON test_sets(category_id);

-- ============================================
-- TEST CASES
-- ============================================
CREATE TABLE test_cases (
    id SERIAL PRIMARY KEY,
    release_id INTEGER NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
    test_set_id INTEGER NOT NULL REFERENCES test_sets(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_test_cases_release ON test_cases(release_id);
CREATE INDEX idx_test_cases_test_set ON test_cases(test_set_id);
CREATE INDEX idx_test_cases_order ON test_cases(test_set_id, order_index);

-- ============================================
-- TEST SCENARIOS
-- ============================================
CREATE TABLE test_scenarios (
    id SERIAL PRIMARY KEY,
    release_id INTEGER NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
    test_case_id INTEGER NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_test_scenarios_release ON test_scenarios(release_id);
CREATE INDEX idx_test_scenarios_test_case ON test_scenarios(test_case_id);
CREATE INDEX idx_test_scenarios_order ON test_scenarios(test_case_id, order_index);

-- ============================================
-- SELECT CONFIGS (Dropdown Options)
-- ============================================
CREATE TABLE select_configs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    options JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- MATCH CONFIGS (Assertion Options)
-- ============================================
CREATE TABLE match_configs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    options JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TEST STEPS
-- ============================================
CREATE TABLE test_steps (
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

CREATE INDEX idx_test_steps_release ON test_steps(release_id);
CREATE INDEX idx_test_steps_scenario ON test_steps(test_scenario_id);
CREATE INDEX idx_test_steps_order ON test_steps(test_scenario_id, order_index);

-- ============================================
-- CONFIGURATION OPTIONS (Per-Release)
-- ============================================
CREATE TABLE configuration_options (
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

CREATE INDEX idx_config_options_release ON configuration_options(release_id);
CREATE INDEX idx_config_options_type ON configuration_options(release_id, option_type);

-- ============================================
-- ENVIRONMENT CONFIGS
-- ============================================
CREATE TABLE environment_configs (
    id SERIAL PRIMARY KEY,
    release_id INTEGER REFERENCES releases(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(release_id, name)
);

CREATE INDEX idx_env_configs_release ON environment_configs(release_id);

-- ============================================
-- REUSABLE CASES (Templates)
-- ============================================
CREATE TABLE reusable_cases (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- REUSABLE CASE STEPS
-- ============================================
CREATE TABLE reusable_case_steps (
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

CREATE INDEX idx_reusable_steps_case ON reusable_case_steps(reusable_case_id);
CREATE INDEX idx_reusable_steps_order ON reusable_case_steps(reusable_case_id, order_index);

-- ============================================
-- TEST RUNS
-- ============================================
CREATE TABLE test_runs (
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

CREATE INDEX idx_test_runs_release ON test_runs(release_id);
CREATE INDEX idx_test_runs_test_set ON test_runs(test_set_id);
CREATE INDEX idx_test_runs_batch ON test_runs(batch_id);
CREATE INDEX idx_test_runs_status ON test_runs(status);

-- ============================================
-- TEST RUN STEPS (Results)
-- ============================================
CREATE TABLE test_run_steps (
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

CREATE INDEX idx_test_run_steps_run ON test_run_steps(test_run_id);
CREATE INDEX idx_test_run_steps_status ON test_run_steps(status);

-- ============================================
-- AUDIT LOGS (Deferred - Later Phase)
-- ============================================
CREATE TABLE audit_logs (
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

CREATE INDEX idx_audit_logs_user ON audit_logs(user_eid);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_release ON audit_logs(release_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_releases_updated_at BEFORE UPDATE ON releases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_sets_updated_at BEFORE UPDATE ON test_sets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_cases_updated_at BEFORE UPDATE ON test_cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_scenarios_updated_at BEFORE UPDATE ON test_scenarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_steps_updated_at BEFORE UPDATE ON test_steps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_config_options_updated_at BEFORE UPDATE ON configuration_options
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_env_configs_updated_at BEFORE UPDATE ON environment_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_select_configs_updated_at BEFORE UPDATE ON select_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_match_configs_updated_at BEFORE UPDATE ON match_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reusable_cases_updated_at BEFORE UPDATE ON reusable_cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reusable_case_steps_updated_at BEFORE UPDATE ON reusable_case_steps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_runs_updated_at BEFORE UPDATE ON test_runs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Key Differences from SQLite

| Feature            | SQLite                | PostgreSQL           |
| ------------------ | --------------------- | -------------------- |
| Auto-increment     | `INTEGER PRIMARY KEY` | `SERIAL PRIMARY KEY` |
| Boolean            | `INTEGER (0/1)`       | `BOOLEAN`            |
| JSON               | `TEXT`                | `JSONB`              |
| Timestamp default  | `CURRENT_TIMESTAMP`   | `CURRENT_TIMESTAMP`  |
| Placeholder syntax | `?`                   | `$1, $2, $3...`      |
| Case sensitivity   | Case-insensitive      | Case-sensitive       |

---

## 7PS Integration

### Integration Model

7PS (7 Parallel Sets) is Capital One's testing platform that integrates with One Pipeline. There are two ways to trigger E1TS execution:

1. **One Pipeline Integration** (Primary): 7PS reads `test_config.yml` from the E1TS repository and runs tests as part of the CI/CD pipeline during `live_dependency_tests` stage.

2. **API Trigger** (Secondary): CMS can trigger on-demand test execution via 7PS API for ad-hoc testing.

### Test Type Selection

| Test Type | Use Case | Dependencies |
|-----------|----------|--------------|
| `component_tests` | Isolated testing with mocked services (Mimeo, wiremock) | LocalStack, Docker Compose |
| `live_dependency_tests` | E2E testing with real systems | Real Aurora DB, Real ExceptionsOne UI |

E1TS uses **`live_dependency_tests`** because it requires real dependent systems.

### POST Payload Format (API Trigger)

CMS sends this JSON to 7PS to trigger test execution:

```json
{
  "testType": "live_dependency_tests",
  "environment": "dev",
  "buildId": "build-123",
  "artifactId": "artifact-456",
  "repoUrl": "https://github.com/cof-primary/ExceptionsOne-UAT-CMS",
  "commitSha": "abc123def456",
  "testConfiguration": "name: ExceptionsOne-E1TS\nasv: EXCEPTIONSONE\nba: BAEXCEPTIONSONE\ncomponent: E1 TEST AUTOMATION\nowner: dev.exceptionsone@capitalone.com\n\ntest_location:\n  repo_path: cof-primary/ExceptionsOne-E1TS\n  repo_branch: main\n\nlive_dependency_tests:\n  - dev:\n      testSets:\n        - testSetName: e1ts-live-dependency-dev\n          testType: live_dependency\n          testAgentType: nodejs\n          testAgentRuntimeVersion: \"22\"\n          testFramework: playwright\n          testReportingType: cucumber\n          testRunner: npm\n          workingDirectory: .\n          testReportLocation: ./report\n          testSetDisabled: false\n          testAgentExecutionCommands:\n            - npm ci --legacy-peer-deps\n            - npx playwright install chromium\n            - npm run test:e1ts\n          args:\n            NODE_ENV: dev\n            BASE_URL: https://exceptionsone-ui-dev.clouddgt.capitalone.com/v2/\n            DB_HOST: aurora-cluster.xxxxx.us-east-1.rds.amazonaws.com\n            DB_NAME: uatcms\n            DB_PORT: \"5432\"\n            CI: \"true\"\n            RELEASE_ID: \"5\"\n            TEST_SET_ID: \"12\"",
  "args": {},
  "secrets": {
    "DB_USER": "xxxxx",
    "DB_PASSWORD": "xxxxx"
  },
  "version": 2
}
```

### YAML Configuration Breakdown

```yaml
name: ExceptionsOne-E1TS
asv: EXCEPTIONSONE
ba: BAEXCEPTIONSONE
component: E1 TEST AUTOMATION
owner: dev.exceptionsone@capitalone.com

test_location:
  repo_path: cof-primary/ExceptionsOne-E1TS # E1TS repository
  repo_branch: main

# Use live_dependency_tests because E1TS tests with real systems:
# - Real ExceptionsOne application (not mocked)
# - Real Aurora PostgreSQL database
# - Real UI interactions via Playwright
live_dependency_tests:
  - dev: # Environment
      testSets:
        - testSetName: e1ts-live-dependency-dev # Label for 7PS
          testType: live_dependency # Tests with real dependent systems
          testAgentType: nodejs
          testAgentRuntimeVersion: '22'
          testFramework: playwright
          testReportingType: cucumber
          testRunner: npm
          workingDirectory: .
          testReportLocation: ./report # Where Cucumber reports go
          testSetDisabled: false
          testAgentExecutionCommands:
            - npm ci --legacy-peer-deps
            - npx playwright install chromium # Required for Playwright
            - npm run test:e1ts # E1TS entry point
          args:
            NODE_ENV: dev
            BASE_URL: https://exceptionsone-ui-dev.clouddgt.capitalone.com/v2/
            DB_HOST: aurora-cluster.xxxxx.rds.amazonaws.com
            DB_NAME: uatcms
            DB_PORT: '5432'
            CI: 'true'
            RELEASE_ID: '5' # Optional: specific release
            TEST_SET_ID: '12' # Optional: specific test set
```

> **Note**: We use `live_dependency_tests` instead of `component_tests` because E1TS requires real dependent systems (Aurora DB, ExceptionsOne UI). Component tests use mocked dependencies via Mimeo/wiremock.

### CMS Integration Code (Pseudocode)

```typescript
// server/services/sevenPSClient.ts

interface SevenPSExecutionRequest {
  testType: string;
  environment: string;
  buildId: string;
  artifactId: string;
  repoUrl: string;
  commitSha: string;
  testConfiguration: string; // YAML as string
  args: Record<string, string>;
  secrets: Record<string, string>;
  version: number;
}

interface SevenPSExecutionResponse {
  executionId: string;
  statusUrl: string;
}

interface SevenPSStatus {
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
  message?: string;
}

class SevenPSClient {
  private baseUrl: string;

  async triggerExecution(request: SevenPSExecutionRequest): Promise<SevenPSExecutionResponse> {
    const response = await fetch(`${this.baseUrl}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return response.json();
  }

  async pollStatus(executionId: string): Promise<SevenPSStatus> {
    const response = await fetch(`${this.baseUrl}/status/${executionId}`);
    return response.json();
  }

  async getResults(executionId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/results/${executionId}`);
    return response.json();
  }
}
```

---

## E1TS Test Interface

### Required Files to Port from Current `tests/` Folder

The E1TS repository needs these components (adapted for direct DB access):

```
E1TS Repository Structure:
├── package.json
├── tsconfig.json
├── playwright.config.ts      # Playwright configuration
├── test_config.yml           # 7PS configuration
├── src/
│   ├── index.ts              # Entry point (npm run test:e1ts)
│   ├── data/
│   │   └── workflowData.json # Fallback static test data
│   ├── db/
│   │   ├── connection.ts     # PostgreSQL connection pool
│   │   ├── testDataFetcher.ts # Fetch test definitions from Aurora
│   │   └── resultWriter.ts   # Write results to test_runs table
│   ├── pages/
│   │   ├── index.ts          # Page object exports
│   │   ├── BasePage.ts       # Smart locators, helpers
│   │   ├── LoginPage.ts      # Authentication handling
│   │   ├── ImpersonationPage.ts # User switching
│   │   ├── CreationPage.ts   # Exception creation workflow
│   │   ├── ReviewPage.ts     # Review/approval workflow
│   │   └── ClosurePage.ts    # Closure workflow
│   ├── runner/
│   │   ├── testRunner.ts     # Test orchestration
│   │   ├── dynamicTestGenerator.ts # Generate tests from DB data
│   │   └── actionExecutor.ts # Map step actions to page methods
│   ├── reporter/
│   │   ├── cucumberReporter.ts # Cucumber JSON format for 7PS
│   │   └── progressReporter.ts # STDOUT progress for monitoring
│   ├── tests/
│   │   ├── e2e-workflow.spec.ts # Static E2E test (fallback)
│   │   └── dynamic.spec.ts   # DB-driven dynamic tests
│   ├── types/
│   │   └── testData.ts       # TypeScript interfaces
│   └── utils/
│       ├── index.ts          # Utility exports
│       ├── DatabaseUtil.ts   # PostgreSQL connection helpers
│       ├── DbValidator.ts    # Status validation methods
│       └── TestReporter.ts   # Custom reporting utilities
└── report/                   # Output directory for Cucumber JSON
```

### Key Code Changes: API → Direct DB

**Current (`tests/runner.ts`):**

```typescript
// Fetches from CMS API
const response = await fetch(
  `${API_BASE_URL}/api/test-generation/${testSetId}?releaseId=${releaseId}`
);
const testData = await response.json();
```

**New (`E1TS/src/db/testDataFetcher.ts`):**

```typescript
// Queries Aurora PostgreSQL directly
import { Pool } from 'pg';
import { TestData, TestSet, TestCase, TestScenario, TestStep } from '../types/testData';

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

export async function fetchTestData(releaseId?: number, testSetId?: number): Promise<TestData> {
  // Get release (or latest open release)
  const release = await getRelease(releaseId);

  // Get test sets for release
  const testSets = await getTestSets(release.id, testSetId);

  // For each test set, fetch cases, scenarios, steps
  for (const testSet of testSets) {
    testSet.testCases = await getTestCases(testSet.id);

    for (const testCase of testSet.testCases) {
      testCase.scenarios = await getTestScenarios(testCase.id);

      for (const scenario of testCase.scenarios) {
        scenario.steps = await getTestSteps(scenario.id);
      }
    }
  }

  // Get configuration options
  const configOptions = await getConfigurationOptions(release.id);
  const envConfigs = await getEnvironmentConfigs(release.id);

  return {
    release,
    testSets,
    configOptions,
    envConfigs,
  };
}

async function getRelease(releaseId?: number) {
  if (releaseId) {
    const result = await pool.query('SELECT * FROM releases WHERE id = $1', [releaseId]);
    if (result.rows.length === 0) throw new Error(`Release ${releaseId} not found`);
    return result.rows[0];
  }

  // Get latest open release
  const result = await pool.query(
    `SELECT * FROM releases WHERE status = 'open' ORDER BY created_at DESC LIMIT 1`
  );
  if (result.rows.length === 0) throw new Error('No active release found');
  return result.rows[0];
}

// ... additional query functions for test_sets, test_cases, test_scenarios, test_steps
```

### E1TS Entry Point

```typescript
// E1TS/src/index.ts

import { fetchTestData } from './db/testDataFetcher';
import { runTests } from './runner/testRunner';
import { writeTestResults } from './db/resultWriter';
import { generateCucumberReport } from './reporter/cucumberReporter';

async function main() {
  console.log('=== E1TS Test Runner ===');
  console.log(`Environment: ${process.env.NODE_ENV || 'dev'}`);
  console.log(`CI Mode: ${process.env.CI || 'false'}`);

  const releaseId = process.env.RELEASE_ID ? parseInt(process.env.RELEASE_ID) : undefined;
  const testSetId = process.env.TEST_SET_ID ? parseInt(process.env.TEST_SET_ID) : undefined;

  console.log(`Release ID: ${releaseId || 'latest'}`);
  console.log(`Test Set ID: ${testSetId || 'all'}`);

  try {
    // 1. Fetch test data from Aurora DB
    const testData = await fetchTestData(releaseId, testSetId);
    console.log(`Fetched ${testData.testSets.length} test sets`);

    // 2. Run Playwright tests
    const results = await runTests(testData);
    console.log(`Executed ${results.totalTests} tests`);

    // 3. Write results back to database
    await writeTestResults(results, releaseId, testSetId);

    // 4. Generate Cucumber report for 7PS consumption
    await generateCucumberReport(results, './report/cucumber.json');

    // Exit with appropriate code
    const exitCode = results.failed > 0 ? 1 : 0;
    console.log(`\n=== E1TS Complete ===`);
    console.log(`Passed: ${results.passed} | Failed: ${results.failed}`);
    process.exit(exitCode);
  } catch (error) {
    console.error('E1TS Error:', error);
    process.exit(1);
  }
}

main();
```

---

## CMS Changes Summary

### Files to Modify

| File                         | Change                                                             |
| ---------------------------- | ------------------------------------------------------------------ |
| `package.json`               | Replace `@libsql/client` with `pg`                                 |
| `server/db/config.ts`        | PostgreSQL connection pool                                         |
| `server/db/database.ts`      | Update query placeholder syntax (`?` → `$1`)                       |
| `server/routes/*.ts`         | Update all SQL queries for PostgreSQL                              |
| `server/routes/test-runs.ts` | Replace internal execution with 7PS API calls                      |
| `.env`                       | Add `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `SEVEN_PS_URL` |

### Files to Remove

| File/Folder                                | Reason                   |
| ------------------------------------------ | ------------------------ |
| `tests/`                                   | Moves to E1TS repository |
| `server/services/testExecutionQueue.ts`    | No longer needed         |
| `server/services/parallelTestExecution.ts` | No longer needed         |
| `scripts/run-7ps.sh`                       | CLI moves to E1TS        |

### New Files to Create

| File                               | Purpose                        |
| ---------------------------------- | ------------------------------ |
| `server/services/sevenPSClient.ts` | 7PS API integration            |
| `server/routes/seven-ps.ts`        | New routes for 7PS interaction |

---

## Deferred Items

The following features are postponed for later phases:

| Feature            | Current State  | Reason                                  |
| ------------------ | -------------- | --------------------------------------- |
| Video Recording    | Stored locally | Need to determine 7PS artifact handling |
| Screenshots        | Stored locally | Need to determine 7PS artifact handling |
| Real-time Progress | STDOUT parsing | 7PS may not support live progress       |

> **Note**: Cucumber JSON reporting is now implemented in E1TS via `cucumberReporter.ts`. Reports are generated to `./report/cucumber.json` and consumed by 7PS.

---

## Migration Checklist

### Phase 1: Database Migration

- [ ] Create `uatcms` database in Aurora cluster
- [ ] Execute PostgreSQL DDL script
- [ ] Export data from SQLite
- [ ] Import data to Aurora PostgreSQL
- [ ] Update CMS to use PostgreSQL client
- [ ] Update all SQL queries (placeholder syntax)
- [ ] Test all CRUD operations

### Phase 2: E1TS Development

- [ ] Create E1TS repository (`cof-primary/ExceptionsOne-E1TS`)
- [ ] Set up project structure (pages/, db/, runner/, reporter/, types/, utils/)
- [ ] Implement `testDataFetcher.ts` - Direct Aurora DB queries
- [ ] Implement `resultWriter.ts` - Write to test_runs table
- [ ] Implement `cucumberReporter.ts` - Cucumber JSON for 7PS
- [ ] Create `npm run test:e1ts` entry point
- [ ] Configure `test_config.yml` for 7PS live_dependency_tests
- [ ] Test locally with Aurora connection

### Phase 3: CMS Integration

- [ ] Implement `sevenPSClient.ts`
- [ ] Update `test-runs.ts` routes
- [ ] Add 7PS execution trigger
- [ ] Add status polling endpoint
- [ ] Add results retrieval
- [ ] Remove old test execution code

### Phase 4: Testing & Deployment

- [ ] End-to-end testing with 7PS
- [ ] Update CI/CD pipelines
- [ ] Deploy CMS to production
- [ ] Verify E1TS in 7PS environment
- [ ] Monitor and troubleshoot

---

## Questions for Platform Team

1. **7PS API Authentication** - How does CMS authenticate to 7PS? (API key, OAuth, etc.)
2. **7PS Results Format** - What is the exact JSON structure of test results?
3. **7PS Status Polling** - What is the recommended polling interval?
4. **7PS Artifact Access** - How do we retrieve videos/screenshots from 7PS?
5. **7PS Timeout** - What is the maximum test execution duration?
6. **E1TS Secrets** - How are DB credentials passed securely through 7PS?
