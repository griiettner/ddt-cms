/**
 * TestSet Form Modal Component
 */
import { Modal } from '../../../components/common';

function TestSetFormModal({
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
      title={isEditing ? 'Edit Test Set' : 'New Test Set'}
    >
      <form onSubmit={onSubmit}>
        <div className="mb-4">
          <label className="form-label">Name</label>
          <input
            type="text"
            className="form-input"
            value={form.name}
            onChange={(e) => onFormChange('name', e.target.value)}
            placeholder="e.g., User Authentication"
            required
          />
        </div>
        <div className="mb-4">
          <label className="form-label">Description</label>
          <textarea
            className="form-input h-24 resize-none"
            value={form.description}
            onChange={(e) => onFormChange('description', e.target.value)}
            placeholder="Optional description"
          />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-co-gray-700 font-medium"
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Test Set')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default TestSetFormModal;
