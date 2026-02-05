/**
 * URL Utilities
 * Functions for creating URL-safe slugs from release names
 */

/**
 * Allowed characters for release numbers:
 * - Alphanumeric (a-z, A-Z, 0-9)
 * - Dots (.)
 * - Hyphens (-)
 * - Underscores (_)
 */
export const RELEASE_NUMBER_REGEX = /^[a-zA-Z0-9.\-_]+$/;

/**
 * Characters that are NOT allowed in release numbers
 */
export const INVALID_CHARS_REGEX = /[^a-zA-Z0-9.\-_]/g;

/**
 * Convert a release number to a URL-safe slug
 * - Replaces spaces with underscores
 * - Removes invalid characters
 * - Converts to lowercase for consistency
 */
export function toReleaseSlug(releaseNumber: string | null | undefined): string {
  if (!releaseNumber) return '';

  return releaseNumber
    .trim()
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(INVALID_CHARS_REGEX, '') // Remove invalid characters
    .toLowerCase();
}

/**
 * Validate a release number
 * Returns true if valid, false otherwise
 */
export function isValidReleaseNumber(releaseNumber: string | null | undefined): boolean {
  if (!releaseNumber || typeof releaseNumber !== 'string') return false;
  const trimmed = releaseNumber.trim();
  if (trimmed.length === 0) return false;
  return RELEASE_NUMBER_REGEX.test(trimmed);
}

/**
 * Get validation error message for release number
 * Returns null if valid, error message if invalid
 */
export function getReleaseNumberError(releaseNumber: string | null | undefined): string | null {
  if (!releaseNumber || releaseNumber.trim().length === 0) {
    return 'Release number is required';
  }
  if (!RELEASE_NUMBER_REGEX.test(releaseNumber.trim())) {
    return 'Only letters, numbers, dots (.), hyphens (-), and underscores (_) are allowed';
  }
  return null;
}

/**
 * Sanitize release number input
 * Removes invalid characters as user types
 */
export function sanitizeReleaseNumber(input: string | null | undefined): string {
  if (!input) return '';
  return input.replace(INVALID_CHARS_REGEX, '');
}

export default {
  toReleaseSlug,
  isValidReleaseNumber,
  getReleaseNumberError,
  sanitizeReleaseNumber,
  RELEASE_NUMBER_REGEX,
};
