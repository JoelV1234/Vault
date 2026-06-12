// Shared constants for the type browser.
export const VIEWS = [
  { id: 'list', icon: 'list', label: 'List' },
  { id: 'table', icon: 'table-2', label: 'Table' },
  { id: 'gallery', icon: 'layout-grid', label: 'Gallery' },
  { id: 'kanban', icon: 'square-kanban', label: 'Kanban' },
];

export const OPS_BY_KIND = (kind) => {
  if (kind === 'checkbox') return ['is_checked', 'is_unchecked'];
  if (kind === 'number') return ['equals', 'not_equals', 'gt', 'lt', 'is_empty', 'is_not_empty'];
  if (kind === 'date' || kind === 'daterange' || kind === 'datetime')
    return ['on', 'before', 'after', 'is_empty', 'is_not_empty'];
  if (kind === 'select' || kind === 'multiselect' || kind === 'tags')
    return ['includes', 'not_includes', 'is_empty', 'is_not_empty'];
  return ['includes', 'not_includes', 'is', 'is_not', 'starts_with', 'ends_with', 'is_empty', 'is_not_empty'];
};

export const OP_LABEL = {
  includes: 'includes', not_includes: 'does not include',
  is: 'is', is_not: 'is not',
  starts_with: 'starts with', ends_with: 'ends with',
  is_empty: 'is empty', is_not_empty: 'is not empty',
  equals: 'equals', not_equals: 'does not equal',
  gt: 'greater than', lt: 'less than',
  on: 'is on', before: 'is before', after: 'is after',
  is_checked: 'is checked', is_unchecked: 'is unchecked',
};
