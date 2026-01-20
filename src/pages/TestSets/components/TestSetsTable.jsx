/**
 * TestSets Table Component
 */
import { Link } from '@tanstack/react-router';
import { KebabMenu, Pagination } from '../../../components/common';

function TestSetsTable({
  testSets,
  pagination,
  onPageChange,
  onEditClick,
  onDeleteClick,
  onNavigate,
}) {
  return (
    <div className="card">
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
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
                <td colSpan="6" className="text-center text-co-gray-500 italic py-10">
                  No test sets found for this release.
                </td>
              </tr>
            ) : (
              testSets.map((ts) => (
                <tr key={ts.id}>
                  <td className="font-bold">
                    <Link
                      to="/test-cases"
                      search={{ testSetId: ts.id }}
                      className="text-co-blue hover:underline"
                    >
                      {ts.name}
                    </Link>
                  </td>
                  <td className="text-co-gray-600 max-w-xs truncate">
                    {ts.description || '-'}
                  </td>
                  <td className="text-center font-bold text-co-blue">
                    {ts.caseCount || 0}
                  </td>
                  <td className="text-center font-bold text-co-blue">
                    {ts.scenarioCount || 0}
                  </td>
                  <td className="text-xs text-co-gray-500">
                    {new Date(ts.created_at).toLocaleDateString()}
                  </td>
                  <td className="text-right">
                    <KebabMenu>
                      <KebabMenu.Item onClick={() => onNavigate(ts.id)}>
                        View Test Cases
                      </KebabMenu.Item>
                      <KebabMenu.Item onClick={() => onEditClick(ts)}>
                        Edit Details
                      </KebabMenu.Item>
                      <KebabMenu.Item
                        variant="danger"
                        onClick={() => onDeleteClick(ts.id)}
                      >
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

      <Pagination
        pagination={pagination}
        onPageChange={onPageChange}
      />
    </div>
  );
}

export default TestSetsTable;
