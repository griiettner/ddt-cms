import { useState, useEffect, useCallback } from 'react';
import { configApi } from '../services/api';
import { useRelease } from '../context/ReleaseContext';
import { Modal, ConfirmModal, ReleaseSelector, LoadingSpinner } from '../components/common';

function Settings() {
  const { selectedReleaseId } = useRelease();
  const [types, setTypes] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalCategory, setModalCategory] = useState('type');
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });

  // Form state
  const [form, setForm] = useState({ key: '', display_name: '', result_type: '' });
  const [autoKey, setAutoKey] = useState(true);

  const loadData = useCallback(async () => {
    if (!selectedReleaseId) return;

    try {
      setLoading(true);
      const [typesRes, actionsRes] = await Promise.all([
        configApi.getTypes(selectedReleaseId),
        configApi.getActions(selectedReleaseId),
      ]);
      setTypes(typesRes.data);
      setActions(actionsRes.data);
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setLoading(false);
    }
  }, [selectedReleaseId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openAddModal(category) {
    setModalCategory(category);
    setForm({ key: '', display_name: '', result_type: '' });
    setAutoKey(true);
    setIsModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (modalCategory === 'type') {
        await configApi.createType(selectedReleaseId, {
          key: form.key,
          display_name: form.display_name,
        });
      } else {
        await configApi.createAction(selectedReleaseId, {
          key: form.key,
          display_name: form.display_name,
          result_type: form.result_type || null,
        });
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      alert('Failed to save option: ' + err.message);
    }
  }

  async function handleDelete() {
    try {
      await configApi.delete(selectedReleaseId, deleteConfirm.id);
      setDeleteConfirm({ open: false, id: null });
      loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  function handleDisplayNameChange(value) {
    setForm(f => ({ ...f, display_name: value }));
    if (autoKey) {
      const slug = value.toLowerCase().replace(/ /g, '_').replace(/[^a-z0-9_]/g, '');
      setForm(f => ({ ...f, key: slug }));
    }
  }

  function handleKeyChange(value) {
    setForm(f => ({ ...f, key: value }));
    setAutoKey(false);
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-co-gray-900">Settings</h1>
          <p className="text-co-gray-600 mt-1">Configure element types and test actions</p>
        </div>
        <ReleaseSelector className="w-48" />
      </div>

      {loading ? (
        <LoadingSpinner className="py-20" />
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {/* Element Types */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="card-header mb-0">Element Types</h2>
              <button
                onClick={() => openAddModal('type')}
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
                            onClick={() => setDeleteConfirm({ open: true, id: t.id })}
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

          {/* Test Actions */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="card-header mb-0">Test Actions</h2>
              <button
                onClick={() => openAddModal('action')}
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
                            onClick={() => setDeleteConfirm({ open: true, id: a.id })}
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
        </div>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalCategory === 'type' ? 'Add New Element Type' : 'Add New Test Action'}
      >
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="form-label">Display Name</label>
            <input
              type="text"
              className="form-input"
              value={form.display_name}
              onChange={(e) => handleDisplayNameChange(e.target.value)}
              placeholder="e.g., Text Input"
              required
            />
          </div>
          <div className="mb-4">
            <label className="form-label">Key (auto-generated)</label>
            <input
              type="text"
              className="form-input font-mono"
              value={form.key}
              onChange={(e) => handleKeyChange(e.target.value)}
              placeholder="e.g., text_input"
              required
            />
          </div>
          {modalCategory === 'action' && (
            <div className="mb-4">
              <label className="form-label">Result Type</label>
              <select
                className="form-input"
                value={form.result_type}
                onChange={(e) => setForm(f => ({ ...f, result_type: e.target.value }))}
              >
                <option value="">None</option>
                <option value="text">Text</option>
                <option value="checkbox">Checkbox</option>
                <option value="select">Select</option>
                <option value="array">Array</option>
              </select>
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
              Add {modalCategory === 'type' ? 'Type' : 'Action'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
        onConfirm={handleDelete}
        title="Remove Option?"
        message="Are you sure you want to remove this option? It might already be used in test steps."
        confirmText="Remove"
      />
    </div>
  );
}

export default Settings;
