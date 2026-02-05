/**
 * Format a date string to local date
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString();
}

/**
 * Format a date string to local date and time
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-';
  return new Date(date).toLocaleString();
}

/**
 * Format a date string to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return '-';

  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return formatDate(date);
}
