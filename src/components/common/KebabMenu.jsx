import { useState, useRef, useEffect } from 'react';

function KebabMenu({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="kebab-btn"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="floating-menu right-0 top-full mt-1"
          onClick={() => setIsOpen(false)}
        >
          {children}
        </div>
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
