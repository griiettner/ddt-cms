import { Link, useParams } from '@tanstack/react-router';
import { KebabMenu, Pagination } from '@/components/common';
import { useRelease } from '@/context/ReleaseContext';
import type { TestSet } from '@/types/entities';

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface TestSetsTableProps {
  testSets: TestSet[];
  pagination: PaginationData;
  onPageChange: (page: number) => void;
  onEditClick: (testSet: TestSet) => void;
  onDeleteClick: (id: number) => void;
  onNavigate: (id: number) => void;
}

function TestSetsTable({
  testSets,
  pagination,
  onPageChange,
  onEditClick,
  onDeleteClick,
  onNavigate,
}: TestSetsTableProps): JSX.Element {
  const params = useParams({ strict: false }) as { releaseId?: string };
  const { releaseSlug } = useRelease();
  const slug = releaseSlug || params.releaseId || '';

  return (
    <div className="card">
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Description</th>
              <th className="text-center">Cases</th>
              <th className="text-center">Scenarios</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {testSets.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center italic text-co-gray-500">
                  No test sets found for this release.
                </td>
              </tr>
            ) : (
              testSets.map((ts) => (
                <tr key={ts.id}>
                  <td className="font-bold">
                    <Link
                      to="/$releaseId/test-cases"
                      params={{ releaseId: slug }}
                      search={{ testSetId: ts.id }}
                      className="text-co-blue hover:underline"
                    >
                      {ts.name}
                    </Link>
                  </td>
                  <td className="text-sm text-co-gray-600">
                    {ts.category?.name || (
                      <span className="text-co-gray-400 italic">Uncategorized</span>
                    )}
                  </td>
                  <td className="max-w-xs truncate text-co-gray-600">{ts.description || '-'}</td>
                  <td className="text-center font-bold text-co-blue">{ts.caseCount || 0}</td>
                  <td className="text-center font-bold text-co-blue">{ts.scenarioCount || 0}</td>
                  <td className="text-xs text-co-gray-500">
                    {new Date(ts.created_at).toLocaleDateString()}
                  </td>
                  <td className="text-right">
                    <KebabMenu>
                      <KebabMenu.Item onClick={() => onNavigate(ts.id)}>
                        View Test Cases
                      </KebabMenu.Item>
                      <KebabMenu.Item onClick={() => onEditClick(ts)}>Edit Details</KebabMenu.Item>
                      <KebabMenu.Item variant="danger" onClick={() => onDeleteClick(ts.id)}>
                        Delete Test Set
                      </KebabMenu.Item>
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

export default TestSetsTable;
