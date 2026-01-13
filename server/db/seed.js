/**
 * Database Seed Data
 * Populates configuration_options with default Types and Actions
 */

const { db } = require('./database');
const { migrate } = require('./migrations');

/**
 * Default Type options
 */
const DEFAULT_TYPES = [
  { key: 'navigation', display_name: 'Navigation', order_index: 1 },
  { key: 'interaction', display_name: 'Interaction', order_index: 2 },
  { key: 'validation', display_name: 'Validation', order_index: 3 },
  { key: 'data_entry', display_name: 'Data Entry', order_index: 4 },
  { key: 'wait', display_name: 'Wait', order_index: 5 }
];

/**
 * Default Action options with their result types
 *
 * Result Types:
 * - bool: Checkbox (true/false)
 * - text: Text input
 * - select: Dropdown (options in config_data)
 * - disable: Disabled field (no input)
 * - array: Text field showing array format ["item1", "item2"]
 * - url: Dropdown with predefined URLs
 */
const DEFAULT_ACTIONS = [
  {
    key: 'active',
    display_name: 'Active',
    result_type: 'bool',
    default_value: 'false',
    config_data: null,
    order_index: 1
  },
  {
    key: 'visible',
    display_name: 'Visible',
    result_type: 'bool',
    default_value: 'false',
    config_data: null,
    order_index: 2
  },
  {
    key: 'click',
    display_name: 'Click',
    result_type: 'disable',
    default_value: null,
    config_data: null,
    order_index: 3
  },
  {
    key: 'text_match',
    display_name: 'Text Match',
    result_type: 'text',
    default_value: '',
    config_data: null,
    order_index: 4
  },
  {
    key: 'text_plain',
    display_name: 'Text Plain',
    result_type: 'text',
    default_value: '',
    config_data: null,
    order_index: 5
  },
  {
    key: 'url',
    display_name: 'URL',
    result_type: 'url',
    default_value: '',
    config_data: JSON.stringify({
      urls: [
        { label: 'Home Page', value: 'https://example.com' },
        { label: 'Login Page', value: 'https://example.com/login' },
        { label: 'Dashboard', value: 'https://example.com/dashboard' }
      ]
    }),
    order_index: 6
  },
  {
    key: 'custom_select',
    display_name: 'Custom Select',
    result_type: 'select',
    default_value: '',
    config_data: JSON.stringify({
      options: [
        { label: 'Option 1', value: 'opt1' },
        { label: 'Option 2', value: 'opt2' },
        { label: 'Option 3', value: 'opt3' }
      ],
      placeholder: 'Select an option'
    }),
    order_index: 7
  },
  {
    key: 'options_match',
    display_name: 'Options Match',
    result_type: 'array',
    default_value: '[]',
    config_data: JSON.stringify({
      placeholder: '["option1", "option2"]',
      help: 'Enter options as JSON array'
    }),
    order_index: 8
  }
];

/**
 * Default URLs for URL action type
 */
const DEFAULT_URLS = [
  'https://example.com',
  'https://example.com/login',
  'https://example.com/dashboard',
  'https://example.com/profile',
  'https://example.com/settings'
];

/**
 * Insert configuration options
 */
function seedConfiguration() {
  console.log('Seeding configuration options...');

  const insertType = db.prepare(`
    INSERT OR IGNORE INTO configuration_options
    (category, key, display_name, order_index, is_active)
    VALUES ('type', ?, ?, ?, 1)
  `);

  const insertAction = db.prepare(`
    INSERT OR IGNORE INTO configuration_options
    (category, key, display_name, result_type, default_value, config_data, order_index, is_active)
    VALUES ('action', ?, ?, ?, ?, ?, ?, 1)
  `);

  // Insert types
  let typeCount = 0;
  for (const type of DEFAULT_TYPES) {
    const result = insertType.run(type.key, type.display_name, type.order_index);
    if (result.changes > 0) typeCount++;
  }
  console.log(`Inserted ${typeCount} type options`);

  // Insert actions
  let actionCount = 0;
  for (const action of DEFAULT_ACTIONS) {
    const result = insertAction.run(
      action.key,
      action.display_name,
      action.result_type,
      action.default_value,
      action.config_data,
      action.order_index
    );
    if (result.changes > 0) actionCount++;
  }
  console.log(`Inserted ${actionCount} action options`);

  return { types: typeCount, actions: actionCount };
}

