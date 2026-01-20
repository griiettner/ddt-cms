/**
 * Release Form Modal Component
 */
import { Modal } from '../../../components/common';

function ReleaseFormModal({
  isOpen,
  onClose,
  onSubmit,
  form,
  onFormChange,
  isEditing,
  isSubmitting,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Release' : 'New Release'}
    >
      <form onSubmit={onSubmit}>
        <div className="mb-4">
          <label className="form-label">Release Number</label>
          <input
            type="text"
            className="form-input"
            value={form.release_number}
            onChange={(e) => onFormChange('release_number', e.target.value)}
            placeholder="e.g., v1.0.0"
            required
          />
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
