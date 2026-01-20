/**
 * Debounce Utilities
 * Replaces the deprecated useDebounce hook with functional utilities
 */

/**
 * Creates a debounced function that delays invoking fn until after wait
 * milliseconds have elapsed since the last time the debounced function was invoked.
 *
 * @param {Function} fn - The function to debounce
 * @param {number} wait - The number of milliseconds to delay
 * @returns {Function} - The debounced function
 */
export function debounce(fn, wait = 300) {
  let timeoutId;

  const debouncedFn = (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), wait);
  };

  // Cancel any pending execution
  debouncedFn.cancel = () => {
    clearTimeout(timeoutId);
  };

  // Execute immediately and cancel pending
  debouncedFn.flush = (...args) => {
    clearTimeout(timeoutId);
    fn(...args);
  };

  return debouncedFn;
}

/**
 * Creates a throttled function that only invokes fn at most once per
 * every wait milliseconds.
 *
 * @param {Function} fn - The function to throttle
 * @param {number} wait - The number of milliseconds to throttle
 * @returns {Function} - The throttled function
 */
export function throttle(fn, wait = 300) {
  let lastCall = 0;
  let timeoutId;

  const throttledFn = (...args) => {
    const now = Date.now();
    const remaining = wait - (now - lastCall);

    if (remaining <= 0) {
      clearTimeout(timeoutId);
      lastCall = now;
      fn(...args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        fn(...args);
      }, remaining);
    }
  };

  throttledFn.cancel = () => {
    clearTimeout(timeoutId);
    timeoutId = null;
  };

  return throttledFn;
}

export default { debounce, throttle };
