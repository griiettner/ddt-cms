/**
 * Types Section Component
 */
function TypesSection({ types, onAddClick, onDeleteClick }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="card-header mb-0">Element Types</h2>
        <button
          onClick={() => onAddClick('type')}
          className="btn-primary btn-sm"
        >
          + Add Type
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Display Name</th>
              <th>Key</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {types.length === 0 ? (
              <tr>
                <td colSpan="3" className="text-center text-co-gray-500 italic py-8">
                  No element types configured.
                </td>
              </tr>
            ) : (
              types.map((t) => (
                <tr key={t.id}>
                  <td className="font-semibold text-co-blue">{t.display_name}</td>
                  <td className="text-co-gray-500 font-mono text-xs">{t.key}</td>
                  <td className="text-right">
                    <button
                      onClick={() => onDeleteClick(t.id)}
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

export default TypesSection;
