/**
 * Types Section Component
 */
import type { ConfigOption } from '@/types/entities';

interface TypesSectionProps {
  types: ConfigOption[];
  onAddClick: (category: 'type') => void;
  onDeleteClick: (id: number) => void;
}

function TypesSection({ types, onAddClick, onDeleteClick }: TypesSectionProps): JSX.Element {
  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="card-header mb-0">Element Types</h2>
        <button onClick={() => onAddClick('type')} className="btn-primary btn-sm">
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
                <td colSpan={3} className="py-8 text-center italic text-co-gray-500">
                  No element types configured.
                </td>
              </tr>
            ) : (
              types.map((t) => (
                <tr key={t.id}>
                  <td className="font-semibold text-co-blue">{t.display_name}</td>
                  <td className="font-mono text-xs text-co-gray-500">{t.key}</td>
                  <td className="text-right">
                    <button
                      onClick={() => onDeleteClick(t.id)}
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

export default TypesSection;
