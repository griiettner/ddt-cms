import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { testSetsApi } from '../services/api';
import { useRelease } from '../context/ReleaseContext';
import {
  Modal,
  ConfirmModal,
  Pagination,
  ReleaseSelector,
  KebabMenu,
  LoadingSpinner,
} from '../components/common';

function TestSets() {
  const { selectedReleaseId } = useRelease();
  const [testSets, setTestSets] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [filters, setFilters] = useState({ search: '' });
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTestSet, setEditingTestSet] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });

  // Form state
  const [form, setForm] = useState({ name: '', description: '' });

  const loadTestSets = useCallback(async () => {
    if (!selectedReleaseId) return;

    try {
      setLoading(true);
      const query = {
        page: pagination.page,
        limit: pagination.limit,
        search: filters.search,
      };
      const res = await testSetsApi.list(selectedReleaseId, query);
      setTestSets(res.data);
      setPagination(res.pagination);
    } catch (err) {
      console.error('Failed to load test sets', err);
    } finally {
      setLoading(false);
    }
  }, [selectedReleaseId, pagination.page, pagination.limit, filters.search]);

  useEffect(() => {
    loadTestSets();
  }, [loadTestSets]);

  function openCreateModal() {
    setEditingTestSet(null);
    setForm({ name: '', description: '' });
    setIsModalOpen(true);
  }

  function openEditModal(testSet) {
    setEditingTestSet(testSet);
    setForm({
      name: testSet.name,
      description: testSet.description || '',
    });
    setIsModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editingTestSet) {
        await testSetsApi.update(selectedReleaseId, editingTestSet.id, form);
      } else {
        await testSetsApi.create(selectedReleaseId, form);
      }
      setIsModalOpen(false);
      loadTestSets();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDelete() {
    try {
      await testSetsApi.delete(selectedReleaseId, deleteConfirm.id);
      setDeleteConfirm({ open: false, id: null });
      loadTestSets();
    } catch (err) {
      alert(err.message);
    }
  }

  function applyFilters() {
    setPagination(p => ({ ...p, page: 1 }));
  }

  function resetFilters() {
    setFilters({ search: '' });
    setPagination(p => ({ ...p, page: 1 }));
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-co-gray-900">Test Suites</h1>
          <p className="text-co-gray-600 mt-1">Manage test suites for your release</p>
        </div>
        <div className="flex items-center gap-4">
          <ReleaseSelector className="w-48" />
          <button onClick={openCreateModal} className="btn-primary">
            + New Test Suite
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search test suites..."
            className="form-input flex-1"
            value={filters.search}
            onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          />
          <button onClick={applyFilters} className="btn-primary btn-sm">
            Apply
          </button>
          <button onClick={resetFilters} className="btn-outline btn-sm">
            Reset
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <LoadingSpinner className="py-20" />
        ) : (
          <>
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
                        No test suites found for this release.
                      </td>
                    </tr>
                  ) : (
                    testSets.map((ts) => (
                      <tr key={ts.id}>
                        <td className="font-bold">
                          <Link
                            to={`/test-cases?testSetId=${ts.id}`}
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
                            <KebabMenu.Item onClick={() => window.location.href = `/test-cases?testSetId=${ts.id}`}>
                              View Test Cases
                            </KebabMenu.Item>
                            <KebabMenu.Item onClick={() => openEditModal(ts)}>
                              Edit Details
                            </KebabMenu.Item>
                            <KebabMenu.Item
                              variant="danger"
                              onClick={() => setDeleteConfirm({ open: true, id: ts.id })}
                            >
                              Delete Suite
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
              onPageChange={(page) => setPagination(p => ({ ...p, page }))}
            />
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTestSet ? 'Edit Test Suite' : 'New Test Suite'}
      >
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="form-label">Name</label>
            <input
              type="text"
              className="form-input"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g., User Authentication"
              required
            />
          </div>
          <div className="mb-4">
            <label className="form-label">Description</label>
            <textarea
              className="form-input h-24 resize-none"
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Optional description"
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-co-gray-700 font-medium"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingTestSet ? 'Save Changes' : 'Create Suite'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
        onConfirm={handleDelete}
        title="Delete Test Suite?"
        message="Are you sure you want to delete this test suite and all associated cases/steps? This action cannot be undone."
        confirmText="Delete Suite"
      />
    </div>
  );
}

export default TestSets;
