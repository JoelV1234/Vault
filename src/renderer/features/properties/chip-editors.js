// Chip-based property editors: multi-select, tags, and relations.
import { el, objectPicker, tagColor } from '../../shared/ui.js';
import { icon } from '../../shared/icons.js';
import { navigate } from '../../shared/state.js';

export function multiselectEditor(prop, value, onChange) {
  const selected = new Set(Array.isArray(value) ? value : []);
  const wrap = el('div', { class: 'chip-row' });
  for (const o of prop.options || []) {
    const chip = el('button', {
      class: `chip ${selected.has(o) ? 'chip-on' : ''}`,
      onclick: () => {
        selected.has(o) ? selected.delete(o) : selected.add(o);
        chip.classList.toggle('chip-on');
        onChange([...selected]);
      },
    }, o);
    wrap.append(chip);
  }
  return wrap;
}

export function tagsEditor(value, onChange) {
  const tags = Array.isArray(value) ? [...value] : [];
  const wrap = el('div', { class: 'chip-row' });
  const renderTags = () => {
    wrap.replaceChildren(
      ...tags.map((t, i) => el('span', { class: 'tag-chip', style: `--chip:${tagColor(t)}` },
        el('button', {
          class: 'tag-label', 'aria-label': `Open tag ${t}`,
          onclick: () => navigate({ name: 'tag', tag: t }),
        }, `#${t}`),
        el('button', {
          class: 'chip-x', 'aria-label': `Remove ${t}`,
          onclick: () => { tags.splice(i, 1); renderTags(); onChange([...tags]); },
        }, icon('x', 11)))),
      input);
  };
  const input = el('input', {
    class: 'chip-input', placeholder: '+ tag',
    onkeydown: (e) => {
      if (e.key === 'Enter' && e.target.value.trim()) {
        tags.push(e.target.value.trim());
        e.target.value = '';
        renderTags();
        onChange([...tags]);
      }
    },
  });
  renderTags();
  return wrap;
}

export function relationEditor(value, onChange, types) {
  const ids = Array.isArray(value) ? [...value] : value ? [value] : [];
  const wrap = el('div', { class: 'chip-row' });
  const renderRel = async () => {
    const chips = [];
    for (const id of ids) {
      const o = await window.vault.objects.get(id);
      if (!o) continue;
      chips.push(el('span', { class: 'chip chip-rel' },
        el('button', { class: 'chip-label', onclick: () => navigate({ name: 'object', id }) }, o.title),
        el('button', {
          class: 'chip-x', 'aria-label': `Unlink ${o.title}`,
          onclick: () => { ids.splice(ids.indexOf(id), 1); renderRel(); onChange([...ids]); },
        }, icon('x', 11))));
    }
    wrap.replaceChildren(...chips, addBtn);
  };
  const addBtn = el('button', {
    class: 'chip chip-add',
    onclick: () => objectPicker({
      types,
      anchorRect: addBtn.getBoundingClientRect(),
      onPick: (o) => {
        if (!ids.includes(o.id)) { ids.push(o.id); renderRel(); onChange([...ids]); }
      },
    }),
  }, icon('plus', 12), 'Add');
  renderRel();
  return wrap;
}
