import { useState, useMemo, type FormEvent, type ChangeEvent } from 'react';
import { Modal } from '@/components/common';
import { getReleaseNumberError, sanitizeReleaseNumber } from '@/lib/urlUtils';

interface ReleaseFormData {
  release_number: string;
  description: string;
  notes: string;
}

interface ReleaseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  form: ReleaseFormData;
  onFormChange: (key: keyof ReleaseFormData, value: string) => void;
  isEditing: boolean;
  isSubmitting: boolean;
}

function ReleaseFormModal({
  isOpen,
  onClose,
  onSubmit,
  form,
  onFormChange,
  isEditing,
  isSubmitting,
}: ReleaseFormModalProps): JSX.Element {
  const [showValidation, setShowValidation] = useState(false);

  // Derive validation error from form state
  const validationError = useMemo(() => {
    if (!form.release_number) return null;
    return getReleaseNumberError(form.release_number);
  }, [form.release_number]);

  const handleReleaseNumberChange = (e: ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeReleaseNumber(e.target.value);
    onFormChange('release_number', sanitized);
    setShowValidation(true);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setShowValidation(true);
    if (validationError) {
      return;
    }
    onSubmit(e);
  };

  // Only show validation after user interaction
  const displayError = showValidation ? validationError : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Release' : 'New Release'}>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="form-label">Release Number</label>
          <input
            type="text"
            className={`form-input ${displayError ? 'border-red-500' : ''}`}
            value={form.release_number}
            onChange={handleReleaseNumberChange}
            placeholder="e.g., 10.1.12 or 10.1.12-rc"
            required
          />
          {displayError && <p className="mt-1 text-xs text-red-500">{displayError}</p>}
          <p className="mt-1 text-xs text-co-gray-500">
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
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-medium text-co-gray-700"
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Release'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default ReleaseFormModal;
