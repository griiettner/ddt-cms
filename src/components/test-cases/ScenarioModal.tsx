import type { FormEvent } from 'react';
import { Modal } from '@/components/common';
import type { TestCase } from '@/types/entities';

interface ScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  name: string;
  setName: (name: string) => void;
  testCaseId: string;
  setTestCaseId: (id: string) => void;
  testCases: TestCase[];
}

function ScenarioModal({
  isOpen,
  onClose,
  onSubmit,
  name,
  setName,
  testCaseId,
  setTestCaseId,
  testCases,
}: ScenarioModalProps): JSX.Element {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Scenario">
      <form onSubmit={onSubmit}>
        <div className="mb-4">
          <label className="form-label">Scenario Name</label>
          <input
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Happy Path"
            required
          />
        </div>
        <div className="mb-4">
          <label className="form-label">Related Test Case</label>
          <select
            className="form-input"
            value={testCaseId}
            onChange={(e) => setTestCaseId(e.target.value)}
            required
          >
            <option value="">-- Select Case --</option>
            {testCases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-medium text-co-gray-700"
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Create Scenario
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default ScenarioModal;
