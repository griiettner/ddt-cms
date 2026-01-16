import { useState, useEffect, useCallback } from 'react';
import { releasesApi } from '../services/api';
import { useRelease } from '../context/ReleaseContext';
import {
  Modal,
  ConfirmModal,
  Pagination,
  StatusBadge,
  KebabMenu,
  LoadingSpinner,
} from '../components/common';

function Releases() {
  const { refreshReleases } = useRelease();
  const [releases, setReleases] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [filters, setFilters] = useState({ search: '', status: '', from_date: '', to_date: '' });
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRelease, setEditingRelease] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });

  // Form state
  const [form, setForm] = useState({ release_number: '', description: '', notes: '' });

  const loadReleases = useCallback(async () => {
    try {
      setLoading(true);
      const query = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      };
      const res = await releasesApi.list(query);
      setReleases(res.data);
      setPagination(res.pagination);
    } catch (err) {
      console.error('Failed to load releases', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => {
    loadReleases();
  }, [loadReleases]);

  function openCreateModal() {
    setEditingRelease(null);
    setForm({ release_number: '', description: '', notes: '' });
    setIsModalOpen(true);
  }

  function openEditModal(release) {
    setEditingRelease(release);
    setForm({
      release_number: release.release_number,
      description: release.description || '',
      notes: release.notes || '',
    });
    setIsModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editingRelease) {
        await releasesApi.update(editingRelease.id, form);
      } else {
        await releasesApi.create(form);
      }
      setIsModalOpen(false);
      loadReleases();
      refreshReleases();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleAction(id, action) {
    try {
      switch (action) {
        case 'close':
          await releasesApi.close(id);
          break;
        case 'reopen':
          await releasesApi.reopen(id);
          break;
        case 'archive':
          await releasesApi.archive(id);
          break;
      }
      loadReleases();
      refreshReleases();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDelete() {
    try {
      await releasesApi.delete(deleteConfirm.id);
      setDeleteConfirm({ open: false, id: null });
      loadReleases();
      refreshReleases();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleNoteSave(id, notes) {
    try {
      await releasesApi.update(id, { notes });
    } catch (err) {
      console.error('Failed to save note', err);
    }
  }

  function applyFilters() {
    setPagination(p => ({ ...p, page: 1 }));
  }

  function resetFilters() {
    setFilters({ search: '', status: '', from_date: '', to_date: '' });
    setPagination(p => ({ ...p, page: 1 }));
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-co-gray-900">Releases</h1>
          <p className="text-co-gray-600 mt-1">Manage release versions</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary">
          + New Release
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Search releases..."
            className="form-input"
            value={filters.search}
            onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
          />
          <select
            className="form-input"
            value={filters.status}
            onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="archived">Archived</option>
          </select>
          <input
            type="date"
            className="form-input"
            value={filters.from_date}
            onChange={(e) => setFilters(f => ({ ...f, from_date: e.target.value }))}
          />
          <input
            type="date"
            className="form-input"
            value={filters.to_date}
            onChange={(e) => setFilters(f => ({ ...f, to_date: e.target.value }))}
          />
          <div className="flex gap-2">
            <button onClick={applyFilters} className="btn-primary btn-sm flex-1">
              Apply
            </button>
            <button onClick={resetFilters} className="btn-outline btn-sm flex-1">
              Reset
            </button>
          </div>
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
                        <td className="font-bold text-co-blue">{r.release_number}</td>
                        <td className="text-co-gray-600">{r.description || '-'}</td>
                        <td>
                          <div
                            className="notes-editor"
                            contentEditable={r.status !== 'archived'}
                            suppressContentEditableWarning
                            onBlur={(e) => handleNoteSave(r.id, e.currentTarget.textContent)}
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
                            <KebabMenu.Item onClick={() => openEditModal(r)}>
                              Edit Details
                            </KebabMenu.Item>
                            {r.status !== 'closed' ? (
                              <KebabMenu.Item onClick={() => handleAction(r.id, 'close')}>
                                Close Release
                              </KebabMenu.Item>
                            ) : (
                              <KebabMenu.Item onClick={() => handleAction(r.id, 'reopen')}>
                                Reopen Release
                              </KebabMenu.Item>
                            )}
                            {r.status !== 'archived' && (
                              <KebabMenu.Item onClick={() => handleAction(r.id, 'archive')}>
                                Archive Release
                              </KebabMenu.Item>
                            )}
                            {r.status === 'open' && (
                              <KebabMenu.Item
                                variant="danger"
                                onClick={() => setDeleteConfirm({ open: true, id: r.id })}
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
              onPageChange={(page) => setPagination(p => ({ ...p, page }))}
            />
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRelease ? 'Edit Release' : 'New Release'}
      >
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="form-label">Release Number</label>
            <input
              type="text"
              className="form-input"
              value={form.release_number}
              onChange={(e) => setForm(f => ({ ...f, release_number: e.target.value }))}
              placeholder="e.g., v1.0.0"
              required
            />
          </div>
          <div className="mb-4">
            <label className="form-label">Description</label>
            <input
              type="text"
              className="form-input"
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Optional description"
            />
          </div>
          {!editingRelease && (
            <div className="mb-4">
              <label className="form-label">Notes</label>
              <textarea
                className="form-input h-24 resize-none"
                value={form.notes}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes"
              />
            </div>
          )}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-co-gray-700 font-medium"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingRelease ? 'Save Changes' : 'Create Release'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
        onConfirm={handleDelete}
        title="Delete Release?"
        message="EXTREME DANGER: This will permanently delete ALL test data, sets, cases, scenarios, and steps for this release. This action cannot be undone."
        confirmText="Delete Release"
      />
    </div>
  );
}

export default Releases;
