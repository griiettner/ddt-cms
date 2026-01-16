export const RELEASE_STATUSES = {
  OPEN: 'open',
  CLOSED: 'closed',
  ARCHIVED: 'archived',
};

export const ACTION_TYPES = [
  { key: 'active', label: 'Active' },
  { key: 'click', label: 'Click' },
  { key: 'custom_select', label: 'Custom Select' },
  { key: 'options_match', label: 'Options Match' },
  { key: 'text_match', label: 'Text Match' },
  { key: 'text_plain', label: 'Text Plain' },
  { key: 'url', label: 'URL' },
  { key: 'visible', label: 'Visible' },
];

export const RESULT_TYPES = [
  { key: '', label: 'None' },
  { key: 'text', label: 'Text' },
  { key: 'checkbox', label: 'Checkbox' },
  { key: 'select', label: 'Select' },
  { key: 'array', label: 'Array' },
];
