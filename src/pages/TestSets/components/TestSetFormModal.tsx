import type { FormEvent } from 'react';
import { Modal } from '@/components/common';
import type { FlatCategory } from '@/types/entities';

interface TestSetFormData {
  name: string;
  description: string;
  category_id: number | null;
}

interface TestSetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  form: TestSetFormData;
  onFormChange: (key: keyof TestSetFormData, value: string | number | null) => void;
  categoriesFlat?: FlatCategory[];
  isEditing: boolean;
  isSubmitting: boolean;
}

function TestSetFormModal({
  isOpen,
  onClose,
  onSubmit,
  form,
  onFormChange,
  categoriesFlat = [],
  isEditing,
  isSubmitting,
}: TestSetFormModalProps): JSX.Element {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Test Set' : 'New Test Set'}>
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
        <div className="mb-4">
          <label className="form-label">Category</label>
          <select
            className="form-input"
            value={form.category_id || ''}
            onChange={(e) =>
              onFormChange('category_id', e.target.value ? parseInt(e.target.value) : null)
            }
          >
            <option value="">No Category</option>
            {categoriesFlat.map((cat) => (
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
            {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Test Set'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default TestSetFormModal;
