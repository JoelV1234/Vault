// Command palette (⌘K): actions + jump-to-object with keyboard navigation.
import { el, debounce } from '../../shared/ui.js';
import { icon } from '../../shared/icons.js';
import { ctx, typeOf, navigate, refreshSidebar } from '../../shared/state.js';
import { openSettings, openExport, openTypeEditor } from '../modals/modals.js';

let openPaletteEl = null;

export function togglePalette() {
  if (openPaletteEl) { closePalette(); return; }
  openPalette();
}

function closePalette() {
  openPaletteEl?.classList.remove('open');
  const node = openPaletteEl;
  setTimeout(() => node?.remove(), 150);
  openPaletteEl = null;
}

// subsequence fuzzy match, returns score or -1
function fuzzy(query, text) {
  const q = query.toLowerCase(), t = text.toLowerCase();
  if (!q) return 0;
  if (t.includes(q)) return 100 - t.indexOf(q);
  let qi = 0, score = 0;
  for (let i = 0; i < t.length && qi < q.length; i++)
    if (t[i] === q[qi]) { score += 2; qi++; }
  return qi === q.length ? score : -1;
}

function buildActions() {
  const actions = [
    { label: 'Go home', icon: 'home', run: () => navigate({ name: 'home' }) },
    { label: "Open today's daily note", icon: 'calendar-days', run: async () => {
      const d = await window.vault.daily.ensure();
      navigate({ name: 'daily', id: d.id });
    } },
    { label: 'Open graph', icon: 'waypoints', run: () => navigate({ name: 'graph' }) },
    { label: 'Open tasks', icon: 'check-square', run: () => navigate({ name: 'tasks' }) },
    { label: 'Browse tags', icon: 'tag', run: () => navigate({ name: 'tags' }) },
    { label: 'Search vault', icon: 'search', run: () => navigate({ name: 'search' }) },
    { label: 'Settings', icon: 'settings', run: () => openSettings() },
    { label: 'Export vault…', icon: 'share', run: () => openExport() },
    { label: 'New object type…', icon: 'layout-grid', run: () => openTypeEditor(null) },
  ];
  for (const t of ctx.types.filter((t) => t.id !== 'daily')) {
    actions.push({
      label: `New ${t.name}`, icon: t.icon, color: t.color,
      run: async () => {
        const o = await window.vault.objects.create({ typeId: t.id, title: `New ${t.name}` });
        refreshSidebar();
        navigate({ name: 'object', id: o.id });
      },
    });
  }
  return actions;
}

function openPalette() {
  const actions = buildActions();
  const input = el('input', {
    class: 'palette-input', placeholder: 'Type a command or search…',
    'aria-label': 'Command palette',
  });
  const list = el('div', { class: 'palette-list', role: 'listbox' });
  const box = el('div', { class: 'palette', role: 'dialog', 'aria-label': 'Command palette' },
    el('div', { class: 'palette-input-row' }, icon('search', 16), input),
    list,
    el('div', { class: 'palette-footer' },
      el('span', {}, el('kbd', { class: 'kbd' }, '↑'), el('kbd', { class: 'kbd' }, '↓'), ' navigate'),
      el('span', {}, el('kbd', { class: 'kbd' }, '↵'), ' open'),
      el('span', {}, el('kbd', { class: 'kbd' }, 'esc'), ' close')));
  const backdrop = el('div', { class: 'backdrop backdrop-palette' }, box);
  backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) closePalette(); });

  let rows = [];
  let active = 0;

  const renderRows = () => {
    list.replaceChildren();
    rows.forEach((r, i) => {
      if (r.section) list.append(el('div', { class: 'palette-group' }, r.section));
      const rowEl = el('button', {
        class: `palette-row ${i === active ? 'active' : ''}`, role: 'option',
        'aria-selected': String(i === active),
        onclick: () => { closePalette(); r.run(); },
      },
        r.color
          ? el('span', { class: 'type-chip', style: `--chip:${r.color}` }, icon(r.icon, 12))
          : icon(r.icon || 'corner-down-right', 15),
        el('span', { class: 'palette-label truncate' }, r.label),
        r.hint ? el('span', { class: 'palette-hint muted small' }, r.hint) : null);
      list.append(rowEl);
      if (i === active) requestAnimationFrame(() => rowEl.scrollIntoView({ block: 'nearest' }));
    });
    if (!rows.length) list.append(el('div', { class: 'picker-empty muted' }, 'No matches'));
  };

  const update = debounce(async () => {
    const q = input.value.trim();
    const matchedActions = actions
      .map((a) => ({ ...a, score: fuzzy(q, a.label) }))
      .filter((a) => a.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, q ? 5 : 8)
      .map((a, i) => ({ ...a, section: i === 0 ? 'Actions' : null }));

    let objectRows = [];
    if (q) {
      const found = await window.vault.search(q, {});
      objectRows = found.slice(0, 8).map((o, i) => {
        const t = typeOf(o.type);
        return {
          section: i === 0 ? 'Objects' : null,
          label: o.title, icon: t?.icon || 'file-text', color: t?.color, hint: t?.name,
          run: () => navigate({ name: 'object', id: o.id }),
        };
      });
    } else {
      const recent = (await window.vault.objects.list({})).slice(0, 5);
      objectRows = recent.map((o, i) => {
        const t = typeOf(o.type);
        return {
          section: i === 0 ? 'Recent' : null,
          label: o.title, icon: t?.icon || 'file-text', color: t?.color, hint: t?.name,
          run: () => navigate({ name: 'object', id: o.id }),
        };
      });
    }
    rows = [...objectRows, ...matchedActions];
    active = 0;
    renderRows();
  }, 100);

  input.addEventListener('input', update);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, rows.length - 1); renderRows(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); renderRows(); }
    else if (e.key === 'Enter') { e.preventDefault(); const r = rows[active]; if (r) { closePalette(); r.run(); } }
    else if (e.key === 'Escape') { e.stopPropagation(); closePalette(); }
  });

  document.getElementById('overlays').append(backdrop);
  openPaletteEl = backdrop;
  requestAnimationFrame(() => backdrop.classList.add('open'));
  input.focus();
  update.flush();
}
