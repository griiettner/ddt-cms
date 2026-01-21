import { Link } from '@tanstack/react-router';
import { StatusBadge, KebabMenu, Pagination } from '@/components/common';
import { toReleaseSlug } from '@/lib/urlUtils';
import type { Release } from '@/types/entities';

type ReleaseAction = 'close' | 'reopen' | 'archive';

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface ReleasesTableProps {
  releases: Release[];
  pagination: PaginationData;
  onPageChange: (page: number) => void;
  onEditClick: (release: Release) => void;
  onActionClick: (id: number, action: ReleaseAction) => void;
  onDeleteClick: (id: number) => void;
  onNoteSave: (id: number, notes: string) => void;
}

function ReleasesTable({
  releases,
  pagination,
  onPageChange,
  onEditClick,
  onActionClick,
  onDeleteClick,
  onNoteSave,
}: ReleasesTableProps): JSX.Element {
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
                <td colSpan={9} className="py-10 text-center italic text-co-gray-500">
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
                      onBlur={(e) => onNoteSave(r.id, e.currentTarget.textContent || '')}
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
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="text-center font-bold text-co-blue">{r.testSetCount || 0}</td>
                  <td className="text-center font-bold text-co-blue">{r.testCaseCount || 0}</td>
                  <td className="text-right">
                    <KebabMenu>
                      <KebabMenu.Item onClick={() => onEditClick(r)}>Edit Details</KebabMenu.Item>
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
                        <KebabMenu.Item variant="danger" onClick={() => onDeleteClick(r.id)}>
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

      <Pagination pagination={pagination} onPageChange={onPageChange} />
    </div>
  );
}

export default ReleasesTable;
