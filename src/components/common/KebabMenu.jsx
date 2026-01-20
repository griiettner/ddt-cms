import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

function KebabMenu({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, flipUp: false });
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  // Calculate menu position when opened
  const updateMenuPosition = useCallback(() => {
    if (!buttonRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const menuHeight = 160; // Approximate menu height
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - buttonRect.bottom;
    const flipUp = spaceBelow < menuHeight && buttonRect.top > menuHeight;

    setMenuPosition({
      top: flipUp ? buttonRect.top - 8 : buttonRect.bottom + 4,
      left: buttonRect.right,
      flipUp,
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    function handleScroll() {
      if (isOpen) {
        updateMenuPosition();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen, updateMenuPosition]);

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!isOpen) {
      updateMenuPosition();
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="kebab-btn"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {isOpen && createPortal(
        <div
          ref={menuRef}
          className="floating-menu"
          style={{
            position: 'fixed',
            top: menuPosition.flipUp ? 'auto' : menuPosition.top,
            bottom: menuPosition.flipUp ? `${window.innerHeight - menuPosition.top}px` : 'auto',
            right: `${window.innerWidth - menuPosition.left}px`,
            zIndex: 9999,
          }}
          onClick={() => setIsOpen(false)}
        >
          {children}
        </div>,
        document.body
      )}
    </div>
  );
}

function KebabMenuItem({ onClick, children, variant = 'default' }) {
  const variantClasses = {
    default: '',
    danger: 'text-co-red hover:bg-red-50',
  };

  return (
    <button
      onClick={onClick}
      className={variantClasses[variant]}
    >
      {children}
    </button>
  );
}

KebabMenu.Item = KebabMenuItem;

export default KebabMenu;
