import { Modal } from '@/components/common';
import type { MatchConfig } from '@/types/entities';

interface MatchConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  selectedId: string;
  setSelectedId: (id: string) => void;
  name: string;
  setName: (name: string) => void;
  options: string;
  setOptions: (options: string) => void;
  allConfigs: MatchConfig[];
}

function MatchConfigModal({
  isOpen,
  onClose,
  onSave,
  selectedId,
  setSelectedId,
  name,
  setName,
  options,
  setOptions,
  allConfigs,
}: MatchConfigModalProps): JSX.Element {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Match Options">
      <p className="mb-2 text-xs font-bold uppercase text-co-gray-500">Choose Existing Match Set</p>
      <select
        className="form-input mb-4"
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
      >
        <option value="">-- Create New --</option>
        {allConfigs.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <p className="mb-2 text-xs font-bold uppercase text-co-gray-500">Match Set Name</p>
      <input
        className="form-input mb-4"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g., Expected Status Values..."
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

export default MatchConfigModal;
