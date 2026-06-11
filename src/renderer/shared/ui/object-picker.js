// Object picker: search the vault, keyboard navigation, optional inline create.
import { el, debounce, overlays } from './dom.js';
import { icon } from '../icons.js';

export function objectPicker({ types, placeholder = 'Link an object…', allowCreate = true, onPick, anchorRect }) {
  const box = el('div', { class: 'picker', role: 'listbox' });
  const input = el('input', { class: 'picker-input', placeholder, 'aria-label': placeholder });
  const list = el('div', { class: 'picker-list' });
  box.append(input, list);

  if (anchorRect) {
    box.style.position = 'fixed';
    box.style.left = `${Math.min(anchorRect.left, window.innerWidth - 340)}px`;
    box.style.top = `${Math.min(anchorRect.bottom + 6, window.innerHeight - 320)}px`;
  } else {
    box.classList.add('picker-center');
  }

  let results = [];
  let active = 0;
  const close = () => { box.remove(); document.removeEventListener('mousedown', outside, true); };
  const outside = (e) => { if (!box.contains(e.target)) close(); };
  document.addEventListener('mousedown', outside, true);

  const renderList = () => {
    list.replaceChildren();
    results.forEach((r, i) => {
      const t = types.find((x) => x.id === r.type);
      const row = el('button', {
        class: `picker-row ${i === active ? 'active' : ''}`,
        role: 'option',
        onclick: () => { close(); onPick(r); },
      },
        el('span', { class: 'type-chip', style: `--chip:${t?.color || '#888'}` }, icon(t?.icon || 'file-text', 13)),
        el('span', { class: 'picker-title' }, r.title),
        el('span', { class: 'picker-type muted' }, t?.name || ''));
      list.append(row);
    });
    if (allowCreate && input.value.trim()) {
      const row = el('button', {
        class: `picker-row ${active === results.length ? 'active' : ''}`,
        onclick: async () => {
          const obj = await window.vault.objects.create({ typeId: 'note', title: input.value.trim() });
          close();
          onPick({ ...obj, created: true });
        },
      }, icon('plus', 14), el('span', { class: 'picker-title' }, `Create note "${input.value.trim()}"`));
      list.append(row);
    }
    if (!list.children.length)
      list.append(el('div', { class: 'picker-empty muted' }, 'Type to search your vault'));
  };

  const refresh = debounce(async () => {
    results = input.value.trim()
      ? await window.vault.search(input.value, {})
      : (await window.vault.objects.list({})).slice(0, 8);
    active = 0;
    renderList();
  }, 120);

  input.addEventListener('input', refresh);
  input.addEventListener('keydown', (e) => {
    const max = results.length - 1 + (allowCreate && input.value.trim() ? 1 : 0);
    if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, max); renderList(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); renderList(); }
    else if (e.key === 'Enter') { e.preventDefault(); list.children[active]?.click(); }
    else if (e.key === 'Escape') { e.stopPropagation(); close(); }
  });

  overlays().append(box);
  input.focus();
  refresh();
  return { close };
}
