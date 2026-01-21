/**
 * ReusableCaseEditor Page
 * Edit steps for a reusable test case
 */
import { useCallback } from 'react';
import { Link } from '@tanstack/react-router';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { LoadingSpinner, ConfirmModal } from '../../components/common';
import {
  StepRow,
  TypeConfigModal,
  SelectConfigModal,
  MatchConfigModal,
} from '../../components/test-cases';
import { useReusableCaseEditor } from './hooks/useReusableCaseEditor';

// Icons
const ArrowLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const SaveIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
  </svg>
);

function ReusableCaseEditor() {
  const {
    // Route params
    releaseId,
    reusableCaseId,
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
  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = steps.findIndex((s) => s.id === active.id);
      const newIndex = steps.findIndex((s) => s.id === over.id);
      const reorderedSteps = arrayMove(steps, oldIndex, newIndex);
      handleReorderSteps(reorderedSteps);
    }
  }, [steps, handleReorderSteps]);

  if (isLoading && !isNew) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <LoadingSpinner className="py-20" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-co-gray-100 rounded-lg transition-colors"
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
          <button
            onClick={handleAddStep}
            className="btn-outline btn-sm flex items-center gap-2"
          >
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
              onChange={(e) => setCaseName(e.target.value)}
              placeholder="Enter case name..."
            />
          </div>
          <div>
            <label className="form-label">Description (optional)</label>
            <input
              type="text"
              className="form-input"
              value={caseDescription}
              onChange={(e) => setCaseDescription(e.target.value)}
              placeholder="Enter description..."
            />
          </div>
        </div>
      </div>

      {/* Steps Table */}
      <div className="card">
        <h2 className="text-lg font-semibold text-co-gray-900 mb-4">
          Test Steps ({steps.length})
        </h2>

        {steps.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-co-gray-200 rounded-lg">
            <div className="text-4xl mb-4">📝</div>
            <h3 className="text-lg font-semibold text-co-gray-700 mb-2">
              No steps yet
            </h3>
            <p className="text-sm text-co-gray-500 mb-4">
              Add steps to define what this reusable case should test
            </p>
            <button
              onClick={handleAddStep}
              className="btn-primary inline-flex items-center gap-2"
            >
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
                    items={steps.map(s => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {steps.map(step => (
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
        setOptions={setTypeConfigOptions}
      />

      {/* Select Config Modal */}
      <SelectConfigModal
        isOpen={selectConfigModal.open}
        onClose={closeSelectConfigModal}
        onSave={handleSaveSelectConfig}
        configType={selectConfigModal.configType}
        selectedId={selectConfigModal.selectedId}
        setSelectedId={handleSelectConfigChange}
        name={selectConfigModal.name}
        setName={(val) => setSelectConfigField('name', val)}
        options={selectConfigModal.options}
        setOptions={(val) => setSelectConfigField('options', val)}
        allConfigs={selectConfigs}
      />

      {/* Match Config Modal */}
      <MatchConfigModal
        isOpen={matchConfigModal.open}
        onClose={closeMatchConfigModal}
        onSave={handleSaveMatchConfig}
        selectedId={matchConfigModal.selectedId}
        setSelectedId={handleMatchConfigChange}
        name={matchConfigModal.name}
        setName={(val) => setMatchConfigField('name', val)}
        options={matchConfigModal.options}
        setOptions={(val) => setMatchConfigField('options', val)}
        allConfigs={matchConfigs}
      />
    </div>
  );
}

export default ReusableCaseEditor;
