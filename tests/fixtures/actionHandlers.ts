/**
 * Action Handlers for Playwright Test Execution
 * Maps each action type to Playwright commands
 */
import { expect, type Locator, type Page } from '@playwright/test';
import type { ActionContext, ActionHandler, ActionType } from './types.js';

/**
 * Wait for page to be fully ready after navigation
 * Checks: DOM content loaded, network idle, body visible
 */
async function waitForPageReady(url: string | RegExp, page: Page): Promise<void> {
  await expect.poll(() => page.url(), { timeout: 30000, intervals: [500, 100] }).toMatch(url);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('body')).toBeVisible();
}

/**
 * Get a Playwright locator based on element_id
 * Supports various selector formats:
 * - [data-testid=...] - use as-is
 * - #id or .class - CSS selector
 * - Otherwise - use getByTestId
 */
function getLocator(context: ActionContext): Locator {
  const { page, step } = context;
  const elementId = step.element_id || '';

  // If starts with [data-testid=, use as-is
  if (elementId.startsWith('data-testid=')) {
    return page.locator(elementId);
  }

  // If starts with # or . use as CSS selector
  if (elementId.startsWith('#') || elementId.startsWith('.')) {
    return page.locator(elementId);
  }

  // If contains special characters like >, use as CSS selector
  if (elementId.includes('>') || elementId.includes(' ')) {
    return page.locator(elementId);
  }

  // Otherwise use getByTestId
  return page.getByTestId(elementId);
}

/**
 * Parse action_result to get expected value
 */
function getActionResult(step: ActionContext['step']): string {
  if (!step.action_result) return '';

  // Try to parse as JSON first (for arrays or objects)
  try {
    const parsed = JSON.parse(step.action_result);
    if (Array.isArray(parsed)) {
      return parsed.join(', ');
    }
    return String(parsed);
  } catch {
    // Return as-is if not JSON
    return step.action_result;
  }
}

/**
 * Parse action_result as array
 */
function getActionResultArray(step: ActionContext['step']): string[] {
  if (!step.action_result) return [];

  try {
    const parsed = JSON.parse(step.action_result);
    if (Array.isArray(parsed)) {
      return parsed.map(String);
    }
    return [String(parsed)];
  } catch {
    // Split by comma if not JSON
    return step.action_result.split(',').map((s) => s.trim());
  }
}

/**
 * Active Action Handler
 * Verifies element has active/selected class
 */
const handleActive: ActionHandler = async (context) => {
  const locator = getLocator(context);
  await expect(locator).toHaveClass(/active|selected|current|is-active/i);
};

/**
 * Click Action Handler
 * Clicks on an element
 */
const handleClick: ActionHandler = async (context) => {
  const locator = getLocator(context);
  await locator.click({ force: true });
};

/**
 * Custom Select Action Handler
 * Fills or selects a value from a dropdown/input
 */
const handleCustomSelect: ActionHandler = async (context) => {
  const { step, selectConfigs } = context;
  const locator = getLocator(context);
  const value = getActionResult(step);

  // If there's a select_config_id, get options from config
  if (step.select_config_id) {
    const config = selectConfigs.get(step.select_config_id);
    if (config) {
      // Parse options from config
      try {
        const options = JSON.parse(config.options);
        if (Array.isArray(options) && options.includes(value)) {
          // Try to select from dropdown first
          try {
            await locator.selectOption(value);
            return;
          } catch {
            // Fall through to fill
          }
        }
      } catch {
        // Ignore parse errors
      }
    }
  }

  // Try to determine element type and act accordingly
  const tagName = await locator.evaluate((el) => el.tagName.toLowerCase());

  if (tagName === 'select') {
    await locator.selectOption(value);
  } else if (tagName === 'input' || tagName === 'textarea') {
    await locator.fill(value);
  } else {
    // For other elements, try click + fill on child input
    await locator.click();
    const input = locator.locator('input, textarea').first();
    const inputExists = (await input.count()) > 0;
    if (inputExists) {
      await input.fill(value);
    } else {
      // Last resort: fill the element directly
      await locator.fill(value);
    }
  }
};

/**
 * Options Match Action Handler
 * Verifies dropdown options match expected values
 */
