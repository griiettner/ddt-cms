/**
 * Settings Page Logic
 */

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
 * Fetch and display type options
 */
async function loadTypes() {
  const tbody = document.getElementById('types-body');

  try {
    // Temporary: Show sample data until API is implemented
    const sampleTypes = [
      { order_index: 1, key: 'navigation', display_name: 'Navigation', is_active: true },
      { order_index: 2, key: 'interaction', display_name: 'Interaction', is_active: true },
      { order_index: 3, key: 'validation', display_name: 'Validation', is_active: true },
      { order_index: 4, key: 'data_entry', display_name: 'Data Entry', is_active: true },
      { order_index: 5, key: 'wait', display_name: 'Wait', is_active: true }
    ];

    tbody.innerHTML = sampleTypes.map(type => `
      <tr class="table-row">
        <td class="table-cell text-center font-semibold">${type.order_index}</td>
        <td class="table-cell font-mono text-sm">${type.key}</td>
        <td class="table-cell font-semibold">${type.display_name}</td>
        <td class="table-cell text-center">
          ${type.is_active
            ? '<span class="badge-success">Active</span>'
            : '<span class="badge-error">Inactive</span>'
          }
        </td>
        <td class="table-cell text-center">
          <button class="text-co-blue-primary hover:text-co-blue-dark font-semibold px-3 py-1">
            Edit
          </button>
        </td>
      </tr>
    `).join('');

    // TODO: Replace with actual API call when implemented
    // const response = await fetch(`${API_BASE}/config/types`);
    // const types = await response.json();
  } catch (error) {
    console.error('Error loading types:', error);
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-8 text-red-600">
          Error loading type options. Please try again.
        </td>
      </tr>
    `;
  }
}

/**
 * Fetch and display action options
 */
async function loadActions() {
  const tbody = document.getElementById('actions-body');

  try {
    // Temporary: Show sample data until API is implemented
    const sampleActions = [
      { order_index: 1, key: 'active', display_name: 'Active', result_type: 'bool', is_active: true },
      { order_index: 2, key: 'visible', display_name: 'Visible', result_type: 'bool', is_active: true },
      { order_index: 3, key: 'click', display_name: 'Click', result_type: 'disable', is_active: true },
      { order_index: 4, key: 'text_match', display_name: 'Text Match', result_type: 'text', is_active: true },
      { order_index: 5, key: 'text_plain', display_name: 'Text Plain', result_type: 'text', is_active: true },
      { order_index: 6, key: 'url', display_name: 'URL', result_type: 'url', is_active: true },
      { order_index: 7, key: 'custom_select', display_name: 'Custom Select', result_type: 'select', is_active: true },
      { order_index: 8, key: 'options_match', display_name: 'Options Match', result_type: 'array', is_active: true }
    ];

    tbody.innerHTML = sampleActions.map(action => {
      // Color code result types
      const typeColors = {
        'bool': 'bg-green-100 text-green-800',
        'text': 'bg-blue-100 text-blue-800',
        'select': 'bg-purple-100 text-purple-800',
        'disable': 'bg-gray-100 text-gray-800',
        'array': 'bg-yellow-100 text-yellow-800',
        'url': 'bg-indigo-100 text-indigo-800'
      };

      const typeClass = typeColors[action.result_type] || 'bg-gray-100 text-gray-800';

      return `
        <tr class="table-row">
          <td class="table-cell text-center font-semibold">${action.order_index}</td>
          <td class="table-cell font-mono text-sm">${action.key}</td>
          <td class="table-cell font-semibold">${action.display_name}</td>
          <td class="table-cell">
            <span class="inline-block px-2 py-1 rounded text-xs font-semibold ${typeClass}">
              ${action.result_type}
            </span>
          </td>
          <td class="table-cell text-center">
            ${action.is_active
              ? '<span class="badge-success">Active</span>'
              : '<span class="badge-error">Inactive</span>'
            }
          </td>
          <td class="table-cell text-center">
            <button class="text-co-blue-primary hover:text-co-blue-dark font-semibold px-3 py-1">
              Edit
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // TODO: Replace with actual API call when implemented
    // const response = await fetch(`${API_BASE}/config/actions`);
    // const actions = await response.json();
  } catch (error) {
    console.error('Error loading actions:', error);
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-8 text-red-600">
          Error loading action options. Please try again.
        </td>
      </tr>
    `;
  }
}

/**
 * Handle new type button
 */
function handleNewType() {
  alert('Add Type functionality will be implemented in the next phase');
  // TODO: Open modal for creating new type
}

/**
 * Handle new action button
 */
function handleNewAction() {
  alert('Add Action functionality will be implemented in the next phase');
  // TODO: Open modal for creating new action
}

/**
 * Initialize page
 */
async function init() {
  console.log('Initializing Settings page...');

  // Load data
  await loadUserInfo();
  await loadTypes();
  await loadActions();

  // Set up event listeners
  const newTypeBtn = document.getElementById('new-type-btn');
  const newActionBtn = document.getElementById('new-action-btn');

  newTypeBtn.addEventListener('click', handleNewType);
  newActionBtn.addEventListener('click', handleNewAction);

  console.log('Settings page initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
