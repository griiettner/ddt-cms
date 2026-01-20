/**
 * Releases Table Component
 */
import { Link } from '@tanstack/react-router';
import { StatusBadge, KebabMenu, Pagination } from '../../../components/common';
import { toReleaseSlug } from '../../../lib/urlUtils';

function ReleasesTable({
  releases,
  pagination,
  onPageChange,
  onEditClick,
  onActionClick,
  onDeleteClick,
  onNoteSave,
}) {
  return (
    <div className="card">
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Release</th>
              <th>Description</th>
              <th>Notes</th>
              <th>Status</th>
              <th>Created</th>
              <th>Closed</th>
              <th className="text-center">Test Sets</th>
              <th className="text-center">Test Cases</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {releases.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center text-co-gray-500 italic py-10">
                  No releases found.
                </td>
              </tr>
            ) : (
              releases.map((r) => (
                <tr key={r.id}>
                  <td className="font-bold">
                    <Link
                      to="/$releaseId"
                      params={{ releaseId: toReleaseSlug(r.release_number) }}
                      className="text-co-blue hover:text-co-blue-hover hover:underline"
                    >
                      {r.release_number}
                    </Link>
                  </td>
                  <td className="text-co-gray-600">{r.description || '-'}</td>
                  <td>
                    <div
                      className="notes-editor"
                      contentEditable={r.status !== 'archived'}
                      suppressContentEditableWarning
                      onBlur={(e) => onNoteSave(r.id, e.currentTarget.textContent)}
                    >
                      {r.notes || ''}
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="text-xs text-co-gray-500">
                    <div>{new Date(r.created_at).toLocaleDateString()}</div>
                    <div className="font-bold uppercase">{r.created_by}</div>
                  </td>
                  <td className="text-xs text-co-gray-500">
                    {r.closed_at ? (
                      <>
                        <div>{new Date(r.closed_at).toLocaleDateString()}</div>
                        <div className="font-bold uppercase">{r.closed_by || ''}</div>
                      </>
                    ) : '-'}
                  </td>
                  <td className="text-center font-bold text-co-blue">
                    {r.testSetCount || 0}
                  </td>
                  <td className="text-center font-bold text-co-blue">
                    {r.testCaseCount || 0}
                  </td>
                  <td className="text-right">
                    <KebabMenu>
                      <KebabMenu.Item onClick={() => onEditClick(r)}>
                        Edit Details
                      </KebabMenu.Item>
                      {r.status !== 'closed' ? (
                        <KebabMenu.Item onClick={() => onActionClick(r.id, 'close')}>
                          Close Release
                        </KebabMenu.Item>
                      ) : (
                        <KebabMenu.Item onClick={() => onActionClick(r.id, 'reopen')}>
                          Reopen Release
                        </KebabMenu.Item>
                      )}
                      {r.status !== 'archived' && (
                        <KebabMenu.Item onClick={() => onActionClick(r.id, 'archive')}>
                          Archive Release
                        </KebabMenu.Item>
                      )}
                      {r.status === 'open' && (
                        <KebabMenu.Item
                          variant="danger"
                          onClick={() => onDeleteClick(r.id)}
                        >
                          Delete Release
                        </KebabMenu.Item>
                      )}
                    </KebabMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        pagination={pagination}
        onPageChange={onPageChange}
      />
    </div>
  );
}

export default ReleasesTable;
