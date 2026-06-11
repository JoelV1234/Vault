// Property kinds a type can declare (Capacities-style).
// Legacy kinds (date, daterange, url, email, textarea) still render via
// propEditor for older vaults, but are no longer offered for new properties.
export const PROP_KINDS = [
  { id: 'text', label: 'Text' },
  { id: 'cover', label: 'Cover Image' },
  { id: 'number', label: 'Number' },
  { id: 'checkbox', label: 'Checkbox' },
  { id: 'blocks', label: 'Blocks' },
  { id: 'datetime', label: 'Datetime' },
  { id: 'select', label: 'Label' },
  { id: 'multiselect', label: 'Label (multi-select)' },
  { id: 'relation', label: 'Object' },
  { id: 'tags', label: 'Tags' },
];

export const KIND_LABEL = (kind) =>
  PROP_KINDS.find((k) => k.id === kind)?.label
    || { date: 'Date', daterange: 'Date range', url: 'URL', email: 'Email', textarea: 'Multi-line text' }[kind]
    || kind;
