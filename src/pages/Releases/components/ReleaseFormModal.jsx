/**
 * Release Form Modal Component
 */
import { useState, useEffect } from 'react';
import { Modal } from '../../../components/common';
import { getReleaseNumberError, sanitizeReleaseNumber } from '../../../lib/urlUtils';

function ReleaseFormModal({
  isOpen,
  onClose,
  onSubmit,
  form,
  onFormChange,
  isEditing,
  isSubmitting,
}) {
  const [validationError, setValidationError] = useState(null);

  // Validate on change
  useEffect(() => {
    if (form.release_number) {
      setValidationError(getReleaseNumberError(form.release_number));
    } else {
      setValidationError(null);
    }
  }, [form.release_number]);

  // Handle input with sanitization
  const handleReleaseNumberChange = (e) => {
    const sanitized = sanitizeReleaseNumber(e.target.value);
    onFormChange('release_number', sanitized);
  };

  // Prevent submit if validation error
  const handleSubmit = (e) => {
    e.preventDefault();
    const error = getReleaseNumberError(form.release_number);
    if (error) {
      setValidationError(error);
      return;
    }
    onSubmit(e);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Release' : 'New Release'}
    >
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="form-label">Release Number</label>
          <input
            type="text"
            className={`form-input ${validationError ? 'border-red-500' : ''}`}
            value={form.release_number}
            onChange={handleReleaseNumberChange}
            placeholder="e.g., 10.1.12 or 10.1.12-rc"
            required
          />
          {validationError && (
            <p className="text-red-500 text-xs mt-1">{validationError}</p>
          )}
          <p className="text-co-gray-500 text-xs mt-1">
            Allowed: letters, numbers, dots (.), hyphens (-), underscores (_)
          </p>
        </div>
        <div className="mb-4">
          <label className="form-label">Description</label>
          <input
            type="text"
            className="form-input"
            value={form.description}
            onChange={(e) => onFormChange('description', e.target.value)}
            placeholder="Optional description"
          />
        </div>
        {!isEditing && (
          <div className="mb-4">
            <label className="form-label">Notes</label>
            <textarea
              className="form-input h-24 resize-none"
              value={form.notes}
              onChange={(e) => onFormChange('notes', e.target.value)}
              placeholder="Optional notes"
            />
          </div>
        )}
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-co-gray-700 font-medium"
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Release')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default ReleaseFormModal;
