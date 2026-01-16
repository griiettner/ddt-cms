function StatusBadge({ status }) {
  const statusClasses = {
    open: 'status-open',
    closed: 'status-closed',
    archived: 'status-archived',
    passed: 'bg-success-light text-success',
    failed: 'bg-error-light text-error',
  };

  return (
    <span className={`status-pill ${statusClasses[status] || 'bg-co-gray-100 text-co-gray-600'}`}>
      {status}
    </span>
  );
}

export default StatusBadge;
