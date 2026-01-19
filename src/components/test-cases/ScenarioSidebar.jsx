import { memo, useMemo } from 'react';

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
}) {
  // Group scenarios by case
  const groups = useMemo(() => {
    const g = {};
    scenarios.forEach(s => {
      if (!g[s.case_name]) g[s.case_name] = [];
      g[s.case_name].push(s);
    });
    return g;
  }, [scenarios]);

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
        Object.entries(groups).map(([caseName, caseScenarios]) => (
          <div key={caseName} className={`case-accordion ${openCases.has(caseName) ? 'open' : ''}`}>
            <div className="case-header" onClick={() => toggleCase(caseName)}>
              <span className="case-title">{caseName}</span>
              <svg
                className={`w-4 h-4 text-co-gray-500 transition-transform ${openCases.has(caseName) ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {openCases.has(caseName) && (
              <div className="bg-co-gray-50">
                {caseScenarios.map(s => (
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