const handleOptionsMatch: ActionHandler = async (context) => {
  const { step, matchConfigs } = context;
  const locator = getLocator(context);

  // Get expected options
  let expectedOptions = getActionResultArray(step);

  // If there's a match_config_id, get options from config
  if (step.match_config_id) {
    const config = matchConfigs.get(step.match_config_id);
    if (config) {
      try {
        const options = JSON.parse(config.options);
        if (Array.isArray(options)) {
          expectedOptions = options.map(String);
        }
      } catch {
        // Ignore parse errors
      }
    }
  }

  // Get actual options from the element
  const tagName = await locator.evaluate((el) => el.tagName.toLowerCase());

  let actualOptions: string[];
  if (tagName === 'select') {
    actualOptions = await locator.locator('option').allTextContents();
  } else {
    // For custom dropdowns, look for list items or options
    const options = locator.locator('li, [role="option"], .option');
    actualOptions = await options.allTextContents();
  }

  // Normalize and compare
  const normalizedExpected = expectedOptions.map((o) => o.trim().toLowerCase());
  const normalizedActual = actualOptions.map((o) => o.trim().toLowerCase());

  // Check that all expected options are present
  for (const expected of normalizedExpected) {
    expect(normalizedActual).toContain(expected);
  }
};

/**
 * Text Match Action Handler
 * Verifies element contains expected text
 */
const handleTextMatch: ActionHandler = async (context) => {
  const { step } = context;
  const locator = getLocator(context);
  const expected = getActionResult(step);

  await expect(locator).toContainText(expected, { ignoreCase: true });
};

/**
 * Text Plain Action Handler
 * Types text into an input field
 */
const handleTextPlain: ActionHandler = async (context) => {
  const { step } = context;
  const locator = getLocator(context);
  const text = getActionResult(step);

  await locator.fill(text);
};

/**
 * Password Action Handler
 * Types password into a password input field (same as text_plain but for password fields)
 */
const handlePassword: ActionHandler = async (context) => {
  const { step } = context;
  const locator = getLocator(context);
  const password = getActionResult(step);

  await locator.fill(password);
};

/**
 * URL Action Handler
 * Navigates to URL, clicks element to trigger navigation, or verifies current URL
 */
const handleUrl: ActionHandler = async (context) => {
  const { page, step } = context;
  const url = getActionResult(step);
  const stepType = step.type?.toLowerCase();

  // Determine if this is a navigation or assertion based on step type
  const isNavigation = stepType === 'action' || stepType === 'given';
  const isClickRedirect = stepType === 'button-click-redirect';

  if (isNavigation) {
    // Navigate to the URL directly
    await page.goto(url);
    await waitForPageReady(url, page);
  } else if (isClickRedirect) {
    // Click the element and wait for navigation, then verify URL
    const locator = getLocator(context);
    const urlPattern = new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    // Check if the link might open in a new tab
    const targetAttr = await locator.getAttribute('target');
    const isNewTab = targetAttr === '_blank';

    if (isNewTab) {
      // Handle new tab/popup scenario
      const [newPage] = await Promise.all([
        page.context().waitForEvent('page', { timeout: 30000 }),
        locator.click(),
      ]);
      // Wait for the new page to be fully ready
      await waitForPageReady(urlPattern, newPage);
      // Verify URL
      await expect(newPage).toHaveURL(urlPattern);
      // Close the new tab
      await newPage.close();
    } else {
      // Click and wait for page to be fully ready (URL change, network idle, DOM ready, body visible)
      await locator.click();
      await waitForPageReady(urlPattern, page);
    }
  } else {
    // Assert current URL matches (default behavior for assertions)
    await expect(page).toHaveURL(new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
};

/**
 * Visible Action Handler
 * Verifies element is visible or not visible
 */
const handleVisible: ActionHandler = async (context) => {
  const { step } = context;
  const locator = getLocator(context);
  const expectedResult = getActionResult(step).toLowerCase();

  // Check if we're expecting NOT visible
  const shouldBeVisible = !['false', 'no', 'not visible', 'hidden', '0'].includes(expectedResult);

  if (shouldBeVisible) {
    await expect(locator).toBeVisible();
  } else {
    await expect(locator).not.toBeVisible();
  }
};

/**
 * Map of action types to handlers
 */
export const actionHandlers: Record<ActionType, ActionHandler> = {
  active: handleActive,
  click: handleClick,
  custom_select: handleCustomSelect,
  options_match: handleOptionsMatch,
  password: handlePassword,
  text_match: handleTextMatch,
  text_plain: handleTextPlain,
  url: handleUrl,
  visible: handleVisible,
};

/**
 * Execute a step using the appropriate action handler
 */
export async function executeStep(context: ActionContext): Promise<void> {
  const action = context.step.action?.toLowerCase() as ActionType | undefined;

  if (!action) {
    // No action defined, skip
    return;
  }

  const handler = actionHandlers[action];
  if (!handler) {
    throw new Error(`Unknown action type: ${action}`);
  }

  await handler(context);
}
