/**
 * ErrorDisplay - Shows user-friendly error summary with expandable details
 */
import { useState } from 'react';
import { parsePlaywrightError } from '@/utils/parsePlaywrightError';

interface ErrorDisplayProps {
  error: string;
  className?: string;
}

function ErrorDisplay({ error, className = '' }: ErrorDisplayProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);
  const parsed = parsePlaywrightError(error);

  return (
    <div className={`text-sm ${className}`}>
      {/* User-friendly summary */}
      <div className="font-medium text-red-700">{parsed.summary}</div>

      {/* Expandable full error */}
      {parsed.fullError && parsed.fullError !== parsed.summary && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 text-xs text-red-500 transition-colors hover:text-red-700"
          >
            <svg
              className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
            {isExpanded ? 'Hide details' : 'Show full error'}
          </button>

          {isExpanded && (
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-red-100 p-2 font-mono text-xs text-red-800">
              {parsed.fullError}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export default ErrorDisplay;
