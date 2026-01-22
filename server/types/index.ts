/**
 * Server Type Definitions
 */

import type { Request } from 'express';
import type Database from 'better-sqlite3';

// User type for authenticated requests
export interface User {
  eid: string;
  name?: string;
  email?: string;
}

// Extend Express Request to include user
export interface AuthenticatedRequest extends Request {
  user: User;
}

// Database types
export type DatabaseInstance = Database.Database;

// Generic database row type
export type DbRow = Record<string, unknown>;

// API Response types
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// Pagination types
export interface PaginationParams {
  page?: string | number;
  limit?: string | number;
  pageSize?: string | number;
}

export interface PaginationResult {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface PaginatedApiResponse<T> extends ApiSuccessResponse<T[]> {
  pagination: PaginationResult;
}

// Release database row types
export interface ReleaseRow {
  id: number;
  release_number: string;
  description: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  closed_at: string | null;
  closed_by: string | null;
  status: 'open' | 'closed' | 'archived';
}

export interface TestSetRow {
  id: number;
  release_id: number;
  category_id: number | null;
  name: string;
  description: string | null;
  created_at: string;
  created_by: string | null;
}

export interface TestCaseRow {
  id: number;
  test_set_id: number;
  name: string;
  description: string | null;
  order_index: number;
  created_at: string;
}

export interface TestScenarioRow {
  id: number;
  test_case_id: number;
  name: string;
  description: string | null;
  order_index: number;
  created_at: string;
}

export interface TestStepRow {
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
  required: number; // SQLite boolean
  expected_results: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConfigOptionRow {
  id: number;
  category: 'type' | 'action';
  key: string;
  display_name: string;
  result_type: string | null;
  default_value: string | null;
  config_data: string | null;
  is_active: number; // SQLite boolean
  order_index: number;
}

export interface CategoryRow {
  id: number;
  parent_id: number | null;
  name: string;
  description: string | null;
  path: string;
  level: number;
  lft: number;
  rgt: number;
  created_at: string;
  updated_at: string;
}

export interface SelectConfigRow {
  id: number;
  name: string;
  options: string; // JSON string
  config_type: string;
  created_at: string;
  updated_at: string;
}

export interface MatchConfigRow {
  id: number;
  name: string;
  options: string; // JSON string
  created_at: string;
  updated_at: string;
}

export interface ReusableCaseRow {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

export interface ReusableCaseStepRow {
  id: number;
  reusable_case_id: number;
  order_index: number;
  step_definition: string | null;
  type: string | null;
  element_id: string | null;
  action: string | null;
  action_result: string | null;
  select_config_id: number | null;
  match_config_id: number | null;
  required: number; // SQLite boolean
  expected_results: string | null;
  created_at: string;
}

export interface TestRunRow {
  id: number;
  release_id: number;
  test_set_id: number | null;
  test_set_name: string | null;
  status: 'passed' | 'failed' | 'running';
  executed_by: string | null;
  executed_at: string;
  duration_ms: number;
  total_scenarios: number;
  total_steps: number;
  passed_steps: number;
  failed_steps: number;
  failed_details: string | null; // JSON string
  environment: string | null;
  base_url: string | null;
  video_path: string | null;
}

// Count result type
export interface CountResult {
  count: number;
}

export interface TotalResult {
  total: number;
}

export interface MaxOrderResult {
  max_order: number | null;
}

// PRAGMA table_info result type
export interface TableColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

// Configuration seed types
export interface TypeConfig {
  key: string;
  name: string;
}

export interface ActionConfig {
  key: string;
  name: string;
  result_type: string | null;
}

// Audit Log types
export interface AuditLogRow {
  id: number;
  timestamp: string;
  user_eid: string;
  user_name: string | null;
  action: string;
  resource_type: string;
  resource_id: number | null;
  resource_name: string | null;
  release_id: number | null;
  details: string | null;
  ip_address: string | null;
  user_agent: string | null;
  old_value: string | null;
  new_value: string | null;
}

// Environment configuration for Playwright test execution
export interface EnvironmentConfigRow {
  id: number;
  release_id: number | null;
  environment: string;
  value: string;
  created_at: string;
  updated_at: string;
}

// Detailed step results for test runs
export interface TestRunStepRow {
  id: number;
  test_run_id: number;
  test_step_id: number;
  scenario_id: number;
  scenario_name: string | null;
  case_name: string | null;
  step_definition: string | null;
  expected_results: string | null;
  status: 'passed' | 'failed' | 'skipped';
  error_message: string | null;
  duration_ms: number;
  executed_at: string;
}

// Test generation types for Playwright
export interface TestGenerationStep {
  id: number;
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
}

export interface TestGenerationScenario {
  id: number;
  name: string;
  case_name: string;
  case_id: number;
  steps: TestGenerationStep[];
}

export interface TestGenerationCase {
  id: number;
  name: string;
  scenarios: TestGenerationScenario[];
}

export interface TestGenerationData {
  testSetId: number;
  testSetName: string;
  releaseId: number;
  cases: TestGenerationCase[];
  selectConfigs: SelectConfigRow[];
  matchConfigs: MatchConfigRow[];
}
