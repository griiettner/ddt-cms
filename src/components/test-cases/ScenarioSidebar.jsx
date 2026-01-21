import { memo, useMemo, useState } from 'react';

// Inline SVG Icons
const PencilIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);

const TrashIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const BookmarkIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
  </svg>
);

/**
 * ScenarioSidebar - Displays the scenario list grouped by test case
 */
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
}) {
  const [editingCaseId, setEditingCaseId] = useState(null);
  const [editCaseName, setEditCaseName] = useState('');

  // Group scenarios by case
  const groups = useMemo(() => {
    const g = {};
    scenarios.forEach(s => {
      if (!g[s.test_case_id]) {
        g[s.test_case_id] = { name: s.case_name, scenarios: [] };
      }
      g[s.test_case_id].scenarios.push(s);
    });
    return g;
  }, [scenarios]);

  const startEditingCase = (e, caseId, caseName) => {
    e.stopPropagation();
    setEditingCaseId(caseId);
    setEditCaseName(caseName);
  };

  const saveEditCase = (caseId) => {
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

  const handleDeleteCase = (e, caseId, caseName) => {
    e.stopPropagation();
    if (onDeleteCase) {
      onDeleteCase(caseId, caseName);
    }
  };

  const handleSaveAsReusable = (e, caseId, caseName) => {
    e.stopPropagation();
    if (onSaveAsReusable) {
      onSaveAsReusable(caseId, caseName);
    }
  };

  return (
    <div className="sidebar-tabs">
      <div className="sidebar-header">
        <h3 className="text-xs font-bold uppercase text-co-gray-500 tracking-widest mb-4">
          Structure
        </h3>
        <div className="combo-buttons">
          <button
            onClick={onAddCase}
            className="bg-white border border-co-blue text-co-blue font-bold rounded hover:bg-co-blue/5 transition-colors"
          >
            + New Case
          </button>
          <button onClick={onAddScenario} className="btn-primary font-bold rounded">
            + New Scenario
          </button>
        </div>
      </div>

      {Object.entries(groups).length === 0 ? (
        <div className="p-10 text-center text-co-gray-400 text-sm italic">
          No scenarios found. Create a test case to get started.
        </div>
      ) : (
        Object.entries(groups).map(([caseId, caseData]) => (
          <div key={caseId} className={`case-accordion ${openCases.has(caseData.name) ? 'open' : ''}`}>
            <div className="case-header group" onClick={() => editingCaseId !== parseInt(caseId) && toggleCase(caseData.name)}>
              {editingCaseId === parseInt(caseId) ? (
                <input
                  type="text"
                  value={editCaseName}
                  onChange={(e) => setEditCaseName(e.target.value)}
                  onBlur={() => saveEditCase(parseInt(caseId))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEditCase(parseInt(caseId));
                    if (e.key === 'Escape') cancelEditCase();
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 px-2 py-1 text-sm border border-co-blue rounded focus:outline-none focus:ring-1 focus:ring-co-blue"
                  autoFocus
                />
              ) : (
                <>
                  <span className="case-title flex-1">{caseData.name}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mr-2">
                    <button
                      onClick={(e) => handleSaveAsReusable(e, parseInt(caseId), caseData.name)}
                      className="p-1 hover:bg-co-blue/10 rounded"
                      title="Save as reusable case"
                    >
                      <BookmarkIcon className="w-3.5 h-3.5 text-co-blue" />
                    </button>
                    <button
                      onClick={(e) => startEditingCase(e, parseInt(caseId), caseData.name)}
                      className="p-1 hover:bg-co-gray-200 rounded"
                      title="Edit test case"
                    >
                      <PencilIcon className="w-3.5 h-3.5 text-co-gray-500" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteCase(e, parseInt(caseId), caseData.name)}
                      className="p-1 hover:bg-red-100 rounded"
                      title="Delete test case"
                    >
                      <TrashIcon className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>
                  <svg
                    className={`w-4 h-4 text-co-gray-500 transition-transform ${openCases.has(caseData.name) ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </>
              )}
            </div>
            {openCases.has(caseData.name) && (
              <div className="bg-co-gray-50">
                {caseData.scenarios.map(s => (
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
        ))
      )}
    </div>
  );
}

export default memo(ScenarioSidebar);
