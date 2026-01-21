/**
 * ReusableCasesManager - Card-based view for managing reusable test cases
 */
import { Link, useParams } from '@tanstack/react-router';
import { useReusableCasesQuery } from '../../../hooks/queries';
import { useDeleteReusableCase } from '../../../hooks/mutations';
import { LoadingSpinner, ConfirmModal } from '../../../components/common';
import { useState } from 'react';

// Icons
const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const PencilIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);

function ReusableCaseCard({ reusableCase, onDelete, releaseId }) {
  const stepCount = reusableCase.step_count || 0;

  return (
    <div className="card hover:shadow-md transition-shadow group relative">
      {/* Action buttons */}
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Link
          to="/$releaseId/settings/reusable-cases/$reusableCaseId"
          params={{ releaseId, reusableCaseId: String(reusableCase.id) }}
          className="p-1.5 bg-white rounded-md shadow-sm hover:bg-co-gray-50 border border-co-gray-200"
          title="Edit"
        >
          <PencilIcon />
        </Link>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(reusableCase);
          }}
          className="p-1.5 bg-white rounded-md shadow-sm hover:bg-red-50 border border-co-gray-200 text-red-500"
          title="Delete"
        >
          <TrashIcon />
        </button>
      </div>

      <Link
        to="/$releaseId/settings/reusable-cases/$reusableCaseId"
        params={{ releaseId, reusableCaseId: String(reusableCase.id) }}
        className="block"
      >
        {/* Card Header */}
        <div className="mb-3">
          <h3 className="font-semibold text-co-gray-900 text-lg pr-16">
            {reusableCase.name}
          </h3>
          {reusableCase.description && (
            <p className="text-sm text-co-gray-500 mt-1 line-clamp-2">
              {reusableCase.description}
            </p>
          )}
        </div>

        {/* Steps Info */}
        <div className="border-t border-co-gray-100 pt-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-co-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <span className="text-sm">
                {stepCount} {stepCount === 1 ? 'step' : 'steps'}
              </span>
            </div>
            {reusableCase.created_at && (
              <span className="text-xs text-co-gray-400">
                Created {new Date(reusableCase.created_at).toLocaleDateString()}
              </span>
            )}
          </div>
          {stepCount === 0 && (
            <p className="text-sm text-co-gray-400 italic mt-2">
              Click to add steps
            </p>
          )}
        </div>
      </Link>
    </div>
  );
}

function ReusableCasesManager() {
  const { releaseId } = useParams({ strict: false });
  const { data: reusableCases = [], isLoading, refetch } = useReusableCasesQuery();
  const deleteReusableCaseMutation = useDeleteReusableCase();

  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, item: null });

  const openDeleteConfirm = (item) => {
    setDeleteConfirm({ open: true, item });
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirm({ open: false, item: null });
  };

  const handleDelete = async () => {
    if (!deleteConfirm.item) return;
    try {
      await deleteReusableCaseMutation.mutateAsync(deleteConfirm.item.id);
      closeDeleteConfirm();
    } catch (err) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  if (isLoading) {
    return <LoadingSpinner className="py-20" />;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-co-gray-900">
            Reusable Test Cases
          </h2>
          <p className="text-sm text-co-gray-500 mt-1">
            Create and manage reusable test cases that can be added to any test set
          </p>
        </div>
        <Link
          to="/$releaseId/settings/reusable-cases/new"
          params={{ releaseId }}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon />
          New Reusable Case
        </Link>
      </div>

      {/* Cards Grid */}
      {reusableCases.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-co-gray-700 mb-2">
            No reusable cases yet
          </h3>
          <p className="text-sm text-co-gray-500 mb-4">
            Create a reusable test case to quickly add it to multiple test sets
          </p>
          <Link
            to="/$releaseId/settings/reusable-cases/new"
            params={{ releaseId }}
            className="btn-primary inline-flex items-center gap-2"
          >
            <PlusIcon />
            Create Your First Reusable Case
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reusableCases.map((rc) => (
            <ReusableCaseCard
              key={rc.id}
              reusableCase={rc}
              onDelete={openDeleteConfirm}
              releaseId={releaseId}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteConfirm.open}
        onClose={closeDeleteConfirm}
        onConfirm={handleDelete}
        title="Delete Reusable Case?"
        message={`Are you sure you want to delete "${deleteConfirm.item?.name}"? This cannot be undone.`}
        confirmText={deleteReusableCaseMutation.isPending ? 'Deleting...' : 'Delete'}
      />
    </div>
  );
}

export default ReusableCasesManager;
