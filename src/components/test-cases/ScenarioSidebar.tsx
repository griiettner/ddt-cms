import { memo, useMemo, useState, useCallback, type MouseEvent } from 'react';
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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TestScenario } from '@/types/entities';

interface IconProps {
  className?: string;
}

const PencilIcon = ({ className }: IconProps): JSX.Element => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
    />
  </svg>
);

const TrashIcon = ({ className }: IconProps): JSX.Element => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

const BookmarkIcon = ({ className }: IconProps): JSX.Element => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
    />
  </svg>
);

const DragHandleIcon = ({ className }: IconProps): JSX.Element => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
  </svg>
);

interface CaseGroup {
  id: number;
  name: string;
  scenarios: TestScenario[];
}

interface ScenarioSidebarProps {
  scenarios: TestScenario[];
  selectedScenarioId: number | null;
  onSelectScenario: (id: number) => void;
  openCases: Set<string>;
  toggleCase: (caseName: string) => void;
  onAddCase: () => void;
  onAddScenario: () => void;
  onEditCase?: (caseId: number, name: string) => void;
  onDeleteCase?: (caseId: number, caseName: string) => void;
  onSaveAsReusable?: (caseId: number, caseName: string) => void;
  onReorderScenarios?: (testCaseId: number, scenarioIds: number[]) => void;
  onReorderCases?: (caseIds: number[]) => void;
}

interface SortableScenarioProps {
  scenario: TestScenario;
  isSelected: boolean;
  onSelect: (id: number) => void;
}

function SortableScenario({ scenario, isSelected, onSelect }: SortableScenarioProps): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: scenario.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`scenario-tab group flex items-center ${isSelected ? 'active' : ''} ${isDragging ? 'bg-co-blue-50' : ''}`}
    >
      <span
        className="text-co-gray-400 mr-2 cursor-grab opacity-0 transition-opacity group-hover:opacity-100"
        {...attributes}
        {...listeners}
      >
        <DragHandleIcon className="h-3 w-3" />
      </span>
      <span className="flex-1 cursor-pointer" onClick={() => onSelect(scenario.id)}>
        {scenario.name}
      </span>
    </div>
  );
}

interface SortableCaseProps {
  caseData: CaseGroup;
  isOpen: boolean;
  isEditing: boolean;
  editName: string;
  selectedScenarioId: number | null;
  sensors: ReturnType<typeof useSensors>;
  onToggle: () => void;
  onStartEdit: (e: MouseEvent) => void;
  onEditChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: (e: MouseEvent) => void;
  onSaveAsReusable: (e: MouseEvent) => void;
  onSelectScenario: (id: number) => void;
  onReorderScenarios?: (testCaseId: number, scenarioIds: number[]) => void;
}

