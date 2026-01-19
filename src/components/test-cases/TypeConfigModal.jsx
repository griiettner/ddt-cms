import { Modal } from '../common';

function TypeConfigModal({ isOpen, onClose, onSave, category, options, setOptions }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit ${category?.toUpperCase()} Options`}
    >
      <p className="text-xs text-co-gray-500 mb-3 uppercase font-bold">One option per line</p>
      <textarea
        className="textarea-full"
        value={options}
        onChange={(e) => setOptions(e.target.value)}
        placeholder="option1&#10;option2"
      />
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="px-4 py-2 text-co-gray-700 font-medium">
          Cancel
        </button>
        <button onClick={onSave} className="btn-primary">Save Options</button>
      </div>
    </Modal>
  );
}

export default TypeConfigModal;