/**
 * Create initial release with sample data
 */
function seedInitialRelease() {
  console.log('Creating initial release...');

  // Check if any releases exist
  const existingRelease = db.prepare('SELECT COUNT(*) as count FROM releases').get();
  if (existingRelease.count > 0) {
    console.log('Releases already exist, skipping initial release creation');
    return null;
  }

  // Create initial release
  const insertRelease = db.prepare(`
    INSERT INTO releases (release_number, description, status, created_by)
    VALUES (?, ?, 'active', ?)
  `);

  const result = insertRelease.run(
    'v1.0.0',
    'Initial release for POC',
    'system'
  );

  const releaseId = result.lastInsertRowid;
  console.log(`Created initial release with ID: ${releaseId}`);

  // Create sample test set
  const insertTestSet = db.prepare(`
    INSERT INTO test_sets (release_id, name, description, created_by)
    VALUES (?, ?, ?, ?)
  `);

  const testSetResult = insertTestSet.run(
    releaseId,
    'Sample Test Set',
    'Example test set for demonstration',
    'system'
  );

  const testSetId = testSetResult.lastInsertRowid;
  console.log(`Created sample test set with ID: ${testSetId}`);

  // Create sample test case
  const insertTestCase = db.prepare(`
    INSERT INTO test_cases (test_set_id, name, description, order_index, created_by)
    VALUES (?, ?, ?, ?, ?)
  `);

  const testCaseResult = insertTestCase.run(
    testSetId,
    'Sample Test Case',
    'Example test case with sample steps',
    0,
    'system'
  );

  const testCaseId = testCaseResult.lastInsertRowid;
  console.log(`Created sample test case with ID: ${testCaseId}`);

  // Create sample test steps
  const insertTestStep = db.prepare(`
    INSERT INTO test_steps
    (test_case_id, order_index, step_definition, type, element_id, action, action_result, required, expected_results, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const sampleSteps = [
    {
      order_index: 0,
      step_definition: 'Navigate to login page',
      type: 'navigation',
      element_id: '',
      action: 'url',
      action_result: 'https://example.com/login',
      required: true,
      expected_results: 'Login page loads successfully'
    },
    {
      order_index: 1,
      step_definition: 'Verify login button is visible',
      type: 'validation',
      element_id: 'login-button',
      action: 'visible',
      action_result: 'true',
      required: true,
      expected_results: 'Login button is displayed'
    },
    {
      order_index: 2,
      step_definition: 'Click login button',
      type: 'interaction',
      element_id: 'login-button',
      action: 'click',
      action_result: '',
      required: true,
      expected_results: 'Login form is submitted'
    }
  ];

  let stepCount = 0;
  for (const step of sampleSteps) {
    const result = insertTestStep.run(
      testCaseId,
      step.order_index,
      step.step_definition,
      step.type,
      step.element_id,
      step.action,
      step.action_result,
      step.required ? 1 : 0,
      step.expected_results,
      'system'
    );
    if (result.changes > 0) stepCount++;
  }
  console.log(`Created ${stepCount} sample test steps`);

  return { releaseId, testSetId, testCaseId, stepCount };
}

/**
 * Main seed function
 */
function seed() {
  console.log('Starting database seeding...');

  // Ensure migrations are run first
  migrate();

  // Seed configuration
  const configResult = seedConfiguration();
  console.log(`Configuration seeded: ${configResult.types} types, ${configResult.actions} actions`);

  // Seed initial release and sample data
  const releaseResult = seedInitialRelease();
  if (releaseResult) {
    console.log(`Sample data created: Release ${releaseResult.releaseId}, Test Set ${releaseResult.testSetId}, Test Case ${releaseResult.testCaseId}, ${releaseResult.stepCount} steps`);
  }

  console.log('Database seeding complete!');
}

// Run seed if this file is executed directly
if (require.main === module) {
  seed();
  process.exit(0);
}

module.exports = {
  seed,
  seedConfiguration,
  seedInitialRelease
};
