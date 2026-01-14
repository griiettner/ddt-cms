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
      <tr class="table-row group">
        <td class="table-cell text-center font-bold text-co-gray-400 group-hover:text-co-blue-primary transition-colors">${type.order_index}</td>
        <td class="table-cell">
          <div class="inline-flex items-center px-2 py-1 bg-co-blue-primary/5 border border-co-blue-primary/10 rounded-lg text-co-blue-primary font-mono text-xs font-bold">
            ${type.key}
          </div>
        </td>
        <td class="table-cell font-bold text-co-blue-dark dark:text-co-blue-light">${type.display_name}</td>
        <td class="table-cell text-center">
          ${type.is_active
            ? '<span class="badge-success">Operational</span>'
            : '<span class="badge-error">Deprioritized</span>'
          }
        </td>
        <td class="table-cell text-right">
          <button class="p-2 bg-co-gray-100 dark:bg-co-gray-800 text-co-gray-600 dark:text-co-gray-400 hover:bg-co-blue-primary hover:text-white rounded-xl transition-all" title="Modify Config">
            <i data-lucide="edit-3" class="w-4 h-4"></i>
          </button>
        </td>
      </tr>
    `).join('');

    if (window.lucide) {
      window.lucide.createIcons();
    }

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
        'bool': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800',
        'text': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        'select': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        'disable': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700',
        'array': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
        'url': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
      };

      const typeClass = typeColors[action.result_type] || 'bg-gray-100 text-gray-700';

      return `
        <tr class="table-row group">
          <td class="table-cell text-center font-bold text-co-gray-400 group-hover:text-indigo-500 transition-colors">${action.order_index}</td>
          <td class="table-cell">
            <div class="inline-flex items-center px-2 py-1 bg-indigo-500/5 border border-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-300 font-mono text-xs font-bold">
              ${action.key}
            </div>
          </td>
          <td class="table-cell font-bold text-co-blue-dark dark:text-co-blue-light">${action.display_name}</td>
          <td class="table-cell">
            <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${typeClass}">
              ${action.result_type}
            </span>
          </td>
          <td class="table-cell text-center">
            ${action.is_active
              ? '<span class="badge-success">Active</span>'
              : '<span class="badge-error">Locked</span>'
            }
          </td>
          <td class="table-cell text-right">
            <button class="p-2 bg-co-gray-100 dark:bg-co-gray-800 text-co-gray-600 dark:text-co-gray-400 hover:bg-indigo-600 hover:text-white rounded-xl transition-all" title="Modify Action">
              <i data-lucide="zap" class="w-4 h-4"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) {
      window.lucide.createIcons();
    }

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
