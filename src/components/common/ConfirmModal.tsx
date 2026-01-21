import type { MouseEvent } from 'react';

type ConfirmVariant = 'danger' | 'warning' | 'primary';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  confirmVariant?: ConfirmVariant;
}

function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Delete',
  confirmVariant = 'danger',
}: ConfirmModalProps): JSX.Element | null {
  if (!isOpen) return null;

  const confirmClasses: Record<ConfirmVariant, string> = {
    danger: 'bg-red-600 hover:bg-red-700 shadow-red-200',
    warning: 'bg-yellow-500 hover:bg-yellow-600 shadow-yellow-200',
    primary: 'bg-co-blue hover:bg-co-blue-hover shadow-co-blue/20',
  };

  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-card max-w-sm">
        <div className="p-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-xl font-bold text-co-blue">{title}</h3>
          <p className="mb-6 text-sm text-co-gray-500">{message}</p>
          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded bg-co-gray-100 px-4 py-2 font-bold text-co-gray-700 transition-colors hover:bg-co-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className={`flex-1 rounded px-4 py-2 font-bold text-white shadow-lg transition-colors ${confirmClasses[confirmVariant]}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
