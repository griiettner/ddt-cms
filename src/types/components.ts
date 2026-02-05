/**
 * Component Prop Types
 */

import type { ReactNode } from 'react';

// Modal Types
export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface ConfirmModalProps extends BaseModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  isLoading?: boolean;
  variant?: 'danger' | 'warning' | 'info';
}

export interface ModalProps extends BaseModalProps {
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
}

// Table Types
export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  width?: string;
  render?: (item: T, index: number) => ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  totalItems?: number;
}

// Form Types
export interface FormFieldProps {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

export interface SelectOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

// Status Types
export type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'default';

export interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  size?: 'sm' | 'md' | 'lg';
}

// Empty State Types
export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Loading Types
export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Navbar Types
export interface NavItem {
  path: string;
  label: string;
  icon?: ReactNode;
}

// Kebab Menu Types
export interface KebabMenuItem {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

export interface KebabMenuProps {
  items: KebabMenuItem[];
  className?: string;
}

// Release Selector Types
export interface ReleaseSelectorProps {
  className?: string;
}
