/**
 * Test Cases Page Logic with AG Grid
 */

const API_BASE = '/api';

// Global state
let testSetId = null;
let testCases = [];
let gridsById = {}; // Store AG Grid instances by test case ID

/**
 * Get URL parameters
 */
function getUrlParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

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
 * Load test set information
 */
async function loadTestSetInfo() {
  try {
    const response = await fetch(`${API_BASE}/test-sets/${testSetId}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const testSet = await response.json();

    document.getElementById('test-set-title').textContent = testSet.name;
    document.getElementById('test-set-description').textContent = testSet.description || '';
    document.getElementById('test-set-name-breadcrumb').textContent = testSet.name;
    document.getElementById('test-case-count').textContent = `${testSet.test_case_count} Test Case(s)`;

  } catch (error) {
    console.error('Error loading test set:', error);
    document.getElementById('test-set-title').textContent = 'Error loading test set';
  }
}

/**
 * Load and display test cases
 */
async function loadTestCases() {
  const container = document.getElementById('test-cases-container');

  try {
    // TODO: Replace with actual API call when implemented
    // const response = await fetch(`${API_BASE}/test-cases?testSetId=${testSetId}`);
    // testCases = await response.json();

    // Temporary: Use sample data
    testCases = [
      {
        id: 1,
        test_set_id: testSetId,
        name: 'Sample Test Case',
        description: 'Example test case with sample steps',
        order_index: 0,
        is_active: true
      }
    ];

    if (testCases.length === 0) {
      container.innerHTML = `
        <div class="card text-center py-12">
          <p class="text-co-gray-400 mb-4">No test cases found</p>
          <button class="btn-primary" onclick="document.getElementById('fab-new-test-case').click()">
            Create First Test Case
          </button>
        </div>
      `;
      return;
    }

    // Render accordions
    container.innerHTML = testCases.map(testCase => createAccordion(testCase)).join('');

    // Initialize AG Grids for each test case
    testCases.forEach(testCase => {
      initializeGrid(testCase.id);
    });

    // Set up accordion click handlers
    setupAccordionHandlers();

  } catch (error) {
    console.error('Error loading test cases:', error);
    container.innerHTML = `
      <div class="card text-center py-12 text-red-600">
        Error loading test cases: ${error.message}
      </div>
    `;
  }
}

/**
 * Create accordion HTML for a test case
 */
function createAccordion(testCase) {
  return `
    <div class="accordion-item">
      <div class="accordion-header" data-test-case-id="${testCase.id}">
        <div class="flex items-center space-x-4">
          <svg class="chevron w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
          <div>
            <h3 class="font-bold text-lg">${escapeHtml(testCase.name)}</h3>
            ${testCase.description ? `<p class="text-sm opacity-75">${escapeHtml(testCase.description)}</p>` : ''}
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <button class="btn-edit-case px-3 py-1 rounded hover:bg-white hover:bg-opacity-20" data-id="${testCase.id}" onclick="event.stopPropagation()">
            Edit
          </button>
          <button class="btn-delete-case px-3 py-1 rounded hover:bg-white hover:bg-opacity-20" data-id="${testCase.id}" onclick="event.stopPropagation()">
            Delete
          </button>
        </div>
      </div>
      <div class="accordion-body hidden" id="accordion-body-${testCase.id}">
        <div class="ag-grid-container ag-theme-capital-one" id="grid-${testCase.id}"></div>
        <div class="mt-4 flex justify-end">
          <button class="btn-primary" onclick="addNewRow(${testCase.id})">
            <span class="mr-2">+</span> Add Test Step
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Setup accordion click handlers
 */
function setupAccordionHandlers() {
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const testCaseId = header.dataset.testCaseId;
      toggleAccordion(testCaseId);
    });
  });
}

/**
 * Toggle accordion open/close
 */
