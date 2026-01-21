/**
 * ReusableCaseEditor Page
 * Edit steps for a reusable test case
 */
import { useCallback, type ChangeEvent, type SetStateAction } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { LoadingSpinner, ConfirmModal } from '@/components/common';
import { TypeConfigModal, SelectConfigModal, MatchConfigModal } from '@/components/test-cases';
import StepRow from '@/components/test-cases/StepRow';
import { useReusableCaseEditor } from './hooks/useReusableCaseEditor';

// Helper to create a setState-compatible wrapper
function createSetStateWrapper(
  setter: (value: string) => void
): React.Dispatch<SetStateAction<string>> {
  return (action: SetStateAction<string>) => {
    if (typeof action === 'function') {
      // We don't have the previous value, but the modals don't use functional updates
      setter(action(''));
    } else {
      setter(action);
    }
  };
}

// Icons
function ArrowLeftIcon(): JSX.Element {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 19l-7-7m0 0l7-7m-7 7h18"
      />
    </svg>
  );
}

function PlusIcon(): JSX.Element {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function SaveIcon(): JSX.Element {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
      />
    </svg>
  );
}

function ReusableCaseEditor(): JSX.Element {
  const {
    // Route params
    isNew,

    // Data
    caseName,
    setCaseName,
    caseDescription,
    setCaseDescription,
    steps,
    config,
    selectConfigs,
    matchConfigs,
    rawSelectConfigs,
    rawMatchConfigs,
    actionOptions,
    isLoading,
    isSaving,

    // Delete confirmation
    deleteConfirm,
    closeDeleteConfirm,
    confirmDeleteStep,

    // Actions
    handleSave,
    handleBack,
    handleAddStep,
    handleUpdateStepField,
    handleDeleteStep,
    handleReorderSteps,

    // Type Config Modal
    typeConfigModal,
    handleOpenTypeConfigModal,
    handleSaveTypeConfig,
    closeTypeConfigModal,
    setTypeConfigOptions,

    // Select Config Modal
    selectConfigModal,
    handleOpenSelectConfigModal,
    handleSaveSelectConfig,
    closeSelectConfigModal,
    setSelectConfigField,
    handleSelectConfigChange,

    // Match Config Modal
    matchConfigModal,
    handleOpenMatchConfigModal,
    handleSaveMatchConfig,
    closeMatchConfigModal,
    setMatchConfigField,
    handleMatchConfigChange,
  } = useReusableCaseEditor();

  // DnD sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end to reorder steps
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = steps.findIndex((s) => s.id === active.id);
        const newIndex = steps.findIndex((s) => s.id === over.id);
        const reorderedSteps = arrayMove(steps, oldIndex, newIndex);
        handleReorderSteps(reorderedSteps);
      }
    },
    [steps, handleReorderSteps]
  );

  if (isLoading && !isNew) {
    return (
      <div className="mx-auto max-w-7xl p-8">
        <LoadingSpinner className="py-20" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="rounded-lg p-2 transition-colors hover:bg-co-gray-100"
            title="Back to Settings"
          >
            <ArrowLeftIcon />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-co-blue">
              {isNew ? 'Create Reusable Case' : 'Edit Reusable Case'}
            </h1>
            <p className="text-sm text-co-gray-500">
              {isNew
                ? 'Create a new reusable test case template'
                : 'Edit the steps for this reusable case'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleAddStep} className="btn-outline btn-sm flex items-center gap-2">
            <PlusIcon />
            Add Step
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !caseName.trim()}
            className="btn-primary btn-sm flex items-center gap-2"
          >
            <SaveIcon />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Case Info */}
      <div className="card mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Case Name</label>
            <input
              type="text"
              className="form-input"
              value={caseName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setCaseName(e.target.value)}
              placeholder="Enter case name..."
            />
          </div>
          <div>
            <label className="form-label">Description (optional)</label>
            <input
              type="text"
              className="form-input"
              value={caseDescription}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setCaseDescription(e.target.value)}
              placeholder="Enter description..."
            />
          </div>
        </div>
      </div>

      {/* Steps Table */}
      <div className="card">
        <h2 className="mb-4 text-lg font-semibold text-co-gray-900">Test Steps ({steps.length})</h2>

        {steps.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-co-gray-200 py-12 text-center">
            <div className="mb-4 text-4xl">📝</div>
            <h3 className="mb-2 text-lg font-semibold text-co-gray-700">No steps yet</h3>
            <p className="mb-4 text-sm text-co-gray-500">
              Add steps to define what this reusable case should test
            </p>
            <button onClick={handleAddStep} className="btn-primary inline-flex items-center gap-2">
              <PlusIcon />
              Add First Step
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <table className="steps-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}></th>
                    <th style={{ width: 250 }}>Step Definition</th>
                    <th style={{ width: 150 }}>Type</th>
                    <th style={{ width: 150 }}>ID</th>
                    <th style={{ width: 150 }}>Action</th>
                    <th style={{ width: 180 }}>Action Result</th>
                    <th style={{ width: 80 }}>Req</th>
                    <th>Expected Results</th>
                    <th style={{ width: 50 }}></th>
                  </tr>
                </thead>
                <tbody>
                  <SortableContext
                    items={steps.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {steps.map((step) => (
                      <StepRow
                        key={step.id}
                        step={step}
                        config={config}
                        selectConfigs={selectConfigs}
                        matchConfigs={matchConfigs}
                        actionOptions={actionOptions}
                        onFieldChange={handleUpdateStepField}
                        onDeleteStep={handleDeleteStep}
                        onOpenSelectConfig={handleOpenSelectConfigModal}
                        onOpenMatchConfig={handleOpenMatchConfigModal}
                        onOpenTypeConfig={handleOpenTypeConfigModal}
                        showConfigButtons={true}
                      />
                    ))}
                  </SortableContext>
                </tbody>
              </table>
            </DndContext>
          </div>
        )}
      </div>

      {/* Delete Step Confirmation */}
      <ConfirmModal
        isOpen={deleteConfirm.open}
        onClose={closeDeleteConfirm}
        onConfirm={confirmDeleteStep}
        title="Delete Step?"
        message="Are you sure you want to delete this step? This cannot be undone."
        confirmText="Delete Step"
      />

      {/* Type Config Modal */}
      <TypeConfigModal
        isOpen={typeConfigModal.open}
        onClose={closeTypeConfigModal}
        onSave={handleSaveTypeConfig}
        category={typeConfigModal.category}
        options={typeConfigModal.options}
        setOptions={createSetStateWrapper(setTypeConfigOptions)}
      />

      {/* Select Config Modal */}
      <SelectConfigModal
        isOpen={selectConfigModal.open}
        onClose={closeSelectConfigModal}
        onSave={handleSaveSelectConfig}
        configType={selectConfigModal.configType}
        selectedId={selectConfigModal.selectedId}
        setSelectedId={createSetStateWrapper(handleSelectConfigChange)}
        name={selectConfigModal.name}
        setName={createSetStateWrapper((val: string) => setSelectConfigField('name', val))}
        options={selectConfigModal.options}
        setOptions={createSetStateWrapper((val: string) => setSelectConfigField('options', val))}
        allConfigs={rawSelectConfigs}
      />

      {/* Match Config Modal */}
      <MatchConfigModal
        isOpen={matchConfigModal.open}
        onClose={closeMatchConfigModal}
        onSave={handleSaveMatchConfig}
        selectedId={matchConfigModal.selectedId}
        setSelectedId={createSetStateWrapper(handleMatchConfigChange)}
        name={matchConfigModal.name}
        setName={createSetStateWrapper((val: string) => setMatchConfigField('name', val))}
        options={matchConfigModal.options}
        setOptions={createSetStateWrapper((val: string) => setMatchConfigField('options', val))}
        allConfigs={rawMatchConfigs}
      />
    </div>
  );
}

export default ReusableCaseEditor;
