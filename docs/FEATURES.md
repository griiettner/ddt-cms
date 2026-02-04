# UAT Data-Driven Testing CMS - Features

## Overview

A comprehensive test case management system (CMS) for Data-Driven Testing (DDT) in UAT environments. Built with React, Express, Playwright, and SQLite.

---

## Release Management

- Create, edit, and delete releases
- Status lifecycle: **Draft** → **Open** → **Closed** → **Archived**
- Reopen closed releases or move back to draft
- Add notes and descriptions to releases
- Search and filter releases by status, date range, or keyword
- Paginated release listing
- Global release selector in the navigation bar for quick switching

---

## Test Organization Hierarchy

Releases → Test Sets → Test Cases → Scenarios → Steps

### Test Sets

- Group test cases into logical sets within a release
- Assign test sets to hierarchical **categories** (tree structure with parent/child)
- Create, edit, delete, and filter test sets by category
- Paginated listing with counts of nested cases, scenarios, and steps

### Test Cases

- Create and manage test cases within a test set
- Drag-and-drop reordering of test cases
- Inline editing of test case details

### Scenarios

- Nest multiple scenarios under each test case
- Drag-and-drop reordering of scenarios
- Sidebar navigation for quick scenario selection

### Steps

- Define individual test steps with:
  - **Step definition** (description text)
  - **Action type** (click, fill, select, assert, navigate, etc.)
  - **Element ID** (CSS selector, data-testid, or getByTestId locator)
  - **Action input** (value to type, option to select, etc.)
  - **Expected results**
- Assign **Type Configurations** and **Action Configurations** per step
- Assign **Select Configs** (dropdown option lists) and **Match Configs** (assertion matchers) per step
- Bulk sync steps for efficient editing

---

## Category System

- Hierarchical category tree for organizing test sets, similar to what we fing in Jira XRay
- Create, rename, and delete categories
- Nested parent/child relationships with tree indices
- Filter test sets by category

---

## Test Execution

### Single Test Set Execution

- Execute an individual test set against a selected environment
- Queue-based sequential execution
- Real-time status tracking via polling
- Step-by-step result capture (passed / failed / skipped)

### 7PS - 7 Parallel Sets Batch Execution

- Run **all test sets** in a release concurrently (up to 7 in parallel)
- Select target environment before execution
- Real-time progress tracking with:
  - Completion percentage and progress bar
  - Passed / Failed / Pending counters
- Batch ID tracking for monitoring
- View aggregated batch report upon completion

### Playwright Integration

- Automated browser testing powered by Playwright
- Action handlers for:
  - **Navigation**: go to URL, go back, reload, wait for navigation
  - **Interaction**: click, type, select dropdown, check/uncheck, hover, focus
  - **Verification**: assert text, assert visibility, assert element count, validate against configs
  - **Waiting**: wait for element, wait for text, wait for network idle
- Dynamic locator resolution (CSS selectors, `data-testid`, `getByTestId`)
- Screenshot capture on failure
- Video recording of full test execution
- Cucumber/BDD JSON report generation

---

## Reporting

### PDF Reports

- Generate downloadable PDF reports per test run
- Includes release info, test set details, execution timestamps, duration
- Step-by-step results with pass/fail status and error messages
- Hierarchical layout: Cases → Scenarios → Steps

### Cucumber Reports

- BDD-format JSON reports for each test run
- Individual reports per test set
- Merged batch reports for parallel executions

### Video Recordings

- Full browser session video per test run
- Playback directly from the Test Runs page

### Batch Reports

- Combined summary view of 7PS parallel executions
- Aggregate statistics: total sets, passed, failed, duration
- Drill-down into individual test set results

---

## Environments

- Configure multiple test environments (e.g., qa, dev, staging, prod)
- Store environment-specific base URLs per release
- Select target environment before any test execution
- Manage environments from the Settings page

---

## Configuration

### Type Options

- Define custom step **type** categories (e.g., Navigation, Assertion, Input)
- Per-release configuration
- Drag-and-drop reordering
- Custom display names and metadata

### Action Options

- Define custom step **action** types (e.g., Click, Fill, Assert Text)
- Per-release configuration
- Drag-and-drop reordering
- Result type specification

### Select Configs

- Global reusable dropdown option lists
- Named collections (e.g., "Status Options", "User Roles")
- Assignable to individual test steps for validation

### Match Configs

- Global reusable match/assertion option lists
- Used for validating expected values against dropdown or multi-value fields

---

## Reusable Test Case Templates

- Create global test case templates independent of any release
- Define scenarios and steps within a reusable case
- Full step editor with the same capabilities as regular test cases
- **Copy to test set**: deploy a reusable case into any test set in any release
- **Create from existing case**: promote a test case to a reusable template
- Dedicated editor page for managing reusable case content

---

## Export

- Export all test data for a release as structured JSON
- Nested hierarchy: release → test sets → test cases → scenarios → steps
- Includes all step configurations (type, action, element, expected results)
- Suitable for backup, sharing, or migration

---

## Dashboard

- Global statistics: total releases, test sets, cases, scenarios, steps
- Release-specific statistics when a release is selected
- Recent test execution results
- Quick release creation

---

## Audit Logging

- Automatic tracking of all user actions:
  - **CREATE** - new resources
  - **UPDATE** - modifications (captures old and new values)
  - **DELETE** - resource deletions
  - **EXPORT** - data exports
  - **COPY** - template copies
  - **IMPORT** - data imports
- Captured metadata: user ID, user name, IP address, user agent, timestamp
- Filter audit logs by user, action type, resource type, release, and date range
- Full-text search across audit entries
- Sensitive data masking for password/secret/token fields
- Paginated log viewer

---

## CLI Tooling

### `scripts/run-7ps.sh`

- Execute 7PS batch runs from the command line or CI/CD pipelines
- Options:
  - `--release, -r` - target release number (default: latest active)
  - `--env, -e` - environment name (default: qa)
  - `--api-url, -a` - API base URL
  - `--poll-interval` - status polling interval
  - `--timeout` - max wait time
  - `--json` - JSON output for automation
  - `--quiet` - suppress progress output
- Colored terminal output with progress tracking
- Exit codes for CI/CD integration

---

## Docker & Deployment

- **Dockerfile** based on official Playwright image with all browser dependencies
- **docker-compose.yml** with:
  - Port mappings: 3030 (API), 5173 (Vite dev server)
  - Volume mounts for hot reload during development
  - Persistent data volume at `/app/data`
  - Environment variable loading from `.env`
- Static file serving for production builds with SPA fallback routing

---

## Authentication

- Header-based user identification via `X-Authenticated-User` and `Remote-User` headers
- Designed for integration with reverse proxies and enterprise identity providers
- Fallback to environment variables (`MOCK_USER_EID`, `MOCK_USER_NAME`) for development
- User info captured in all audit log entries

---

## Tech Stack

| Layer       | Technology                                      |
| ----------- | ----------------------------------------------- |
| Frontend    | React 18, TypeScript, Tailwind CSS              |
| Routing     | TanStack Router                                 |
| Data        | TanStack Query, TanStack Store                  |
| Backend     | Express.js, TypeScript                          |
| Database    | SQLite via @libsql/client                       |
| Testing     | Playwright                                      |
| Reporting   | Cucumber JSON, PDF (HTML-to-PDF via Playwright) |
| Build       | Vite                                            |
| Drag & Drop | @dnd-kit                                        |
| Security    | Helmet, CORS                                    |
| Deployment  | Docker, docker-compose                          |
