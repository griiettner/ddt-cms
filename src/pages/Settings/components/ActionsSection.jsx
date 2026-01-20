/**
 * Actions Section Component
 */
function ActionsSection({ actions, onAddClick, onDeleteClick }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="card-header mb-0">Test Actions</h2>
        <button
          onClick={() => onAddClick('action')}
          className="btn-primary btn-sm"
        >
          + Add Action
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Display Name</th>
              <th>Key</th>
              <th>Result Type</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {actions.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center text-co-gray-500 italic py-8">
                  No test actions configured.
                </td>
              </tr>
            ) : (
              actions.map((a) => (
                <tr key={a.id}>
                  <td className="font-semibold text-co-blue">{a.display_name}</td>
                  <td className="text-co-gray-500 font-mono text-xs">{a.key}</td>
                  <td>
                    <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-co-gray-100 text-co-gray-600">
                      {a.result_type || 'None'}
                    </span>
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => onDeleteClick(a.id)}
                      className="text-co-red hover:underline text-sm"
                    >
                      &times; Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ActionsSection;
