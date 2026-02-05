import { useState, useRef, useEffect, useCallback, type ReactNode, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';

type MenuVariant = 'default' | 'danger';

interface MenuPosition {
  top: number;
  left: number;
  flipUp: boolean;
}

interface KebabMenuProps {
  children: ReactNode;
}

interface KebabMenuItemProps {
  onClick: () => void;
  children: ReactNode;
  variant?: MenuVariant;
}

function KebabMenu({ children }: KebabMenuProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({
    top: 0,
    left: 0,
    flipUp: false,
  });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const updateMenuPosition = useCallback(() => {
    if (!buttonRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const menuHeight = 160;
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
    function handleClickOutside(event: Event) {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
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

  const handleToggle = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!isOpen) {
      updateMenuPosition();
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative">
      <button ref={buttonRef} onClick={handleToggle} className="kebab-btn">
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {isOpen &&
        createPortal(
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

function KebabMenuItem({
  onClick,
  children,
  variant = 'default',
}: KebabMenuItemProps): JSX.Element {
  const variantClasses: Record<MenuVariant, string> = {
    default: '',
    danger: 'text-co-red hover:bg-red-50',
  };

  return (
    <button onClick={onClick} className={variantClasses[variant]}>
      {children}
    </button>
  );
}

KebabMenu.Item = KebabMenuItem;

export default KebabMenu;