function toggleAccordion(testCaseId) {
  const header = document.querySelector(`[data-test-case-id="${testCaseId}"]`);
  const body = document.getElementById(`accordion-body-${testCaseId}`);
  const chevron = header.querySelector('.chevron');

  const isOpen = !body.classList.contains('hidden');

  if (isOpen) {
    // Close
    body.classList.add('hidden');
    header.classList.remove('active');
    chevron.classList.remove('rotated');
  } else {
    // Open
    body.classList.remove('hidden');
    header.classList.add('active');
    chevron.classList.add('rotated');

    // Refresh grid size
    const grid = gridsById[testCaseId];
    if (grid) {
      setTimeout(() => grid.api.sizeColumnsToFit(), 100);
    }
  }
}

/**
 * Initialize AG Grid for a test case
 */
async function initializeGrid(testCaseId) {
  const gridDiv = document.getElementById(`grid-${testCaseId}`);
  if (!gridDiv) return;

  // Column definitions - 7 fixed columns
  const columnDefs = [
    {
      headerName: 'Step Definition',
      field: 'step_definition',
      editable: true,
      flex: 2,
      cellEditor: 'agLargeTextCellEditor',
      cellEditorPopup: true
    },
    {
      headerName: 'Type',
      field: 'type',
      editable: true,
      flex: 1,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['navigation', 'interaction', 'validation', 'data_entry', 'wait']
      }
    },
    {
      headerName: 'ID',
      field: 'element_id',
      editable: true,
      flex: 1
    },
    {
      headerName: 'Action',
      field: 'action',
      editable: true,
      flex: 1,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['active', 'visible', 'click', 'text_match', 'text_plain', 'url', 'custom_select', 'options_match']
      }
    },
    {
      headerName: 'Action Result',
      field: 'action_result',
      editable: true,
      flex: 2,
      cellEditor: 'agLargeTextCellEditor'
      // TODO: Implement dynamic cell editor based on action type
    },
    {
      headerName: 'Required',
      field: 'required',
      editable: true,
      flex: 0.8,
      cellRenderer: params => {
        return `<input type="checkbox" ${params.value ? 'checked' : ''} disabled style="cursor: not-allowed">`;
      },
      cellEditor: 'agCheckboxCellEditor'
    },
    {
      headerName: 'Expected Results',
      field: 'expected_results',
      editable: true,
      flex: 2,
      cellEditor: 'agLargeTextCellEditor',
      cellEditorPopup: true
    }
  ];

  // Load test steps for this test case
  const rowData = await loadTestSteps(testCaseId);

  // Grid options
  const gridOptions = {
    columnDefs: columnDefs,
    rowData: rowData,
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true
    },
    rowSelection: 'single',
    animateRows: true,
    onCellValueChanged: (event) => {
      console.log('Cell value changed:', event);
      // TODO: Auto-save to API
      saveTestStep(event.data);
    }
  };

  // Create grid
  const grid = agGrid.createGrid(gridDiv, gridOptions);
  gridsById[testCaseId] = grid;
}

/**
 * Load test steps for a test case
 */
async function loadTestSteps(testCaseId) {
  try {
    // TODO: Replace with actual API call when implemented
    // const response = await fetch(`${API_BASE}/test-steps?testCaseId=${testCaseId}`);
    // return await response.json();

    // Temporary: Return sample data
    return [
      {
        id: 1,
        test_case_id: testCaseId,
        order_index: 0,
        step_definition: 'Navigate to login page',
        type: 'navigation',
        element_id: '',
        action: 'url',
        action_result: 'https://example.com/login',
        required: true,
        expected_results: 'Login page loads successfully'
      },
      {
        id: 2,
        test_case_id: testCaseId,
        order_index: 1,
        step_definition: 'Verify login button is visible',
        type: 'validation',
        element_id: 'login-button',
        action: 'visible',
        action_result: 'true',
        required: true,
        expected_results: 'Login button is displayed'
      },
      {
        id: 3,
        test_case_id: testCaseId,
        order_index: 2,
        step_definition: 'Click login button',
        type: 'interaction',
        element_id: 'login-button',
        action: 'click',
        action_result: '',
        required: true,
        expected_results: 'Login form is submitted'
      }
    ];
  } catch (error) {
    console.error('Error loading test steps:', error);
    return [];
  }
}

