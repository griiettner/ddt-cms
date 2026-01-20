/**
 * Test Runner Simulation
 * Simulates running test steps like Playwright would
 * Uses step data to determine pass/fail based on validation rules
 */

/**
 * Simulate running a single test step
 * @param {Object} step - The step object from database
 * @param {number} delay - Artificial delay in ms
 * @returns {Promise<Object>} Result with status and error if failed
 */
export async function runStep(step, delay = 500) {
  // Simulate execution time
  await new Promise(resolve => setTimeout(resolve, delay));

  const result = {
    stepId: step.id,
    stepDefinition: step.step_definition,
    action: step.action,
    status: 'passed',
    error: null,
    duration: delay,
  };

  // Validation rules based on action type
  try {
    switch (step.action) {
      case 'click':
        // Click actions pass if element_id is defined
        if (!step.element_id) {
          throw new Error('Element ID is required for click action');
        }
        break;

      case 'text_match':
        // Text match requires expected value
        if (!step.action_result) {
          throw new Error('Expected text value is required for text_match');
        }
        // Simulate random match failure (10% chance for demo)
        if (Math.random() < 0.1) {
          throw new Error(`Text mismatch: expected "${step.action_result}" but found "different value"`);
        }
        break;

      case 'text_plain':
        // Text plain needs a value to type
        if (!step.action_result) {
          throw new Error('Text value is required for text_plain action');
        }
        break;

      case 'visible':
      case 'active':
        // Visibility/active checks need element ID
        if (!step.element_id) {
          throw new Error(`Element ID is required for ${step.action} check`);
        }
        break;

      case 'custom_select':
      case 'url':
        // Select actions need a config and value
        if (!step.select_config_id) {
          throw new Error('Select configuration is required');
        }
        if (!step.action_result) {
          throw new Error('Selection value is required');
        }
        break;

      case 'options_match':
        // Options match needs config
        if (!step.match_config_id) {
          throw new Error('Match configuration is required');
        }
        // Simulate random match failure (15% chance for demo)
        if (Math.random() < 0.15) {
          throw new Error('Options mismatch: dropdown options do not match expected values');
        }
        break;

      default:
        // Unknown actions pass if they have basic data
        if (!step.step_definition) {
          throw new Error('Step definition is required');
        }
    }

    // Additional validation for required steps
    if (step.required && !step.expected_results) {
      // Warning but not failure
      result.warning = 'Required step missing expected results documentation';
    }

  } catch (err) {
    result.status = 'failed';
    result.error = err.message;
  }

  return result;
}

/**
 * Run all steps for a single scenario
 * @param {Object} scenario - Scenario with steps
 * @param {Function} onProgress - Callback for progress updates
 * @param {number} scenarioIndex - Current scenario index
 * @param {number} totalScenarios - Total number of scenarios
 * @returns {Promise<Object>} Scenario results
 */
export async function runScenarioSteps(scenario, onProgress, scenarioIndex, totalScenarios) {
  const results = {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    caseName: scenario.case_name,
    total: scenario.steps.length,
    passed: 0,
    failed: 0,
    steps: [],
  };

  for (let i = 0; i < scenario.steps.length; i++) {
    const step = scenario.steps[i];

    // Report progress
    onProgress({
      currentScenario: scenarioIndex + 1,
      totalScenarios,
      scenarioName: scenario.name,
      caseName: scenario.case_name,
      currentStep: i + 1,
      totalSteps: scenario.steps.length,
      stepDefinition: step.step_definition || `Step ${i + 1}`,
      status: 'running',
    });

    // Run the step with variable delay (200-800ms)
    const delay = 200 + Math.random() * 600;
    const stepResult = await runStep(step, delay);
    stepResult.scenarioName = scenario.name;
    stepResult.caseName = scenario.case_name;

    results.steps.push(stepResult);

    if (stepResult.status === 'passed') {
      results.passed++;
    } else {
      results.failed++;
    }
  }

  return results;
}

/**
 * Run all scenarios (full test suite)
 * @param {Array} scenarios - Array of scenarios with their steps
 * @param {Function} onProgress - Callback for progress updates
 * @returns {Promise<Object>} Full test run results
 */
export async function runAllScenarios(scenarios, onProgress = () => {}) {
  const results = {
    totalScenarios: scenarios.length,
    totalSteps: scenarios.reduce((sum, s) => sum + (s.steps?.length || 0), 0),
    passed: 0,
    failed: 0,
    scenarios: [],
    startTime: Date.now(),
    endTime: null,
    duration: 0,
  };

  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i];

    if (!scenario.steps || scenario.steps.length === 0) {
      // Skip scenarios with no steps
      results.scenarios.push({
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        caseName: scenario.case_name,
        total: 0,
        passed: 0,
        failed: 0,
        steps: [],
        skipped: true,
      });
      continue;
    }

    const scenarioResult = await runScenarioSteps(scenario, onProgress, i, scenarios.length);
    results.scenarios.push(scenarioResult);
    results.passed += scenarioResult.passed;
    results.failed += scenarioResult.failed;
  }

  results.endTime = Date.now();
  results.duration = results.endTime - results.startTime;

  return results;
}

/**
 * Format duration in human readable format
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration
 */
export function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  const seconds = (ms / 1000).toFixed(1);
  return `${seconds}s`;
}

export default {
  runStep,
  runScenarioSteps,
  runAllScenarios,
  formatDuration,
};
