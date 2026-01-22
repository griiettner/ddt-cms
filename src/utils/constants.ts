export const RELEASE_STATUSES = {
  OPEN: 'open',
  CLOSED: 'closed',
  ARCHIVED: 'archived',
} as const;

export type ReleaseStatusKey = keyof typeof RELEASE_STATUSES;
export type ReleaseStatusValue = (typeof RELEASE_STATUSES)[ReleaseStatusKey];

export interface ActionType {
  key: string;
  label: string;
}

export const ACTION_TYPES: ActionType[] = [
  { key: 'active', label: 'Active' },
  { key: 'click', label: 'Click' },
  { key: 'custom_select', label: 'Custom Select' },
  { key: 'options_match', label: 'Options Match' },
  { key: 'password', label: 'Password' },
  { key: 'text_match', label: 'Text Match' },
  { key: 'text_plain', label: 'Text Plain' },
  { key: 'url', label: 'URL' },
  { key: 'visible', label: 'Visible' },
];

export interface ResultType {
  key: string;
  label: string;
}

export const RESULT_TYPES: ResultType[] = [
  { key: '', label: 'None' },
  { key: 'text', label: 'Text' },
  { key: 'password', label: 'Password' },
  { key: 'checkbox', label: 'Checkbox' },
  { key: 'select', label: 'Select' },
  { key: 'array', label: 'Array' },
];
