import { memo, useMemo, useState, type MouseEvent } from 'react';
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

interface CaseGroup {
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
}: ScenarioSidebarProps): JSX.Element {
  const [editingCaseId, setEditingCaseId] = useState<number | null>(null);
  const [editCaseName, setEditCaseName] = useState('');

  const groups = useMemo(() => {
    const g: Record<number, CaseGroup> = {};
    scenarios.forEach((s) => {
      if (!g[s.test_case_id]) {
        g[s.test_case_id] = { name: s.case_name || 'Unknown', scenarios: [] };
      }
      g[s.test_case_id].scenarios.push(s);
    });
    return g;
  }, [scenarios]);

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

      {Object.entries(groups).length === 0 ? (
        <div className="text-co-gray-400 p-10 text-center text-sm italic">
          No scenarios found. Create a test case to get started.
        </div>
      ) : (
        Object.entries(groups).map(([caseIdStr, caseData]) => {
          const caseId = parseInt(caseIdStr, 10);
          return (
            <div
              key={caseId}
              className={`case-accordion ${openCases.has(caseData.name) ? 'open' : ''}`}
            >
              <div
                className="case-header group"
                onClick={() => editingCaseId !== caseId && toggleCase(caseData.name)}
              >
                {editingCaseId === caseId ? (
                  <input
                    type="text"
                    value={editCaseName}
                    onChange={(e) => setEditCaseName(e.target.value)}
                    onBlur={() => saveEditCase(caseId)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEditCase(caseId);
                      if (e.key === 'Escape') cancelEditCase();
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
                        onClick={(e) => handleSaveAsReusable(e, caseId, caseData.name)}
                        className="rounded p-1 hover:bg-co-blue/10"
                        title="Save as reusable case"
                      >
                        <BookmarkIcon className="h-3.5 w-3.5 text-co-blue" />
                      </button>
                      <button
                        onClick={(e) => startEditingCase(e, caseId, caseData.name)}
                        className="rounded p-1 hover:bg-co-gray-200"
                        title="Edit test case"
                      >
                        <PencilIcon className="h-3.5 w-3.5 text-co-gray-500" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteCase(e, caseId, caseData.name)}
                        className="rounded p-1 hover:bg-red-100"
                        title="Delete test case"
                      >
                        <TrashIcon className="h-3.5 w-3.5 text-red-500" />
                      </button>
                    </div>
                    <svg
                      className={`h-4 w-4 text-co-gray-500 transition-transform ${openCases.has(caseData.name) ? 'rotate-180' : ''}`}
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
              {openCases.has(caseData.name) && (
                <div className="bg-co-gray-50">
                  {caseData.scenarios.map((s) => (
                    <div
                      key={s.id}
                      className={`scenario-tab ${selectedScenarioId === s.id ? 'active' : ''}`}
                      onClick={() => onSelectScenario(s.id)}
                    >
                      {s.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

export default memo(ScenarioSidebar);