/**
 * Save test step (auto-save)
 */
async function saveTestStep(stepData) {
  try {
    console.log('Saving test step:', stepData);
    // TODO: Implement API call to save test step
    // const response = await fetch(`${API_BASE}/test-steps/${stepData.id}`, {
    //   method: 'PUT',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(stepData)
    // });
  } catch (error) {
    console.error('Error saving test step:', error);
  }
}

/**
 * Add new row to grid
 */
window.addNewRow = function(testCaseId) {
  const grid = gridsById[testCaseId];
  if (!grid) return;

  const newRow = {
    id: null, // Will be assigned by API
    test_case_id: testCaseId,
    order_index: grid.api.getDisplayedRowCount(),
    step_definition: '',
    type: 'interaction',
    element_id: '',
    action: 'click',
    action_result: '',
    required: false,
    expected_results: ''
  };

  grid.api.applyTransaction({ add: [newRow] });
  console.log('Added new row to test case:', testCaseId);
};

/**
 * FAB Menu management
 */
const fabMain = document.getElementById('fab-main');
const fabMenu = document.getElementById('fab-menu');
let fabMenuOpen = false;

fabMain.addEventListener('click', () => {
  fabMenuOpen = !fabMenuOpen;
  if (fabMenuOpen) {
    fabMenu.classList.remove('hidden');
  } else {
    fabMenu.classList.add('hidden');
  }
});

/**
 * New Test Case Modal
 */
const testCaseModal = document.getElementById('test-case-modal');
const newTestCaseBtn = document.getElementById('fab-new-test-case');
const closeTestCaseModal = document.getElementById('close-test-case-modal');
const cancelTestCase = document.getElementById('cancel-test-case');
const testCaseForm = document.getElementById('test-case-form');

newTestCaseBtn.addEventListener('click', () => {
  testCaseModal.classList.remove('hidden');
  fabMenu.classList.add('hidden');
  fabMenuOpen = false;
});

closeTestCaseModal.addEventListener('click', () => {
  testCaseModal.classList.add('hidden');
});

cancelTestCase.addEventListener('click', () => {
  testCaseModal.classList.add('hidden');
});

testCaseForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('test-case-name').value;
  const description = document.getElementById('test-case-description').value;

  console.log('Creating test case:', { name, description, testSetId });

  // TODO: Implement API call
  alert('Test case creation will be implemented when API is ready');
  testCaseModal.classList.add('hidden');
  testCaseForm.reset();
});

/**
 * New Test Row shortcut
 */
document.getElementById('fab-new-test-row').addEventListener('click', () => {
  // Add row to the first open accordion
  const firstOpenCase = testCases[0];
  if (firstOpenCase) {
    addNewRow(firstOpenCase.id);
  } else {
    alert('Please open a test case first');
  }
  fabMenu.classList.add('hidden');
  fabMenuOpen = false;
});

/**
 * Keyboard shortcuts
 */
document.addEventListener('keydown', (e) => {
  // Ctrl+Shift+R - New Test Row
  if (e.ctrlKey && e.shiftKey && e.key === 'R') {
    e.preventDefault();
    document.getElementById('fab-new-test-row').click();
  }
});

/**
 * Escape HTML
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
  console.log('Initializing Test Cases page...');

  // Get test set ID from URL
  testSetId = getUrlParam('testSetId');

  if (!testSetId) {
    document.getElementById('test-cases-container').innerHTML = `
      <div class="card text-center py-12 text-red-600">
        No test set ID provided
      </div>
    `;
    return;
  }

  // Load data
  await loadUserInfo();
  await loadTestSetInfo();
  await loadTestCases();

  // Open first accordion by default
  if (testCases.length > 0) {
    setTimeout(() => toggleAccordion(testCases[0].id), 500);
  }

  console.log('Test Cases page initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
