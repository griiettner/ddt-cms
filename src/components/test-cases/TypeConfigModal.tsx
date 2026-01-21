import { Modal } from '@/components/common';

interface TypeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  category: string | null | undefined;
  options: string;
  setOptions: (options: string) => void;
}

function TypeConfigModal({
  isOpen,
  onClose,
  onSave,
  category,
  options,
  setOptions,
}: TypeConfigModalProps): JSX.Element {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit ${category?.toUpperCase()} Options`}>
      <p className="mb-3 text-xs font-bold uppercase text-co-gray-500">One option per line</p>
      <textarea
        className="textarea-full"
        value={options}
        onChange={(e) => setOptions(e.target.value)}
        placeholder="option1&#10;option2"
      />
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 font-medium text-co-gray-700">
          Cancel
        </button>
        <button onClick={onSave} className="btn-primary">
          Save Options
        </button>
      </div>
    </Modal>
  );
}

export default TypeConfigModal;
