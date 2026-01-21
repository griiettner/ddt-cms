/**
 * Actions Section Component
 */
import type { ConfigOption } from '@/types/entities';

interface ActionsSectionProps {
  actions: ConfigOption[];
  onAddClick: (category: 'action') => void;
  onDeleteClick: (id: number) => void;
}

function ActionsSection({ actions, onAddClick, onDeleteClick }: ActionsSectionProps): JSX.Element {
  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="card-header mb-0">Test Actions</h2>
        <button onClick={() => onAddClick('action')} className="btn-primary btn-sm">
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
                <td colSpan={4} className="py-8 text-center italic text-co-gray-500">
                  No test actions configured.
                </td>
              </tr>
            ) : (
              actions.map((a) => (
                <tr key={a.id}>
                  <td className="font-semibold text-co-blue">{a.display_name}</td>
                  <td className="font-mono text-xs text-co-gray-500">{a.key}</td>
                  <td>
                    <span className="rounded-full bg-co-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-co-gray-600">
                      {a.result_type || 'None'}
                    </span>
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => onDeleteClick(a.id)}
                      className="text-sm text-co-red hover:underline"
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
