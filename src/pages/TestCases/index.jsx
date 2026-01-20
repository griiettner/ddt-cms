/**
 * TestCases Page
 * Smart hooks + dumb components architecture
 */
import { useCallback } from 'react';
import { Link, useParams } from '@tanstack/react-router';
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
import {
  StepRow,
  ScenarioSidebar,
  CaseModal,
  ScenarioModal,
  TypeConfigModal,
  SelectConfigModal,
  MatchConfigModal,
} from '../../components/test-cases';
import { ConfirmModal, LoadingSpinner } from '../../components/common';
import { useTestCasesPage } from './hooks/useTestCasesPage';

function TestCases() {
  const { releaseId: releaseSlug } = useParams({ strict: false });
  const {
    // Route params
    testSetId,
    selectedReleaseId,

    // Data
    scenarios,
    selectedScenarioId,
    selectedScenario,
    testSetName,
    openCases,
    testCases,
    steps,
    config,
    selectConfigs,
    matchConfigs,
    actionOptions,
    isLoading,

    // Modal states
    modals,

    // Scenario actions
    handleSelectScenario,
    toggleCase,
    handleUpdateScenarioName,

    // Case modal
    handleOpenCaseModal,
    handleSubmitCase,
    closeCaseModal,
    setCaseModalName,

    // Case edit/delete
    handleEditCase,
    handleDeleteCase,
    confirmDeleteCase,
    closeDeleteCaseConfirm,

    // Scenario modal
    handleOpenScenarioModal,
    handleSubmitScenario,
    closeScenarioModal,
    setScenarioModalName,
    setScenarioModalTestCaseId,

    // Delete modal
    openDeleteConfirm,
    closeDeleteConfirm,
    handleDeleteScenario,

    // Step actions
    handleUpdateStepField,
    handleAddStep,
    handleDeleteStep,
    confirmDeleteStep,
    closeDeleteStepConfirm,
    handleReorderSteps,

    // Select config modal
    handleOpenSelectConfigModal,
    handleSaveSelectConfig,
    closeSelectConfigModal,
    setSelectConfigField,
    handleSelectConfigChange,

    // Match config modal
    handleOpenMatchConfigModal,
    handleSaveMatchConfig,
    closeMatchConfigModal,
    setMatchConfigField,
    handleMatchConfigChange,

    // Type config modal
    handleOpenTypeConfigModal,
    handleSaveTypeConfig,
    closeTypeConfigModal,
    setTypeConfigOptions,
  } = useTestCasesPage();

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

  if (!testSetId || !selectedReleaseId) {
    return (
      <div className="p-8 text-center">
        <p className="text-co-gray-500">Missing Release ID or Test Set ID</p>
        {releaseSlug ? (
          <Link
            to="/$releaseId/test-sets"
            params={{ releaseId: releaseSlug }}
            className="btn-primary mt-4 inline-block"
          >
            Go to Test Sets
          </Link>
        ) : (
          <Link to="/releases" className="btn-primary mt-4 inline-block">
            Go to Releases
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="editor-container">
      <ScenarioSidebar
        scenarios={scenarios}
        selectedScenarioId={selectedScenarioId}
        onSelectScenario={handleSelectScenario}
        openCases={openCases}
        toggleCase={toggleCase}
        onAddCase={handleOpenCaseModal}
        onAddScenario={handleOpenScenarioModal}
        onEditCase={handleEditCase}
        onDeleteCase={handleDeleteCase}
      />

      <div className="main-editor">
        <div className="editor-header">
          <div className="flex items-center gap-2">
            <h2
              className="text-xl font-bold text-co-blue editable-title"
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleUpdateScenarioName(selectedScenarioId, e.currentTarget.textContent.trim())}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            >
              {selectedScenario?.name || 'Select a scenario'}
            </h2>
            {selectedScenarioId && (
              <button
                className="trash-btn"
                onClick={openDeleteConfirm}
                title="Delete Scenario"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button className="btn-outline btn-sm flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Run Test
            </button>
            <button onClick={handleAddStep} className="btn-primary btn-sm flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Add Step
            </button>
          </div>
        </div>

        <div className="steps-wrapper">
          {isLoading && steps.length === 0 ? (
            <LoadingSpinner className="py-20" />
          ) : (
            <>
              {steps.length === 0 && selectedScenarioId && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-white/70 to-white z-10 pointer-events-none">
                  <div className="text-center -mt-10">
                    <div className="text-4xl mb-4">&#10024;</div>
                    <h3 className="text-2xl font-bold text-co-blue mb-2">Zero steps? No problem.</h3>
                    <p className="text-co-gray-500">This scenario is a blank canvas. Let's add your first test step.</p>
                  </div>
                </div>
              )}

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
                    {steps.length === 0 && !selectedScenarioId ? (
                      <tr>
                        <td colSpan="9" className="text-center text-co-gray-400 italic py-20">
                          Select a scenario from the left to view steps.
                        </td>
                      </tr>
                    ) : (
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
                            onOpenSelectConfig={handleOpenSelectConfigModal}
                            onOpenMatchConfig={handleOpenMatchConfigModal}
                            onOpenTypeConfig={handleOpenTypeConfigModal}
                            onDeleteStep={handleDeleteStep}
                          />
                        ))}
                      </SortableContext>
                    )}
                  </tbody>
                </table>
              </DndContext>
            </>
          )}
        </div>
      </div>

      <CaseModal
        isOpen={modals.case.open}
        onClose={closeCaseModal}
        onSubmit={handleSubmitCase}
        name={modals.case.name}
        setName={setCaseModalName}
      />

      <ScenarioModal
        isOpen={modals.scenario.open}
        onClose={closeScenarioModal}
        onSubmit={handleSubmitScenario}
        name={modals.scenario.name}
        setName={setScenarioModalName}
        testCaseId={modals.scenario.testCaseId}
        setTestCaseId={setScenarioModalTestCaseId}
        testCases={testCases}
      />

      <TypeConfigModal
        isOpen={modals.typeConfig.open}
        onClose={closeTypeConfigModal}
        onSave={handleSaveTypeConfig}
        category={modals.typeConfig.category}
        options={modals.typeConfig.options}
        setOptions={setTypeConfigOptions}
      />

      <SelectConfigModal
        isOpen={modals.selectConfig.open}
        onClose={closeSelectConfigModal}
        onSave={handleSaveSelectConfig}
        configType={modals.selectConfig.configType}
        selectedId={modals.selectConfig.selectedId}
        setSelectedId={handleSelectConfigChange}
        name={modals.selectConfig.name}
        setName={(name) => setSelectConfigField('name', name)}
        options={modals.selectConfig.options}
        setOptions={(options) => setSelectConfigField('options', options)}
        allConfigs={selectConfigs}
      />

      <MatchConfigModal
        isOpen={modals.matchConfig.open}
        onClose={closeMatchConfigModal}
        onSave={handleSaveMatchConfig}
        selectedId={modals.matchConfig.selectedId}
        setSelectedId={handleMatchConfigChange}
        name={modals.matchConfig.name}
        setName={(name) => setMatchConfigField('name', name)}
        options={modals.matchConfig.options}
        setOptions={(options) => setMatchConfigField('options', options)}
        allConfigs={matchConfigs}
      />

      <ConfirmModal
        isOpen={modals.deleteConfirm.open}
        onClose={closeDeleteConfirm}
        onConfirm={handleDeleteScenario}
        title="Delete Scenario?"
        message={`Are you sure you want to delete "${selectedScenario?.name}"? This will permanently remove all associated test steps.`}
        confirmText="Delete Scenario"
      />

      <ConfirmModal
        isOpen={modals.deleteCaseConfirm.open}
        onClose={closeDeleteCaseConfirm}
        onConfirm={confirmDeleteCase}
        title="Delete Test Case?"
        message={`Are you sure you want to delete "${modals.deleteCaseConfirm.caseName}" and all its scenarios and steps? This cannot be undone.`}
        confirmText="Delete Test Case"
      />

      <ConfirmModal
        isOpen={modals.deleteStepConfirm.open}
        onClose={closeDeleteStepConfirm}
        onConfirm={confirmDeleteStep}
        title="Delete Step?"
        message="Are you sure you want to delete this step? This cannot be undone."
        confirmText="Delete Step"
      />
    </div>
  );
}

export default TestCases;
