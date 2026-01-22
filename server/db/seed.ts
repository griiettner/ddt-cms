import { getDb } from './database.js';
import type { DatabaseInstance, TypeConfig, ActionConfig } from '../types/index.js';

/**
 * Seeds the database with default configuration options
 * This seeds global defaults (release_id = NULL) that can be overridden per-release
 */
export const seedConfiguration = (): void => {
  const db: DatabaseInstance = getDb();

  const types: TypeConfig[] = [
    { key: 'button-click', name: 'button-click' },
    { key: 'button-click-redirect', name: 'button-click-redirect' },
    { key: 'field-checkbox', name: 'field-checkbox' },
    { key: 'field-error', name: 'field-error' },
    { key: 'field-input', name: 'field-input' },
    { key: 'field-label', name: 'field-label' },
    { key: 'field-options', name: 'field-options' },
    { key: 'field-password', name: 'field-password' },
    { key: 'field-radio', name: 'field-radio' },
    { key: 'field-select', name: 'field-select' },
    { key: 'field-textarea', name: 'field-textarea' },
    { key: 'text-link', name: 'text-link' },
    { key: 'text-plain', name: 'text-plain' },
    { key: 'ui-card', name: 'ui-card' },
    { key: 'ui-element', name: 'ui-element' },
    { key: 'url-validate', name: 'url-validate' },
    { key: 'url-visit', name: 'url-visit' },
  ];

  const actions: ActionConfig[] = [
    { key: 'Active', name: 'Active', result_type: 'text' },
    { key: 'Click', name: 'Click', result_type: 'disabled' },
    { key: 'Custom Select', name: 'Custom Select', result_type: 'select' },
    { key: 'Options Match', name: 'Options Match', result_type: 'array' },
    { key: 'Password', name: 'Password', result_type: 'password' },
    { key: 'Text Match', name: 'Text Match', result_type: 'text' },
    { key: 'Text Plain', name: 'Text Plain', result_type: 'text' },
    { key: 'URL', name: 'URL', result_type: 'select' },
    { key: 'Visible', name: 'Visible', result_type: 'bool' },
  ];

  // Insert global defaults (release_id = NULL)
  const insertConfig = db.prepare(`
    INSERT OR IGNORE INTO configuration_options
    (release_id, category, key, display_name, result_type, order_index)
    VALUES (NULL, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction((): void => {
    types.forEach((t, i) => insertConfig.run('type', t.key, t.name, null, i));
    actions.forEach((a, i) => insertConfig.run('action', a.key, a.name, a.result_type, i));
  });

  transaction();
};
