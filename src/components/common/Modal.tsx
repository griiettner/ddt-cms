import { useEffect, useCallback, type ReactNode, type MouseEvent } from 'react';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: ModalSize;
}

function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps): JSX.Element | null {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  const isFullscreen = size === 'fullscreen';

  const sizeClasses: Record<ModalSize, string> = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    fullscreen: 'w-full h-full max-w-none',
  };

  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-white">
        <div className="modal-header shrink-0">
          <h3 className="font-bold">{title}</h3>
          <button
            onClick={onClose}
            className="text-2xl leading-none text-white/80 hover:text-white"
          >
            &times;
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className={`modal-card ${sizeClasses[size]}`}>
        <div className="modal-header">
          <h3 className="font-bold">{title}</h3>
          <button
            onClick={onClose}
            className="text-2xl leading-none text-white/80 hover:text-white"
          >
            &times;
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
