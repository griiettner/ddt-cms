/**
 * Parse Playwright error messages into user-friendly summaries
 */

export interface ParsedError {
  summary: string;
  element?: string;
  expected?: string;
  received?: string;
  fullError: string;
}

/**
 * Parse a Playwright error message and return a user-friendly summary
 */
export function parsePlaywrightError(errorMessage: string): ParsedError {
  const result: ParsedError = {
    summary: 'Test step failed',
    fullError: errorMessage,
  };

  if (!errorMessage) {
    return result;
  }

  // Extract locator/element
  const locatorMatch = errorMessage.match(/[Ll]ocator:\s*locator\(['"]([^'"]+)['"]\)/);
  const getByTestIdMatch = errorMessage.match(/getByTestId\(['"]([^'"]+)['"]\)/);
  const getByRoleMatch = errorMessage.match(/getByRole\(['"]([^'"]+)['"]\)/);
  const getByTextMatch = errorMessage.match(/getByText\(['"]([^'"]+)['"]\)/);

  if (locatorMatch) {
    result.element = locatorMatch[1];
  } else if (getByTestIdMatch) {
    result.element = `[data-testid="${getByTestIdMatch[1]}"]`;
  } else if (getByRoleMatch) {
    result.element = `[role="${getByRoleMatch[1]}"]`;
  } else if (getByTextMatch) {
    result.element = `text="${getByTextMatch[1]}"`;
  }

  // Extract expected/received values
  const expectedMatch = errorMessage.match(/Expected:\s*(.+?)(?:\n|$)/);
  const receivedMatch = errorMessage.match(/Received:\s*(.+?)(?:\n|$)/);

  if (expectedMatch) {
    result.expected = expectedMatch[1].trim();
  }
  if (receivedMatch) {
    result.received = receivedMatch[1].trim();
  }

  // Generate user-friendly summary based on error type
  if (errorMessage.includes('toBeVisible()')) {
    if (result.received === 'hidden' || result.received?.includes('hidden')) {
      result.summary = `Expected element "${result.element || 'unknown'}" to be visible, but it was hidden`;
    } else if (result.received === 'detached' || errorMessage.includes('no elements')) {
      result.summary = `Expected element "${result.element || 'unknown'}" to be visible, but it was not found in the page`;
    } else {
      result.summary = `Expected element "${result.element || 'unknown'}" to be visible, but it was not`;
    }
  } else if (errorMessage.includes('toBeHidden()')) {
    result.summary = `Expected element "${result.element || 'unknown'}" to be hidden, but it was visible`;
  } else if (errorMessage.includes('toHaveText()')) {
    result.summary = `Expected element "${result.element || 'unknown'}" to have text "${result.expected || ''}", but got "${result.received || ''}"`;
  } else if (errorMessage.includes('toHaveValue()')) {
    result.summary = `Expected element "${result.element || 'unknown'}" to have value "${result.expected || ''}", but got "${result.received || ''}"`;
  } else if (errorMessage.includes('toHaveAttribute()')) {
    result.summary = `Expected element "${result.element || 'unknown'}" to have the specified attribute, but it didn't match`;
  } else if (errorMessage.includes('toHaveClass()')) {
    result.summary = `Expected element "${result.element || 'unknown'}" to have the specified class, but it didn't match`;
  } else if (errorMessage.includes('toHaveURL()') || errorMessage.includes('toHaveUrl()')) {
    result.summary = `Expected page URL to be "${result.expected || ''}", but got "${result.received || ''}"`;
  } else if (errorMessage.includes('toHaveTitle()')) {
    result.summary = `Expected page title to be "${result.expected || ''}", but got "${result.received || ''}"`;
  } else if (errorMessage.includes('Timeout') || errorMessage.includes('timeout')) {
    if (result.element) {
      result.summary = `Timed out waiting for element "${result.element}"`;
    } else {
      result.summary = 'Operation timed out';
    }
  } else if (errorMessage.includes('strict mode violation')) {
    result.summary = `Found multiple elements matching "${result.element || 'selector'}" - expected only one`;
  } else if (errorMessage.includes('waiting for')) {
    result.summary = `Timed out waiting for element "${result.element || 'unknown'}"`;
  } else if (result.element && result.expected && result.received) {
    result.summary = `Element "${result.element}" - expected ${result.expected}, but got ${result.received}`;
  }

  return result;
}

export default parsePlaywrightError;
