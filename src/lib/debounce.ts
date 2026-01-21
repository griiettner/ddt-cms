/**
 * Debounce Utilities
 * Replaces the deprecated useDebounce hook with functional utilities
 */

type AnyFunction = (...args: unknown[]) => unknown;

interface DebouncedFunction<T extends AnyFunction> {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: (...args: Parameters<T>) => void;
}

interface ThrottledFunction<T extends AnyFunction> {
  (...args: Parameters<T>): void;
  cancel: () => void;
}

/**
 * Creates a debounced function that delays invoking fn until after wait
 * milliseconds have elapsed since the last time the debounced function was invoked.
 */
export function debounce<T extends AnyFunction>(fn: T, wait = 300): DebouncedFunction<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const debouncedFn = ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), wait);
  }) as DebouncedFunction<T>;

  // Cancel any pending execution
  debouncedFn.cancel = () => {
    clearTimeout(timeoutId);
  };

  // Execute immediately and cancel pending
  debouncedFn.flush = (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    fn(...args);
  };

  return debouncedFn;
}

/**
 * Creates a throttled function that only invokes fn at most once per
 * every wait milliseconds.
 */
export function throttle<T extends AnyFunction>(fn: T, wait = 300): ThrottledFunction<T> {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const throttledFn = ((...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = wait - (now - lastCall);

    if (remaining <= 0) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastCall = now;
      fn(...args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        fn(...args);
      }, remaining);
    }
  }) as ThrottledFunction<T>;

  throttledFn.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return throttledFn;
}

export default { debounce, throttle };