function SortableCase({
  caseData,
  isOpen,
  isEditing,
  editName,
  selectedScenarioId,
  sensors,
  onToggle,
  onStartEdit,
  onEditChange,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onSaveAsReusable,
  onSelectScenario,
  onReorderScenarios,
}: SortableCaseProps): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: caseData.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleScenarioDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id && onReorderScenarios) {
        const oldIndex = caseData.scenarios.findIndex((s) => s.id === active.id);
        const newIndex = caseData.scenarios.findIndex((s) => s.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(caseData.scenarios, oldIndex, newIndex);
          onReorderScenarios(
            caseData.id,
            newOrder.map((s) => s.id)
          );
        }
      }
    },
    [caseData, onReorderScenarios]
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`case-accordion ${isOpen ? 'open' : ''} ${isDragging ? 'bg-co-blue-50' : ''}`}
    >
      <div className="case-header group" onClick={() => !isEditing && onToggle()}>
        <span
          className="text-co-gray-400 mr-2 cursor-grab opacity-0 transition-opacity group-hover:opacity-100"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <DragHandleIcon className="h-3.5 w-3.5" />
        </span>
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => onEditChange(e.target.value)}
            onBlur={onSaveEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveEdit();
              if (e.key === 'Escape') onCancelEdit();
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 rounded border border-co-blue px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-co-blue"
            autoFocus
          />
        ) : (
          <>
            <span className="case-title flex-1">{caseData.name}</span>
            <div className="mr-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={onSaveAsReusable}
                className="rounded p-1 hover:bg-co-blue/10"
                title="Save as reusable case"
              >
                <BookmarkIcon className="h-3.5 w-3.5 text-co-blue" />
              </button>
              <button
                onClick={onStartEdit}
                className="rounded p-1 hover:bg-co-gray-200"
                title="Edit test case"
              >
                <PencilIcon className="h-3.5 w-3.5 text-co-gray-500" />
              </button>
              <button
                onClick={onDelete}
                className="rounded p-1 hover:bg-red-100"
                title="Delete test case"
              >
                <TrashIcon className="h-3.5 w-3.5 text-red-500" />
              </button>
            </div>
            <svg
              className={`h-4 w-4 text-co-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </>
        )}
      </div>
      {isOpen && (
        <div className="bg-co-gray-50">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleScenarioDragEnd}
          >
            <SortableContext
              items={caseData.scenarios.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {caseData.scenarios.map((s) => (
                <SortableScenario
                  key={s.id}
                  scenario={s}
                  isSelected={selectedScenarioId === s.id}
                  onSelect={onSelectScenario}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}

function ScenarioSidebar({
  scenarios,
  selectedScenarioId,
  onSelectScenario,
  openCases,
  toggleCase,
  onAddCase,
  onAddScenario,
  onEditCase,
  onDeleteCase,
  onSaveAsReusable,
  onReorderScenarios,
  onReorderCases,
}: ScenarioSidebarProps): JSX.Element {
  const [editingCaseId, setEditingCaseId] = useState<number | null>(null);
  const [editCaseName, setEditCaseName] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const groups = useMemo((): CaseGroup[] => {
    const g = new Map<number, CaseGroup>();
    const caseOrder: number[] = [];

    scenarios.forEach((s) => {
      if (!g.has(s.test_case_id)) {
        g.set(s.test_case_id, {
          id: s.test_case_id,
          name: s.case_name || 'Unknown',
          scenarios: [],
        });
        caseOrder.push(s.test_case_id);
      }
      const group = g.get(s.test_case_id);
      if (group) {
        group.scenarios.push(s);
      }
    });

    // Return groups in the order they were first encountered (preserves order_index order from API)
    return caseOrder
      .map((id) => g.get(id))
      .filter((group): group is CaseGroup => group !== undefined);
  }, [scenarios]);

  const handleCaseDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id && onReorderCases) {
        const oldIndex = groups.findIndex((g) => g.id === active.id);
        const newIndex = groups.findIndex((g) => g.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(groups, oldIndex, newIndex);
          onReorderCases(newOrder.map((g) => g.id));
        }
      }
    },
    [groups, onReorderCases]
  );

  const startEditingCase = (e: MouseEvent, caseId: number, caseName: string) => {
    e.stopPropagation();
    setEditingCaseId(caseId);
    setEditCaseName(caseName);
  };

  const saveEditCase = (caseId: number) => {
    if (editCaseName.trim() && onEditCase) {
      onEditCase(caseId, editCaseName.trim());
    }
    setEditingCaseId(null);
    setEditCaseName('');
  };

  const cancelEditCase = () => {
    setEditingCaseId(null);
    setEditCaseName('');
  };

  const handleDeleteCase = (e: MouseEvent, caseId: number, caseName: string) => {
    e.stopPropagation();
    if (onDeleteCase) {
      onDeleteCase(caseId, caseName);
    }
  };

  const handleSaveAsReusable = (e: MouseEvent, caseId: number, caseName: string) => {
    e.stopPropagation();
    if (onSaveAsReusable) {
      onSaveAsReusable(caseId, caseName);
    }
  };

  return (
    <div className="sidebar-tabs">
      <div className="sidebar-header">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-co-gray-500">
          Structure
        </h3>
        <div className="combo-buttons">
          <button
            onClick={onAddCase}
            className="rounded border border-co-blue bg-white font-bold text-co-blue transition-colors hover:bg-co-blue/5"
          >
            + New Case
          </button>
          <button onClick={onAddScenario} className="btn-primary rounded font-bold">
            + New Scenario
          </button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="text-co-gray-400 p-10 text-center text-sm italic">
          No scenarios found. Create a test case to get started.
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleCaseDragEnd}
        >
          <SortableContext items={groups.map((g) => g.id)} strategy={verticalListSortingStrategy}>
            {groups.map((caseData) => (
              <SortableCase
                key={caseData.id}
                caseData={caseData}
                isOpen={openCases.has(caseData.name)}
                isEditing={editingCaseId === caseData.id}
                editName={editCaseName}
                selectedScenarioId={selectedScenarioId}
                sensors={sensors}
                onToggle={() => toggleCase(caseData.name)}
                onStartEdit={(e) => startEditingCase(e, caseData.id, caseData.name)}
                onEditChange={setEditCaseName}
                onSaveEdit={() => saveEditCase(caseData.id)}
                onCancelEdit={cancelEditCase}
                onDelete={(e) => handleDeleteCase(e, caseData.id, caseData.name)}
                onSaveAsReusable={(e) => handleSaveAsReusable(e, caseData.id, caseData.name)}
                onSelectScenario={onSelectScenario}
                onReorderScenarios={onReorderScenarios}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

export default memo(ScenarioSidebar);
