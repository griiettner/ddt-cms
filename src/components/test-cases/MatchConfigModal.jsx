import { Modal } from '../common';

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
  allConfigs 
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Match Options"
    >
      <p className="text-xs text-co-gray-500 mb-2 uppercase font-bold">Choose Existing Match Set</p>
      <select
        className="form-input mb-4"
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
      >
        <option value="">-- Create New --</option>
        {allConfigs.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      <p className="text-xs text-co-gray-500 mb-2 uppercase font-bold">Match Set Name</p>
      <input
        className="form-input mb-4"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g., Expected Status Values..."
      />

      <p className="text-xs text-co-gray-500 mb-2 uppercase font-bold">Options (one per line)</p>
      <textarea
        className="textarea-full"
        value={options}
        onChange={(e) => setOptions(e.target.value)}
        placeholder="Option 1&#10;Option 2&#10;Option 3"
      />

      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="px-4 py-2 text-co-gray-700 font-medium">
          Cancel
        </button>
        <button onClick={onSave} className="btn-primary">Save & Apply</button>
      </div>
    </Modal>
  );
}

export default MatchConfigModal;
