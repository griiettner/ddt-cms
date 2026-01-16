function EmptyState({ icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon && (
        <div className="text-4xl mb-4">{icon}</div>
      )}
      <h3 className="text-xl font-bold text-co-blue mb-2">{title}</h3>
      {message && (
        <p className="text-co-gray-500 mb-6 max-w-md">{message}</p>
      )}
      {action && action}
    </div>
  );
}

export default EmptyState;
