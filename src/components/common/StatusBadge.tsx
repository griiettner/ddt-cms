type StatusType = 'open' | 'closed' | 'archived' | 'passed' | 'failed';

interface StatusBadgeProps {
  status: StatusType | string;
}

function StatusBadge({ status }: StatusBadgeProps): JSX.Element {
  const statusClasses: Record<StatusType, string> = {
    open: 'status-open',
    closed: 'status-closed',
    archived: 'status-archived',
    passed: 'bg-success-light text-success',
    failed: 'bg-error-light text-error',
  };

  const className = statusClasses[status as StatusType] || 'bg-co-gray-100 text-co-gray-600';

  return <span className={`status-pill ${className}`}>{status}</span>;
}

export default StatusBadge;
