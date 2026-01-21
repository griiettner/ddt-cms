import { useState, type FormEvent } from 'react';
import { Modal } from '@/components/common';
import { useReusableCasesQuery } from '@/hooks/queries';

type CaseMode = 'create' | 'reusable';

interface CaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onUseReusable: (reusableId: number) => void | Promise<void>;
  name: string;
  setName: (name: string) => void;
}

function CaseModal({
  isOpen,
  onClose,
  onSubmit,
  onUseReusable,
  name,
  setName,
}: CaseModalProps): JSX.Element {
  const [mode, setMode] = useState<CaseMode>('create');
  const [selectedReusableId, setSelectedReusableId] = useState('');

  const { data: reusableCases = [], isLoading: loadingReusable } = useReusableCasesQuery();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (mode === 'create') {
      onSubmit(e);
    } else if (mode === 'reusable' && selectedReusableId) {
      onUseReusable(parseInt(selectedReusableId, 10));
    }
  };

  const handleClose = () => {
    setMode('create');
    setSelectedReusableId('');
    onClose();
  };

  const selectedCase = reusableCases.find((rc) => rc.id.toString() === selectedReusableId);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New Test Case">
      <div className="mb-6 flex border-b border-co-gray-200">
        <button
          type="button"
          onClick={() => setMode('create')}
          className={`flex-1 border-b-2 py-3 text-sm font-medium transition-colors ${
            mode === 'create'
              ? 'border-co-blue text-co-blue'
              : 'border-transparent text-co-gray-500 hover:text-co-gray-700'
          }`}
        >
          Create New
        </button>
        <button
          type="button"
          onClick={() => setMode('reusable')}
          className={`flex-1 border-b-2 py-3 text-sm font-medium transition-colors ${
            mode === 'reusable'
              ? 'border-co-blue text-co-blue'
              : 'border-transparent text-co-gray-500 hover:text-co-gray-700'
          }`}
        >
          Use Reusable
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {mode === 'create' ? (
          <div className="mb-4">
            <label className="form-label">Case Name (e.g., User Login)</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter case name..."
              required
            />
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="form-label">Select Reusable Case</label>
              {loadingReusable ? (
                <div className="py-4 text-center text-sm text-co-gray-500">
                  Loading reusable cases...
                </div>
              ) : reusableCases.length === 0 ? (
                <div className="rounded-lg border border-dashed border-co-gray-300 py-4 text-center text-sm text-co-gray-500">
                  <p>No reusable cases available.</p>
                  <p className="mt-1">
                    Create one by checking &quot;Save as reusable case&quot; when creating a new
                    case.
                  </p>
                </div>
              ) : (
                <select
                  className="form-input"
                  value={selectedReusableId}
                  onChange={(e) => setSelectedReusableId(e.target.value)}
                  required
                >
                  <option value="">-- Select a reusable case --</option>
                  {reusableCases.map((rc) => (
                    <option key={rc.id} value={rc.id}>
                      {rc.name} ({rc.step_count || 0} steps)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedReusableId && selectedCase && (
              <div className="mb-4 rounded-lg border border-co-gray-200 bg-co-gray-50 p-3">
                <div className="text-sm font-medium text-co-gray-700">{selectedCase.name}</div>
                <div className="mt-1 text-xs text-co-gray-500">
                  {selectedCase.description || 'No description'}
                </div>
                <div className="mt-2 text-xs text-co-blue">
                  {selectedCase.step_count || 0} steps will be copied
                </div>
              </div>
            )}
          </>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 font-medium text-co-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={mode === 'reusable' && (!selectedReusableId || reusableCases.length === 0)}
          >
            {mode === 'create' ? 'Create Case' : 'Add Case'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default CaseModal;
