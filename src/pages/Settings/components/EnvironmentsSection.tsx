/**
 * Environments Section Component
 * Manage environment URLs for Playwright test execution
 */
import { useState } from 'react';
import { useRelease } from '@/context/ReleaseContext';
import { useEnvironmentsQuery } from '@/hooks/queries';
import { useSaveEnvironment, useDeleteEnvironment } from '@/hooks/mutations';
import { LoadingSpinner, ConfirmModal } from '@/components/common';
import type { EnvironmentConfig } from '@/services/api';

interface EditingState {
  id: number | null;
  environment: string;
  url: string;
}

function EnvironmentsSection(): JSX.Element {
  const { selectedReleaseId } = useRelease();
  const { data: environments = [], isLoading } = useEnvironmentsQuery(selectedReleaseId);
  const saveEnvironmentMutation = useSaveEnvironment(selectedReleaseId);
  const deleteEnvironmentMutation = useDeleteEnvironment(selectedReleaseId);

  const [editing, setEditing] = useState<EditingState | null>(null);
  const [newEnv, setNewEnv] = useState({ environment: '', url: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; env: string }>({
    open: false,
    env: '',
  });

  const handleEdit = (env: EnvironmentConfig): void => {
    setEditing({ id: env.id, environment: env.environment, url: env.value });
  };

  const handleCancelEdit = (): void => {
    setEditing(null);
  };

  const handleSaveEdit = async (): Promise<void> => {
    if (!editing) return;
    try {
      await saveEnvironmentMutation.mutateAsync({
        environment: editing.environment,
        url: editing.url,
      });
      setEditing(null);
    } catch (err) {
      const error = err as Error;
      alert(`Failed to save: ${error.message}`);
    }
  };

  const handleAddNew = async (): Promise<void> => {
    if (!newEnv.environment || !newEnv.url) {
      alert('Please enter both environment name and URL');
      return;
    }
    try {
      await saveEnvironmentMutation.mutateAsync({
        environment: newEnv.environment,
        url: newEnv.url,
      });
      setNewEnv({ environment: '', url: '' });
    } catch (err) {
      const error = err as Error;
      alert(`Failed to add: ${error.message}`);
    }
  };

  const handleDeleteClick = (env: string): void => {
    setDeleteConfirm({ open: true, env });
  };

  const handleConfirmDelete = async (): Promise<void> => {
    try {
      await deleteEnvironmentMutation.mutateAsync(deleteConfirm.env);
      setDeleteConfirm({ open: false, env: '' });
    } catch (err) {
      const error = err as Error;
      alert(`Failed to delete: ${error.message}`);
    }
  };

  if (isLoading) {
    return <LoadingSpinner className="py-8" />;
  }

  return (
    <div className="card">
      <div className="mb-4">
        <h2 className="card-header mb-0">Environment URLs</h2>
        <p className="mt-1 text-sm text-co-gray-500">
          Configure base URLs for different environments. These are used when running Playwright
          tests.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-1/4">Environment</th>
              <th>URL</th>
              <th className="w-32"></th>
            </tr>
          </thead>
          <tbody>
            {environments.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-8 text-center italic text-co-gray-500">
                  No environments configured. Add your first environment below.
                </td>
              </tr>
            ) : (
              environments.map((env) => (
                <tr key={env.id}>
                  {editing?.id === env.id ? (
                    <>
                      <td>
                        <input
                          type="text"
                          value={editing.environment}
                          onChange={(e) => setEditing({ ...editing, environment: e.target.value })}
                          className="input-field w-full"
                          placeholder="dev, qa, uat..."
                        />
                      </td>
                      <td>
                        <input
                          type="url"
                          value={editing.url}
                          onChange={(e) => setEditing({ ...editing, url: e.target.value })}
                          className="input-field w-full"
                          placeholder="https://..."
                        />
                      </td>
                      <td className="text-right">
                        <button
                          onClick={handleSaveEdit}
                          className="text-co-green mr-2 text-sm hover:underline"
                          disabled={saveEnvironmentMutation.isPending}
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="text-sm text-co-gray-500 hover:underline"
                        >
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="font-semibold uppercase text-co-blue">{env.environment}</td>
                      <td className="font-mono text-sm text-co-gray-600">{env.value}</td>
                      <td className="text-right">
                        <button
                          onClick={() => handleEdit(env)}
                          className="mr-3 text-sm text-co-blue hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClick(env.environment)}
                          className="text-sm text-co-red hover:underline"
                        >
                          &times; Remove
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}

            {/* Add new row */}
            <tr className="border-t-2 border-co-gray-200 bg-co-gray-50">
              <td>
                <input
                  type="text"
                  value={newEnv.environment}
                  onChange={(e) => setNewEnv({ ...newEnv, environment: e.target.value })}
                  className="input-field w-full"
                  placeholder="e.g., staging"
                />
              </td>
              <td>
                <input
                  type="url"
                  value={newEnv.url}
                  onChange={(e) => setNewEnv({ ...newEnv, url: e.target.value })}
                  className="input-field w-full"
                  placeholder="https://staging.example.com"
                />
              </td>
              <td className="text-right">
                <button
                  onClick={handleAddNew}
                  className="btn-primary btn-sm"
                  disabled={saveEnvironmentMutation.isPending || !newEnv.environment || !newEnv.url}
                >
                  + Add
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, env: '' })}
        onConfirm={handleConfirmDelete}
        title="Remove Environment?"
        message={`Are you sure you want to remove the "${deleteConfirm.env}" environment configuration?`}
        confirmText={deleteEnvironmentMutation.isPending ? 'Removing...' : 'Remove'}
      />
    </div>
  );
}

export default EnvironmentsSection;
