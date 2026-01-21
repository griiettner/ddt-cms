/**
 * ReusableCasesManager - Card-based view for managing reusable test cases
 */
import { useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { useReusableCasesQuery } from '@/hooks/queries';
import { useDeleteReusableCase } from '@/hooks/mutations';
import { LoadingSpinner, ConfirmModal } from '@/components/common';
import type { ReusableCase } from '@/types/entities';

// Icons
function PlusIcon(): JSX.Element {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function TrashIcon(): JSX.Element {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

function PencilIcon(): JSX.Element {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
      />
    </svg>
  );
}

interface ReusableCaseCardProps {
  reusableCase: ReusableCase;
  onDelete: (item: ReusableCase) => void;
  releaseId: string;
}

function ReusableCaseCard({
  reusableCase,
  onDelete,
  releaseId,
}: ReusableCaseCardProps): JSX.Element {
  const stepCount = reusableCase.step_count || 0;

  return (
    <div className="card group relative transition-shadow hover:shadow-md">
      {/* Action buttons */}
      <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Link
          to="/$releaseId/settings/reusable-cases/$reusableCaseId"
          params={{ releaseId, reusableCaseId: String(reusableCase.id) }}
          className="rounded-md border border-co-gray-200 bg-white p-1.5 shadow-sm hover:bg-co-gray-50"
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
          className="rounded-md border border-co-gray-200 bg-white p-1.5 text-red-500 shadow-sm hover:bg-red-50"
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
          <h3 className="pr-16 text-lg font-semibold text-co-gray-900">{reusableCase.name}</h3>
          {reusableCase.description && (
            <p className="mt-1 line-clamp-2 text-sm text-co-gray-500">{reusableCase.description}</p>
          )}
        </div>

        {/* Steps Info */}
        <div className="border-t border-co-gray-100 pt-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-co-gray-600">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
              <span className="text-sm">
                {stepCount} {stepCount === 1 ? 'step' : 'steps'}
              </span>
            </div>
            {reusableCase.created_at && (
              <span className="text-co-gray-400 text-xs">
                Created {new Date(reusableCase.created_at).toLocaleDateString()}
              </span>
            )}
          </div>
          {stepCount === 0 && (
            <p className="text-co-gray-400 mt-2 text-sm italic">Click to add steps</p>
          )}
        </div>
      </Link>
    </div>
  );
}

interface DeleteConfirmState {
  open: boolean;
  item: ReusableCase | null;
}

function ReusableCasesManager(): JSX.Element {
  const { releaseId } = useParams({ strict: false }) as { releaseId: string };
  const { data: reusableCases = [], isLoading } = useReusableCasesQuery();
  const deleteReusableCaseMutation = useDeleteReusableCase();

  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({
    open: false,
    item: null,
  });

  const openDeleteConfirm = (item: ReusableCase): void => {
    setDeleteConfirm({ open: true, item });
  };

  const closeDeleteConfirm = (): void => {
    setDeleteConfirm({ open: false, item: null });
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteConfirm.item) return;
    try {
      await deleteReusableCaseMutation.mutateAsync(deleteConfirm.item.id);
      closeDeleteConfirm();
    } catch (err) {
      const error = err as Error;
      alert(`Failed to delete: ${error.message}`);
    }
  };

  if (isLoading) {
    return <LoadingSpinner className="py-20" />;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-co-gray-900">Reusable Test Cases</h2>
          <p className="mt-1 text-sm text-co-gray-500">
            Create and manage reusable test cases that can be added to any test set
          </p>
        </div>
        <Link
          to="/$releaseId/settings/reusable-cases/$reusableCaseId"
          params={{ releaseId, reusableCaseId: 'new' }}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon />
          New Reusable Case
        </Link>
      </div>

      {/* Cards Grid */}
      {reusableCases.length === 0 ? (
        <div className="card py-12 text-center">
          <div className="mb-4 text-4xl">📋</div>
          <h3 className="mb-2 text-lg font-semibold text-co-gray-700">No reusable cases yet</h3>
          <p className="mb-4 text-sm text-co-gray-500">
            Create a reusable test case to quickly add it to multiple test sets
          </p>
          <Link
            to="/$releaseId/settings/reusable-cases/$reusableCaseId"
            params={{ releaseId, reusableCaseId: 'new' }}
            className="btn-primary inline-flex items-center gap-2"
          >
            <PlusIcon />
            Create Your First Reusable Case
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
