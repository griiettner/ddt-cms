/**
 * Category Form Modal Component
 * For creating and editing categories
 */
import { Modal } from '../../../components/common';

function CategoryFormModal({
  isOpen,
  onClose,
  onSubmit,
  form,
  onFormChange,
  categoriesFlat,
  isEditing,
  isSubmitting,
  parentCategory,
}) {
  const title = isEditing
    ? 'Edit Category'
    : parentCategory
    ? `New Subcategory in "${parentCategory.name}"`
    : 'New Category';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={onSubmit}>
        <div className="mb-4">
          <label className="form-label">Name</label>
          <input
            type="text"
            className="form-input"
            value={form.name}
            onChange={(e) => onFormChange('name', e.target.value)}
            placeholder="e.g., User Management"
            required
            autoFocus
          />
        </div>

        <div className="mb-4">
          <label className="form-label">Description</label>
          <textarea
            className="form-input h-20 resize-none"
            value={form.description}
            onChange={(e) => onFormChange('description', e.target.value)}
            placeholder="Optional description"
          />
        </div>

        <div className="mb-4">
          <label className="form-label">Parent Category</label>
          <select
            className="form-input"
            value={form.parent_id || ''}
            onChange={(e) => onFormChange('parent_id', e.target.value ? parseInt(e.target.value) : null)}
          >
            <option value="">No Parent (Root Category)</option>
            {categoriesFlat
              .filter((c) => c.id !== form.id) // Can't be parent of itself
              .map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.displayName}
                </option>
              ))}
          </select>
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
            {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Category'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default CategoryFormModal;
