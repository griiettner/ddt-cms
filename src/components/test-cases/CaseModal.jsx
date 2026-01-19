import { Modal } from '../common';

function CaseModal({ isOpen, onClose, onSubmit, name, setName }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New Test Case"
    >
      <form onSubmit={onSubmit}>
        <div className="mb-4">
          <label className="form-label">Case Name (e.g., User Login)</label>
          <input
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter case name..."
            required
          />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button type="button" onClick={onClose} className="px-4 py-2 text-co-gray-700 font-medium">
            Cancel
          </button>
          <button type="submit" className="btn-primary">Create Case</button>
        </div>
      </form>
    </Modal>
  );
}

export default CaseModal;
