/**
 * Environment Select Modal
 * Modal for selecting an environment before running Playwright tests
 */
import { useState } from 'react';
import { Modal } from '@/components/common';
import type { EnvironmentConfig } from '@/services/api';

interface EnvironmentSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (environment: string) => void;
  environments: EnvironmentConfig[];
  isLoading: boolean;
  testSetName: string;
}

function EnvironmentSelectModal({
  isOpen,
  onClose,
  onConfirm,
  environments,
  isLoading,
  testSetName,
}: EnvironmentSelectModalProps): JSX.Element {
  const [selectedEnv, setSelectedEnv] = useState<string>('');

  const handleConfirm = (): void => {
    if (!selectedEnv) {
      alert('Please select an environment');
      return;
    }
    onConfirm(selectedEnv);
  };

  const handleClose = (): void => {
    setSelectedEnv('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Run Playwright Test" size="md">
      <div className="space-y-6">
        <div>
          <p className="text-sm text-co-gray-600">
            Select an environment to run tests for{' '}
            <span className="font-semibold text-co-blue">{testSetName}</span>
          </p>
        </div>

        {environments.length === 0 ? (
          <div className="border-co-yellow-200 bg-co-yellow-50 rounded-lg border p-4">
            <p className="text-co-yellow-800 text-sm">
              No environments configured. Please configure environments in{' '}
              <span className="font-semibold">Settings &gt; Environments</span> before running
              tests.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-co-gray-700">Select Environment</label>
            <div className="space-y-2">
              {environments.map((env) => (
                <label
                  key={env.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${
                    selectedEnv === env.environment
                      ? 'border-co-blue-500 bg-co-blue-50'
                      : 'border-co-gray-200 hover:border-co-gray-300 hover:bg-co-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="environment"
                    value={env.environment}
                    checked={selectedEnv === env.environment}
                    onChange={(e) => setSelectedEnv(e.target.value)}
                    className="text-co-blue-600 h-4 w-4"
                  />
                  <div className="flex-1">
                    <div className="font-semibold uppercase text-co-blue">{env.environment}</div>
                    <div className="mt-0.5 font-mono text-xs text-co-gray-500">{env.value}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-co-gray-200 pt-4">
          <button type="button" onClick={handleClose} className="btn-outline">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedEnv || isLoading || environments.length === 0}
            className="btn-primary"
          >
            {isLoading ? (
              <>
                <span className="mr-2">Starting...</span>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </>
            ) : (
              'Start Playwright Test'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default EnvironmentSelectModal;
