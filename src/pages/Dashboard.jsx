import { useState, useEffect } from 'react';
import { useRelease } from '../context/ReleaseContext';
import { ReleaseSelector, LoadingSpinner } from '../components/common';
import { dashboardApi, exportApi, releasesApi } from '../services/api';

function Dashboard() {
  const { selectedReleaseId, selectedRelease, refreshReleases } = useRelease();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedReleaseId) {
      loadDashboardData();
    }
  }, [selectedReleaseId]);

  async function loadDashboardData() {
    try {
      setLoading(true);
      const res = await dashboardApi.get(selectedReleaseId);
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    if (!selectedReleaseId) {
      alert('Please select a release first.');
      return;
    }
    try {
      const res = await exportApi.get(selectedReleaseId);
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `cms_export_release_${selectedReleaseId}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  }

  async function handleCreateRelease() {
    const name = prompt('Enter new release number (e.g., v1.1.0):');
    if (name) {
      try {
        await releasesApi.create({ release_number: name });
        await refreshReleases();
      } catch (err) {
        alert('Error creating release: ' + err.message);
      }
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-co-gray-900">Dashboard</h1>
          <p className="text-co-gray-600 mt-1">Overview of your test data</p>
        </div>
        <div className="flex items-center gap-4">
          <ReleaseSelector className="w-48" />
          <button onClick={handleExport} className="btn-primary btn-sm">
            Export JSON
          </button>
          <button onClick={handleCreateRelease} className="btn-outline btn-sm">
            + New Release
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner className="py-20" />
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="card">
              <p className="text-sm font-semibold text-co-gray-600 uppercase tracking-wide">Test Suites</p>
              <p className="text-4xl font-bold text-co-blue mt-2">{stats?.totalTestSets || 0}</p>
            </div>
            <div className="card">
              <p className="text-sm font-semibold text-co-gray-600 uppercase tracking-wide">Test Cases</p>
              <p className="text-4xl font-bold text-co-blue mt-2">{stats?.totalTestCases || 0}</p>
            </div>
            <div className="card">
              <p className="text-sm font-semibold text-co-gray-600 uppercase tracking-wide">Active Release</p>
              <p className="text-4xl font-bold text-co-blue mt-2">
                {selectedRelease?.release_number || 'None'}
              </p>
            </div>
          </div>

          {/* Recent Executions */}
          <div className="card">
            <h2 className="card-header">Recent Executions</h2>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Test Set</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Results</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.recentRuns && stats.recentRuns.length > 0 ? (
                    stats.recentRuns.map((run, i) => (
                      <tr key={i}>
                        <td className="font-medium text-co-gray-900">
                          {run.test_set_id || 'Global'}
                        </td>
                        <td>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            run.status === 'passed'
                              ? 'bg-success-light text-success'
                              : 'bg-error-light text-error'
                          }`}>
                            {run.status}
                          </span>
                        </td>
                        <td className="text-co-gray-700">
                          {new Date(run.executed_at).toLocaleDateString()}
                        </td>
                        <td className="text-co-gray-700">
                          {run.passed_tests}/{run.total_tests} Passed
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="text-center text-co-gray-500 italic py-12">
                        No execution history found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;
