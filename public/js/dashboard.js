/**
 * Dashboard Page Logic
 */

// API base URL
const API_BASE = '/api';

/**
 * Fetch and display user information
 */
async function loadUserInfo() {
  try {
    const response = await fetch(`${API_BASE}/status`);
    const data = await response.json();

    if (data.user) {
      const userDisplay = document.getElementById('user-display');
      userDisplay.textContent = data.user.displayName || data.user.username;
    }
  } catch (error) {
    console.error('Error loading user info:', error);
  }
}

/**
 * Fetch and display releases
 */
async function loadReleases() {
  const selector = document.getElementById('release-selector');

  try {
    // Temporary: Show placeholder until API is implemented
    selector.innerHTML = '<option value="1" selected>v1.0.0 (Initial Release)</option>';

    // TODO: Replace with actual API call when implemented
    // const response = await fetch(`${API_BASE}/releases`);
    // const releases = await response.json();
    // renderReleaseOptions(releases);
  } catch (error) {
    console.error('Error loading releases:', error);
    selector.innerHTML = '<option value="">Error loading releases</option>';
  }
}

/**
 * Load dashboard statistics
 */
async function loadStatistics() {
  try {
    // Temporary: Show placeholder data until API is implemented
    document.getElementById('stat-total-cases').textContent = '1';
    document.getElementById('stat-total-steps').textContent = '3';
    document.getElementById('stat-pass-rate').textContent = '100%';
    document.getElementById('stat-last-run').textContent = 'Never';

    // TODO: Replace with actual API call when implemented
    // const releaseId = document.getElementById('release-selector').value;
    // const response = await fetch(`${API_BASE}/dashboard/${releaseId}`);
    // const stats = await response.json();
    // renderStatistics(stats);
  } catch (error) {
    console.error('Error loading statistics:', error);
  }
}

/**
 * Load recent test runs
 */
async function loadRecentRuns() {
  const tbody = document.getElementById('recent-runs-body');

  try {
    // Temporary: Show "no data" message until API is implemented
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-8 text-gray-400">
          No test runs recorded yet
        </td>
      </tr>
    `;

    // TODO: Replace with actual API call when implemented
    // const releaseId = document.getElementById('release-selector').value;
    // const response = await fetch(`${API_BASE}/test-runs?releaseId=${releaseId}&limit=10`);
    // const runs = await response.json();
    // renderTestRuns(runs);
  } catch (error) {
    console.error('Error loading test runs:', error);
  }
}

/**
 * Render test runs table
 */
function renderTestRuns(runs) {
  const tbody = document.getElementById('recent-runs-body');

  if (runs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-8 text-gray-400">
          No test runs recorded yet
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = runs.map(run => {
    const statusClass = run.status === 'passed' ? 'badge-success' : 'badge-error';
    const date = new Date(run.executed_at).toLocaleString();
    const passRate = run.total_tests > 0
      ? Math.round((run.passed_tests / run.total_tests) * 100)
      : 0;

    return `
      <tr class="table-row">
        <td class="table-cell font-medium">${date}</td>
        <td class="table-cell">${run.executed_by}</td>
        <td class="table-cell">${run.test_set_name || 'Full Release'}</td>
        <td class="table-cell text-center">
          <span class="${statusClass}">
            ${run.status.toUpperCase()}
          </span>
        </td>
        <td class="table-cell text-center font-bold text-co-success">${run.passed_tests}</td>
        <td class="table-cell text-center font-bold text-co-red-primary">${run.failed_tests}</td>
      </tr>
    `;
  }).join('');
  
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/**
 * Handle release change
 */
function handleReleaseChange() {
  loadStatistics();
  loadRecentRuns();
}

/**
 * Handle new release button click
 */
function handleNewRelease() {
  alert('Create New Release functionality will be implemented in the next phase.\n\nThis will duplicate all test data from the current release to a new release version.');
}

/**
 * Handle create test card click
 */
function handleCreateTest() {
  // Navigate to test sets page
  window.location.href = '/test-sets.html';
}

/**
 * Initialize dashboard
 */
async function init() {
  console.log('Initializing dashboard...');

  // Load all data
  await loadUserInfo();
  await loadReleases();
  await loadStatistics();
  await loadRecentRuns();

  // Set up event listeners
  const releaseSelector = document.getElementById('release-selector');
  releaseSelector.addEventListener('change', handleReleaseChange);

  const newReleaseBtn = document.getElementById('new-release-btn');
  if (newReleaseBtn) {
    newReleaseBtn.addEventListener('click', handleNewRelease);
  }

  const createTestCard = document.getElementById('create-test-card');
  if (createTestCard) {
    createTestCard.addEventListener('click', handleCreateTest);
  }

  console.log('Dashboard initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
