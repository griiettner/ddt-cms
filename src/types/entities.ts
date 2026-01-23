/**
 * Domain Entity Types
 */

// Release Types
export type ReleaseStatus = 'draft' | 'open' | 'closed' | 'archived';

export interface Release {
  id: number;
  release_number: string;
  description: string;
  notes: string;
  created_at: string;
  created_by: string;
  closed_at: string | null;
  closed_by: string | null;
  status: ReleaseStatus;
  testSetCount?: number;
  testCaseCount?: number;
}

// Category Types
export interface Category {
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
  children?: Category[];
}

// Flat Category for dropdowns (includes computed displayName)
export interface FlatCategory extends Category {
  displayName: string;
}

// Test Set Types
export interface TestSet {
  id: number;
  release_id: number;
  category_id: number | null;
  name: string;
  description: string;
  created_at: string;
  created_by: string;
  caseCount?: number;
  scenarioCount?: number;
  category?: Category | null;
}

// Test Case Types
export interface TestCase {
  id: number;
  test_set_id: number;
  name: string;
  description: string;
  order_index: number;
  created_at: string;
}

// Test Scenario Types
export interface TestScenario {
  id: number;
  test_case_id: number;
  name: string;
  description: string;
  order_index: number;
  created_at: string;
  case_name?: string;
}

// Test Step Types
export interface TestStep {
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
  required: boolean;
  expected_results: string | null;
  created_at: string;
  updated_at: string;
}

// Configuration Types
export type ConfigCategory = 'type' | 'action';

export interface ConfigOption {
  id: number;
  category: ConfigCategory;
  key: string;
  display_name: string;
  result_type: string | null;
  default_value: string | null;
  config_data: string | null;
  is_active: boolean;
  order_index: number;
}

// Select Config Types (for Custom Select / URL actions)
export interface SelectConfig {
  id: number;
  name: string;
  options: string; // JSON string array
  config_type: string;
  created_at: string;
  updated_at: string;
}

// Parsed Select Config (options as array)
export interface ParsedSelectConfig {
  id: number;
  name: string;
  options: string[];
  config_type: string;
  created_at?: string;
  updated_at?: string;
}

// Match Config Types (for Options Match action)
export interface MatchConfig {
  id: number;
  name: string;
  options: string; // JSON string array
  created_at: string;
  updated_at: string;
}

// Parsed Match Config (options as array)
export interface ParsedMatchConfig {
  id: number;
  name: string;
  options: string[];
  created_at?: string;
  updated_at?: string;
}

// Reusable Case Types
export interface ReusableCase {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  step_count?: number;
  steps?: ReusableCaseStep[];
}

export interface ReusableCaseStep {
  id: number;
  reusable_case_id: number;
  order_index: number;
  step_definition: string;
  type: string | null;
  element_id: string | null;
  action: string | null;
  action_result: string | null;
  select_config_id: number | null;
  match_config_id: number | null;
  required: boolean;
  expected_results: string | null;
  created_at: string;
}

// Test Run Types
export type TestRunStatus = 'passed' | 'failed' | 'running';

export interface FailedDetail {
  scenario: string;
  step: string;
  error: string;
}

export interface TestRun {
  id: number;
  release_id: number;
  test_set_id: number | null;
  test_set_name: string | null;
  status: TestRunStatus;
  executed_by: string | null;
  executed_at: string;
  duration_ms: number;
  total_scenarios: number;
  total_steps: number;
  passed_steps: number;
  failed_steps: number;
  failed_details: FailedDetail[];
  release_number?: string;
  environment: string | null;
  base_url: string | null;
  video_path: string | null;
  batch_id?: string | null; // For 7PS batch runs
  batch_size?: number | null; // Number of test sets in batch
}

// User Types
export interface User {
  eid: string;
  name?: string;
  email?: string;
}

// Audit Log Types
export interface AuditLog {
  id: number;
  timestamp: string;
  user_eid: string;
  user_name: string | null;
  action: string;
  resource_type: string;
  resource_id: number | null;
  resource_name: string | null;
  release_id: number | null;
  details: Record<string, unknown> | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
}

export interface AuditLogFilters {
  users: { eid: string; name: string | null }[];
  actions: string[];
  resourceTypes: string[];
}
