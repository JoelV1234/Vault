// Browse toolbar: view switch, search, sort controls, create button.
// Assigns b.sortSel / b.createBtn so renderBody can retarget them per mode.
import { el } from '../../shared/ui.js';
import { icon } from '../../shared/icons.js';
import { VIEWS } from './constants.js';
import { openTypeEditor } from '../modals/modals.js';

export function buildToolbar(b) {
  const { type, collection, state } = b;

  const viewBtns = VIEWS.map((v) => el('button', {
    class: 'icon-btn view-btn', dataset: { view: v.id }, 'aria-label': `${v.label} view`, title: v.label,
    onclick: () => { state.view = v.id; b.renderBody(); },
  }, icon(v.icon, 16)));

  const searchInp = el('input', {
    class: 'prop-input search-input',
    type: 'search',
    placeholder: `Search...`,
    value: b.searchQuery,
    oninput: (e) => {
      b.searchQuery = e.target.value;
      b.renderBody();
    }
  });

  b.sortSel = el('select', {
    class: 'prop-input sort-sel', 'aria-label': 'Sort by',
    onchange: (e) => { state.sort.key = e.target.value; b.renderBody(); },
  });

  const dirBtn = el('button', {
    class: 'icon-btn', 'aria-label': 'Toggle sort direction',
    onclick: () => {
      state.sort.dir = state.sort.dir === 'asc' ? 'desc' : 'asc';
      dirBtn.replaceChildren(icon(state.sort.dir === 'asc' ? 'arrow-up-narrow-wide' : 'arrow-down-wide-narrow', 16));
      b.renderBody();
    },
  }, icon(state.sort.dir === 'asc' ? 'arrow-up-narrow-wide' : 'arrow-down-wide-narrow', 16));

  b.createBtn = el('button', { class: 'btn btn-primary btn-small' });

  return el('div', { class: 'browse-toolbar' },
    el('div', { class: 'browse-title' },
      el('span', { class: 'type-chip type-chip-lg', style: `--chip:${type.color}` }, icon(type.icon, 15)),
      el('h1', {}, collection ? collection.name : type.name),
      collection ? el('span', { class: 'muted small' }, type.name) : null),
    el('div', { class: 'view-switch', role: 'group', 'aria-label': 'View type' }, viewBtns),
    searchInp,
    b.sortSel, dirBtn,
    el('div', { class: 'flex-spacer' }),
    el('button', {
      class: 'icon-btn', 'aria-label': 'Customize object type', title: 'Customize type',
      onclick: () => openTypeEditor(type),
    }, icon('settings-2', 16)),
    b.createBtn);
}
