// Home: greeting, quick capture, pinned objects, recents, and type counts.
import { el, skeleton, toast, fmtDate } from '../../shared/ui.js';
import { icon } from '../../shared/icons.js';
import { ctx, typeOf, navigate } from '../../shared/state.js';

export async function renderHome(content, _route, { setTopbar }) {
  setTopbar('Home');

  const hour = new Date().getHours();
  const greeting = hour < 5 ? 'Up late' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const captureInput = el('input', {
    class: 'capture-input', placeholder: "Capture a thought… it lands in today's Daily Note",
    'aria-label': 'Quick capture',
    onkeydown: async (e) => {
      if (e.key === 'Enter' && e.target.value.trim()) {
        await window.vault.daily.append(e.target.value.trim());
        e.target.value = '';
        toast('Captured to today');
      }
    },
  });

  const pinnedHost = el('div', { class: 'home-grid' }, skeleton(2));
  const recentHost = el('div', { class: 'obj-list' }, skeleton(6));
  const countsHost = el('div', { class: 'chip-row' });

  content.replaceChildren(el('div', { class: 'home-page' },
    el('h1', { class: 'home-greeting' }, `${greeting}.`),
    captureInput,
    el('div', { class: 'home-row' },
      el('button', { class: 'btn', onclick: async () => {
        const d = await window.vault.daily.ensure();
        navigate({ name: 'daily', id: d.id });
      } }, icon('calendar-days', 14), " Open today's note"),
      el('button', { class: 'btn', onclick: () => navigate({ name: 'graph' }) }, icon('waypoints', 14), ' Graph'),
      el('button', { class: 'btn', onclick: () => navigate({ name: 'tasks' }) }, icon('check-square', 14), ' Tasks')),
    el('h2', { class: 'home-h2' }, 'Pinned'),
    pinnedHost,
    el('h2', { class: 'home-h2' }, 'Recent'),
    recentHost,
    el('h2', { class: 'home-h2' }, 'Your vault'),
    countsHost,
  ));

  const objects = await window.vault.objects.list({});

  // pinned
  const pinned = objects.filter((o) => o.pinned);
  pinnedHost.replaceChildren(...(pinned.length
    ? pinned.map((o) => card(o))
    : [el('p', { class: 'muted small' }, 'Pin important objects from their page to keep them here.')]));

  // recent
  recentHost.replaceChildren(...objects.slice(0, 10).map((o) => {
    const t = typeOf(o.type);
    return el('button', { class: 'obj-row lift', onclick: () => navigate({ name: 'object', id: o.id }) },
      el('span', { class: 'type-chip', style: `--chip:${t?.color || '#888'}` }, icon(t?.icon || 'file-text', 13)),
      el('span', { class: 'obj-row-title truncate' }, o.title),
      el('span', { class: 'muted small' }, fmtDate(o.updated)));
  }));
  if (!objects.length)
    recentHost.replaceChildren(el('p', { class: 'muted small' }, 'Nothing here yet — capture your first thought above.'));

  // counts by type
  const counts = new Map();
  for (const o of objects) counts.set(o.type, (counts.get(o.type) || 0) + 1);
  countsHost.replaceChildren(...[...counts.entries()].map(([typeId, n]) => {
    const t = typeOf(typeId);
    return el('button', {
      class: 'chip', style: `--chip:${t?.color || '#888'}`,
      onclick: () => navigate({ name: 'browse', typeId }),
    }, `${t?.name || typeId} · ${n}`);
  }));

  function card(o) {
    const t = typeOf(o.type);
    return el('button', { class: 'card lift', onclick: () => navigate({ name: 'object', id: o.id }) },
      el('div', { class: 'card-head' },
        el('span', { class: 'type-chip', style: `--chip:${t?.color || '#888'}` }, icon(t?.icon || 'file-text', 13)),
        el('span', { class: 'card-title' }, o.title)),
      el('div', { class: 'muted small' }, fmtDate(o.updated)));
  }

  return () => {};
}
