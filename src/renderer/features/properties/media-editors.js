// Editors for media/rich kinds: cover image and block content.
import { el } from '../../shared/ui.js';
import { icon } from '../../shared/icons.js';

/** Cover image: stores { abs, name } from an imported asset. */
export function coverEditor(value, onChange) {
  const wrap = el('div', { class: 'cover-edit' });
  const render = (v) => {
    wrap.replaceChildren(
      v?.abs
        ? el('div', { class: 'cover-edit-row' },
          el('img', { class: 'cover-thumb', src: `file://${v.abs}`, alt: v.name || 'Cover' }),
          el('span', { class: 'muted small truncate' }, v.name || ''),
          el('button', {
            class: 'icon-btn', 'aria-label': 'Remove cover image',
            onclick: () => { render(null); onChange(null); },
          }, icon('x', 14)))
        : el('button', {
          class: 'btn btn-small',
          onclick: async () => {
            const asset = await window.vault.importAsset();
            if (!asset) return;
            const v2 = { abs: asset.abs, name: asset.name };
            render(v2);
            onChange(v2);
          },
        }, icon('image-plus', 14), ' Choose image'));
  };
  render(value);
  return wrap;
}

/** Blocks: markdown content edited in a tall textarea. */
export function blocksEditor(value, onChange) {
  return el('textarea', {
    class: 'prop-input prop-blocks', rows: 6,
    placeholder: 'Write block content (markdown)…',
    value: value || '',
    onchange: (e) => onChange(e.target.value || null),
  });
}
