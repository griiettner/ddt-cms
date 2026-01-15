import Database from 'better-sqlite3';

/**
 * Seeds a release database with default configuration options
 * @param {string} dbPath 
 */
export const seedConfiguration = (dbPath) => {
  const db = new Database(dbPath);

  const types = [
    { key: 'button-click', name: 'button-click' },
    { key: 'button-click-redirect', name: 'button-click-redirect' },
    { key: 'field-checkbox', name: 'field-checkbox' },
    { key: 'field-error', name: 'field-error' },
    { key: 'field-input', name: 'field-input' },
    { key: 'field-label', name: 'field-label' },
    { key: 'field-options', name: 'field-options' },
    { key: 'field-radio', name: 'field-radio' },
    { key: 'field-select', name: 'field-select' },
    { key: 'field-textarea', name: 'field-textarea' },
    { key: 'text-link', name: 'text-link' },
    { key: 'text-plain', name: 'text-plain' },
    { key: 'ui-card', name: 'ui-card' },
    { key: 'ui-element', name: 'ui-element' },
    { key: 'url-validate', name: 'url-validate' },
    { key: 'url-visit', name: 'url-visit' }
  ];

  const actions = [
    { key: 'Active', name: 'Active', result_type: 'text' },
    { key: 'Click', name: 'Click', result_type: 'disabled' },
    { key: 'Custom Select', name: 'Custom Select', result_type: 'select' },
    { key: 'Options Match', name: 'Options Match', result_type: 'array' },
    { key: 'Text Match', name: 'Text Match', result_type: 'text' },
    { key: 'Text Plain', name: 'Text Plain', result_type: 'text' },
    { key: 'URL', name: 'URL', result_type: 'select' },
    { key: 'Visible', name: 'Visible', result_type: 'bool' }
  ];

  const insertConfig = db.prepare(`
    INSERT OR IGNORE INTO configuration_options 
    (category, key, display_name, result_type, order_index) 
    VALUES (?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    types.forEach((t, i) => insertConfig.run('type', t.key, t.name, null, i));
    actions.forEach((a, i) => insertConfig.run('action', a.key, a.name, a.result_type, i));
  });

  transaction();
  db.close();
};
