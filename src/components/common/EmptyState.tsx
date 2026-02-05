import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
}

function EmptyState({ icon, title, message, action }: EmptyStateProps): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {icon && <div className="mb-4 text-4xl">{icon}</div>}
      <h3 className="mb-2 text-xl font-bold text-co-blue">{title}</h3>
      {message && <p className="mb-6 max-w-md text-co-gray-500">{message}</p>}
      {action && action}
    </div>
  );
}

export default EmptyState;
