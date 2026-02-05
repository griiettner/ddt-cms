import type { FormEvent } from 'react';
import { Modal } from '@/components/common';
import type { Category, FlatCategory } from '@/types/entities';

interface CategoryFormData {
  id?: number;
  name: string;
  description: string;
  parent_id: number | null;
}

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  form: CategoryFormData;
  onFormChange: (key: keyof CategoryFormData, value: string | number | null) => void;
  categoriesFlat: FlatCategory[];
  isEditing: boolean;
  isSubmitting: boolean;
  parentCategory: Category | null;
}

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
}: CategoryFormModalProps): JSX.Element {
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
            onChange={(e) =>
              onFormChange('parent_id', e.target.value ? parseInt(e.target.value) : null)
            }
          >
            <option value="">No Parent (Root Category)</option>
            {categoriesFlat
              .filter((c) => c.id !== form.id)
              .map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.displayName}
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
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Category'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default CategoryFormModal;
