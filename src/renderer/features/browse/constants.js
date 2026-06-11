// Shared constants for the type browser.
export const VIEWS = [
  { id: 'list', icon: 'list', label: 'List' },
  { id: 'table', icon: 'table-2', label: 'Table' },
  { id: 'gallery', icon: 'layout-grid', label: 'Gallery' },
  { id: 'calendar', icon: 'calendar', label: 'Calendar' },
  { id: 'kanban', icon: 'square-kanban', label: 'Kanban' },
];

export const OPS_BY_KIND = (kind) => {
  if (kind === 'checkbox') return ['checked', 'unchecked'];
  if (kind === 'number') return ['equals', 'gt', 'lt', 'set', 'notset'];
  if (kind === 'date' || kind === 'daterange') return ['on', 'before', 'after', 'set', 'notset'];
  return ['contains', 'equals', 'set', 'notset'];
};

export const OP_LABEL = {
  contains: 'contains', equals: 'is', gt: '>', lt: '<', on: 'on', before: 'before',
  after: 'after', set: 'is set', notset: 'is empty', checked: 'is checked', unchecked: 'is unchecked',
};
