// Sub-toolbar: view switcher + sort direction.
// Title, create button, and settings are in browse.js header row.
import { el } from '../../shared/ui.js';
import { icon } from '../../shared/icons.js';
import { VIEWS } from './constants.js';

export function buildSubToolbar(b) {
  const { type, state } = b;

  const hasDate = (type.props || []).some((p) => p.kind === 'date' || p.kind === 'daterange');
  const hasSelect = (type.props || []).some((p) => p.kind === 'select');
  const activeViews = VIEWS.filter((v) => {
    if (v.id === 'calendar') return hasDate;
    if (v.id === 'kanban') return hasSelect;
    return true;
  });

  const viewBtns = activeViews.map((v) => el('button', {
    class: 'icon-btn view-btn', dataset: { view: v.id }, title: v.label,
    'aria-label': `${v.label} view`,
    onclick: () => {
      state.view = v.id;
      if (b.route) b.route.view = v.id; // survives app-wide re-renders
      b.renderBody();
    },
  }, icon(v.icon, 16)));

  const dirBtn = el('button', {
    class: 'icon-btn', title: 'Sort direction',
    onclick: () => {
      state.sort.dir = state.sort.dir === 'asc' ? 'desc' : 'asc';
      dirBtn.replaceChildren(icon(state.sort.dir === 'asc' ? 'arrow-up-narrow-wide' : 'arrow-down-wide-narrow', 16));
      b.renderBody();
    },
  }, icon('arrow-down-wide-narrow', 16));

  return el('div', { class: 'browse-sub-toolbar' },
    el('div', { class: 'view-switch', role: 'group', 'aria-label': 'View type' }, ...viewBtns),
    el('div', { class: 'flex-spacer' }),
    dirBtn);
}
