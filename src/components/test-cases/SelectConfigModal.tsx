import { Modal } from '@/components/common';
import type { SelectConfig } from '@/types/entities';

interface SelectConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  configType: string;
  selectedId: string;
  setSelectedId: (id: string) => void;
  name: string;
  setName: (name: string) => void;
  options: string;
  setOptions: (options: string) => void;
  allConfigs: SelectConfig[];
}

function SelectConfigModal({
  isOpen,
  onClose,
  onSave,
  configType,
  selectedId,
  setSelectedId,
  name,
  setName,
  options,
  setOptions,
  allConfigs,
}: SelectConfigModalProps): JSX.Element {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={configType === 'url' ? 'Manage URL Options' : 'Manage Select Options'}
    >
      <p className="mb-2 text-xs font-bold uppercase text-co-gray-500">Choose Existing Dropdown</p>
      <select
        className="form-input mb-4"
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
      >
        <option value="">-- Create New --</option>
        {allConfigs
          .filter((c) => c.config_type === configType)
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
      </select>

      <p className="mb-2 text-xs font-bold uppercase text-co-gray-500">Dropdown Name</p>
      <input
        className="form-input mb-4"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g., Countries, Statuses..."
      />

      <p className="mb-2 text-xs font-bold uppercase text-co-gray-500">Options (one per line)</p>
      <textarea
        className="textarea-full"
        value={options}
        onChange={(e) => setOptions(e.target.value)}
        placeholder="Option 1&#10;Option 2&#10;Option 3"
      />

      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 font-medium text-co-gray-700">
          Cancel
        </button>
        <button onClick={onSave} className="btn-primary">
          Save & Apply
        </button>
      </div>
    </Modal>
  );
}

export default SelectConfigModal;
