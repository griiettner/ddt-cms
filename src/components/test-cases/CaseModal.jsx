import { useState } from 'react';
import { Modal } from '../common';
import { useReusableCasesQuery } from '../../hooks/queries';

function CaseModal({
  isOpen,
  onClose,
  onSubmit,
  onUseReusable,
  name,
  setName,
}) {
  const [mode, setMode] = useState('create'); // 'create' or 'reusable'
  const [selectedReusableId, setSelectedReusableId] = useState('');

  // Fetch reusable cases
  const { data: reusableCases = [], isLoading: loadingReusable } = useReusableCasesQuery();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === 'create') {
      onSubmit(e);
    } else if (mode === 'reusable' && selectedReusableId) {
      onUseReusable(selectedReusableId);
    }
  };

  const handleClose = () => {
    setMode('create');
    setSelectedReusableId('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="New Test Case"
    >
      {/* Mode Toggle */}
      <div className="flex mb-6 border-b border-co-gray-200">
        <button
          type="button"
          onClick={() => setMode('create')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
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
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
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
          <>
            {/* Create New Case Form */}
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
          </>
        ) : (
          <>
            {/* Use Reusable Case Form */}
            <div className="mb-4">
              <label className="form-label">Select Reusable Case</label>
              {loadingReusable ? (
                <div className="text-sm text-co-gray-500 py-4 text-center">
                  Loading reusable cases...
                </div>
              ) : reusableCases.length === 0 ? (
                <div className="text-sm text-co-gray-500 py-4 text-center border border-dashed border-co-gray-300 rounded-lg">
                  <p>No reusable cases available.</p>
                  <p className="mt-1">Create one by checking "Save as reusable case" when creating a new case.</p>
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

            {/* Preview selected case */}
            {selectedReusableId && (
              <div className="mb-4 p-3 bg-co-gray-50 rounded-lg border border-co-gray-200">
                <div className="text-sm font-medium text-co-gray-700">
                  {reusableCases.find(rc => rc.id.toString() === selectedReusableId)?.name}
                </div>
                <div className="text-xs text-co-gray-500 mt-1">
                  {reusableCases.find(rc => rc.id.toString() === selectedReusableId)?.description || 'No description'}
                </div>
                <div className="text-xs text-co-blue mt-2">
                  {reusableCases.find(rc => rc.id.toString() === selectedReusableId)?.step_count || 0} steps will be copied
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-co-gray-700 font-medium"
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
