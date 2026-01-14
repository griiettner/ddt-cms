/**
 * Test Sets Page Logic
 */

const API_BASE = '/api';

// Global state
let currentReleaseId = null;
let testSetToDelete = null;

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
    const response = await fetch(`${API_BASE}/releases`);
    const releases = await response.json();

    if (releases.length === 0) {
      selector.innerHTML = '<option value="">No releases found</option>';
      return;
    }

    // Find active release or use first one
    const activeRelease = releases.find(r => r.status === 'active') || releases[0];
    currentReleaseId = activeRelease.id;

    selector.innerHTML = releases.map(release =>
      `<option value="${release.id}" ${release.id === currentReleaseId ? 'selected' : ''}>
        ${release.release_number} ${release.status === 'archived' ? '(Archived)' : ''}
      </option>`
    ).join('');

    // Load test sets for the selected release
    loadTestSets();
  } catch (error) {
    console.error('Error loading releases:', error);
    selector.innerHTML = '<option value="">Error loading releases</option>';
  }
}

/**
 * Fetch and display test sets
 */
async function loadTestSets() {
  const tbody = document.getElementById('test-sets-body');

  if (!currentReleaseId) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-8 text-co-gray-400">
          No release selected
        </td>
      </tr>
    `;
    return;
  }

  try {
    // Show loading
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-8 text-co-gray-400">
          <div class="flex flex-col items-center">
            <div class="spinner mb-4"></div>
            <span>Loading test sets...</span>
          </div>
        </td>
      </tr>
    `;

    const response = await fetch(`${API_BASE}/test-sets?releaseId=${currentReleaseId}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const testSets = await response.json();

    if (testSets.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-8 text-co-gray-400">
            No test sets found for this release. Click "New Test Set" to create one.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = testSets.map(testSet => {
      const createdDate = new Date(testSet.created_at).toLocaleDateString();

      return `
        <tr class="table-row">
          <td class="table-cell font-bold text-co-blue-primary">
            <div class="flex items-center gap-3">
              <div class="bg-co-blue-primary/10 p-2 rounded-lg text-co-blue-primary">
                <i data-lucide="folder" class="w-4 h-4"></i>
              </div>
              <span class="tracking-tight">${escapeHtml(testSet.name)}</span>
            </div>
          </td>
          <td class="table-cell text-co-gray-600 dark:text-co-gray-400 italic text-sm">${escapeHtml(testSet.description || 'No description provided')}</td>
          <td class="table-cell text-center">
             <span class="badge-info px-4">${testSet.test_case_count} Cases</span>
          </td>
          <td class="table-cell text-center text-xs font-bold text-co-gray-500 uppercase tracking-widest">${createdDate}</td>
          <td class="table-cell text-right">
            <div class="flex items-center justify-end gap-2">
                <button class="p-2 bg-co-blue-primary/10 text-co-blue-primary hover:bg-co-blue-primary hover:text-white rounded-xl transition-all btn-view" data-id="${testSet.id}" title="View Details">
                  <i data-lucide="eye" class="w-4 h-4 pointer-events-none"></i>
                </button>
                <button class="p-2 bg-co-gray-100 dark:bg-co-gray-800 text-co-gray-600 dark:text-co-gray-400 hover:bg-co-blue-primary hover:text-white rounded-xl transition-all btn-edit" data-id="${testSet.id}" title="Edit Metadata">
                  <i data-lucide="edit-3" class="w-4 h-4 pointer-events-none"></i>
                </button>
                <button class="p-2 bg-co-red-primary/10 text-co-red-primary hover:bg-co-red-primary hover:text-white rounded-xl transition-all btn-delete" data-id="${testSet.id}" data-name="${escapeHtml(testSet.name)}" title="Delete Set">
                  <i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i>
                </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) {
      window.lucide.createIcons();
    }

    // Add event listeners to action buttons
    document.querySelectorAll('.btn-view').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const testSetId = e.target.dataset.id;
        viewTestSet(testSetId);
      });
    });

    document.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const testSetId = e.target.dataset.id;
        editTestSet(testSetId);
      });
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const testSetId = e.target.dataset.id;
        const testSetName = e.target.dataset.name;
        confirmDeleteTestSet(testSetId, testSetName);
      });
    });

  } catch (error) {
    console.error('Error loading test sets:', error);
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-8 text-red-600">
          Error loading test sets: ${error.message}
        </td>
      </tr>
    `;
  }
}

/**
 * View test cases for a test set
 */
function viewTestSet(testSetId) {
  console.log('Viewing test set:', testSetId);
  window.location.href = `/test-cases.html?testSetId=${testSetId}`;
}

/**
 * Open modal for editing test set
 */
async function editTestSet(testSetId) {
  try {
    const response = await fetch(`${API_BASE}/test-sets/${testSetId}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const testSet = await response.json();

    // Populate form
    document.getElementById('test-set-id').value = testSet.id;
    document.getElementById('test-set-name').value = testSet.name;
    document.getElementById('test-set-description').value = testSet.description || '';

    // Update modal title and button
    document.getElementById('modal-title').textContent = 'Edit Test Set';
    document.getElementById('submit-btn').textContent = 'Update Test Set';

    // Open modal
    openModal();
  } catch (error) {
    console.error('Error loading test set:', error);
    alert(`Error loading test set: ${error.message}`);
  }
}

