// Contextual side panel: Links / Info tabs.
// (Properties moved onto the object page itself as Capacities-style rows.)
import { el, toast, fmtDateTime } from '../../shared/ui.js';
import { icon } from '../../shared/icons.js';
import { typeOf, navigate } from '../../shared/state.js';
import { openHistory } from '../modals/modals.js';

export function renderSidePanel(obj, type, route) {
  const panel = document.getElementById('sidepanel');
  panel.hidden = false;

  const tabs = ['Links', 'Info'];
  let current = 'Links';
  const tabBar = el('div', { class: 'panel-tabs', role: 'tablist' });
  const bodyHost = el('div', { class: 'panel-body' });

  const renderTab = async () => {
    tabBar.replaceChildren(...tabs.map((t) =>
      el('button', {
        class: `panel-tab ${t === current ? 'active' : ''}`,
        role: 'tab', 'aria-selected': String(t === current),
        onclick: () => { current = t; renderTab(); },
      }, t)));

    if (current === 'Links') bodyHost.replaceChildren(await linksTab(obj));
    else bodyHost.replaceChildren(infoTab(obj, route));
  };

  renderTab();
  panel.replaceChildren(
    el('div', { class: 'panel-head' },
      tabBar,
      el('button', {
        class: 'icon-btn', 'aria-label': 'Close panel',
        onclick: () => { panel.hidden = true; },
      }, icon('x', 15))),
    bodyHost);
}

async function linksTab(obj) {
  const { linked, unlinked } = await window.vault.objects.backlinks(obj.id);
  const section = (title, items, emptyMsg) => el('div', { class: 'panel-section' },
    el('h3', { class: 'panel-heading' }, title, el('span', { class: 'count-badge' }, String(items.length))),
    items.length
      ? items.map((o) => {
        const t = typeOf(o.type);
        return el('button', { class: 'backlink-row', onclick: () => navigate({ name: 'object', id: o.id }) },
          el('span', { class: 'type-chip', style: `--chip:${t?.color || '#888'}` }, icon(t?.icon || 'file-text', 12)),
          el('div', { class: 'backlink-text' },
            el('div', { class: 'backlink-title truncate' }, o.title),
            o.snippet ? el('div', { class: 'backlink-snippet muted' }, o.snippet) : null));
      })
      : el('p', { class: 'muted small' }, emptyMsg));

  return el('div', {},
    section('Backlinks', linked, 'Nothing links here yet. Mention this object with @ elsewhere.'),
    section('Unlinked mentions', unlinked, 'No other object mentions this title.'));
}

function infoTab(obj, route) {
  return el('div', { class: 'panel-section' },
    el('div', { class: 'info-row' }, el('span', { class: 'muted' }, 'Created'), el('span', {}, fmtDateTime(obj.created))),
    el('div', { class: 'info-row' }, el('span', { class: 'muted' }, 'Updated'), el('span', {}, fmtDateTime(obj.updated))),
    el('div', { class: 'info-row' }, el('span', { class: 'muted' }, 'ID'), el('code', { class: 'small' }, obj.id.slice(0, 8))),
    el('hr', { class: 'sep' }),
    el('button', { class: 'btn btn-small', onclick: () => openHistory(obj.id, () => navigate({ ...route }, { push: false })) },
      'Version history'),
    el('button', { class: 'btn btn-small', onclick: async () => {
      const res = await window.vault.exportVault('pdf');
      if (res) toast(`Saved ${res.file}`);
    } }, 'Export as PDF'));
}
