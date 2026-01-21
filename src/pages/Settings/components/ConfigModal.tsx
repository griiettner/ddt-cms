/**
 * Config Modal Component
 */
import type { FormEvent } from 'react';
import { Modal } from '@/components/common';
import type { ConfigCategory } from '@/types/entities';
import type { SettingsFormData } from '../hooks/useSettingsPage';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  category: ConfigCategory;
  form: SettingsFormData;
  onDisplayNameChange: (value: string) => void;
  onKeyChange: (value: string) => void;
  onResultTypeChange: (value: string) => void;
  isSubmitting: boolean;
}

function ConfigModal({
  isOpen,
  onClose,
  onSubmit,
  category,
  form,
  onDisplayNameChange,
  onKeyChange,
  onResultTypeChange,
  isSubmitting,
}: ConfigModalProps): JSX.Element {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={category === 'type' ? 'Add New Element Type' : 'Add New Test Action'}
    >
      <form onSubmit={onSubmit}>
        <div className="mb-4">
          <label className="form-label">Display Name</label>
          <input
            type="text"
            className="form-input"
            value={form.display_name}
            onChange={(e) => onDisplayNameChange(e.target.value)}
            placeholder="e.g., Text Input"
            required
          />
        </div>
        <div className="mb-4">
          <label className="form-label">Key (auto-generated)</label>
          <input
            type="text"
            className="form-input font-mono"
            value={form.key}
            onChange={(e) => onKeyChange(e.target.value)}
            placeholder="e.g., text_input"
            required
          />
        </div>
        {category === 'action' && (
          <div className="mb-4">
            <label className="form-label">Result Type</label>
            <select
              className="form-input"
              value={form.result_type}
              onChange={(e) => onResultTypeChange(e.target.value)}
            >
              <option value="">None</option>
              <option value="text">Text</option>
              <option value="checkbox">Checkbox</option>
              <option value="select">Select</option>
              <option value="array">Array</option>
            </select>
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
            {isSubmitting ? 'Adding...' : `Add ${category === 'type' ? 'Type' : 'Action'}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default ConfigModal;