/**
 * Show delete confirmation modal
 */
function confirmDeleteTestSet(testSetId, testSetName) {
  testSetToDelete = testSetId;
  document.getElementById('delete-test-set-name').textContent = testSetName;
  document.getElementById('delete-modal').classList.remove('hidden');
}

/**
 * Delete test set
 */
async function deleteTestSet() {
  if (!testSetToDelete) return;

  try {
    const response = await fetch(`${API_BASE}/test-sets/${testSetToDelete}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Test set deleted:', result);

    // Close modal and refresh list
    closeDeleteModal();
    await loadTestSets();

    // Show success message
    showNotification('Test set deleted successfully', 'success');
  } catch (error) {
    console.error('Error deleting test set:', error);
    alert(`Error deleting test set: ${error.message}`);
  }
}

/**
 * Modal Management - Create/Edit
 */
const modal = document.getElementById('test-set-modal');
const newTestSetBtn = document.getElementById('new-test-set-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelBtn = document.getElementById('cancel-btn');
const form = document.getElementById('test-set-form');

function openModal() {
  modal.classList.remove('hidden');
}

function closeModal() {
  modal.classList.add('hidden');
  form.reset();
  document.getElementById('test-set-id').value = '';
  document.getElementById('modal-title').textContent = 'Create New Test Set';
  document.getElementById('submit-btn').textContent = 'Create Test Set';
}

/**
 * Modal Management - Delete
 */
const deleteModal = document.getElementById('delete-modal');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

function closeDeleteModal() {
  deleteModal.classList.add('hidden');
  testSetToDelete = null;
}

/**
 * Handle form submission (create or update)
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('test-set-id').value;
  const name = document.getElementById('test-set-name').value;
  const description = document.getElementById('test-set-description').value;

  const isEdit = !!id;

  try {
    const url = isEdit
      ? `${API_BASE}/test-sets/${id}`
      : `${API_BASE}/test-sets`;

    const method = isEdit ? 'PUT' : 'POST';

    const body = isEdit
      ? { name, description }
      : { release_id: currentReleaseId, name, description };

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log(isEdit ? 'Test set updated:' : 'Test set created:', result);

    // Close modal and refresh list
    closeModal();
    await loadTestSets();

    // Show success message
    showNotification(
      isEdit ? 'Test set updated successfully' : 'Test set created successfully',
      'success'
    );
  } catch (error) {
    console.error('Error saving test set:', error);
    alert(`Error saving test set: ${error.message}`);
  }
}

/**
 * Handle release change
 */
function handleReleaseChange() {
  currentReleaseId = parseInt(document.getElementById('release-selector').value);
  loadTestSets();
}

/**
 * Show notification (simple implementation)
 */
function showNotification(message, type = 'success') {
  // TODO: Implement a proper notification system
  console.log(`[${type}]`, message);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Initialize page
 */
async function init() {
  console.log('Initializing Test Sets page...');

  // Load data
  await loadUserInfo();
  await loadReleases();

  // Set up event listeners - Create/Edit Modal
  newTestSetBtn.addEventListener('click', openModal);
  closeModalBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  form.addEventListener('submit', handleFormSubmit);

  // Set up event listeners - Delete Modal
  cancelDeleteBtn.addEventListener('click', closeDeleteModal);
  confirmDeleteBtn.addEventListener('click', deleteTestSet);

  // Release selector
  const releaseSelector = document.getElementById('release-selector');
  releaseSelector.addEventListener('change', handleReleaseChange);

  // Close modals on outside click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) {
      closeDeleteModal();
    }
  });

  console.log('Test Sets page initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
