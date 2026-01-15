import Database from 'better-sqlite3';

/**
 * Seeds a release database with default configuration options
 * @param {string} dbPath 
 */
export const seedConfiguration = (dbPath) => {
  const db = new Database(dbPath);

  const types = [
    { key: 'input', name: 'Input' },
    { key: 'select', name: 'Select' },
    { key: 'button', name: 'Button' },
    { key: 'link', name: 'Link' },
    { key: 'checkbox', name: 'Checkbox' },
    { key: 'radio', name: 'Radio' },
    { key: 'text', name: 'Static Text' }
  ];

  const actions = [
    { key: 'click', name: 'Click', result_type: 'disable' },
    { key: 'fill', name: 'Fill', result_type: 'text' },
    { key: 'select', name: 'Select Option', result_type: 'text' },
    { key: 'check', name: 'Check', result_type: 'bool' },
    { key: 'uncheck', name: 'Uncheck', result_type: 'bool' },
    { key: 'verify_visible', name: 'Verify Visible', result_type: 'bool' },
    { key: 'verify_text', name: 'Verify Text', result_type: 'text' },
    { key: 'wait_for', name: 'Wait For', result_type: 'text' }
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
