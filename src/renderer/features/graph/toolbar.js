// Graph toolbar: node search, type filter chips, zoom/fit, PNG export.
import { el, toast } from '../../shared/ui.js';
import { icon } from '../../shared/icons.js';
import { ctx } from '../../shared/state.js';
import { fit, zoomBy } from './viewport.js';

export function buildToolbar(g, nodes) {
  const searchInput = el('input', {
    class: 'prop-input graph-search', placeholder: 'Find node…', 'aria-label': 'Find node',
    oninput: () => { g.searchQ = searchInput.value.trim().toLowerCase(); g.kick(); },
  });

  const typeChips = el('div', { class: 'chip-row graph-types' },
    ...ctx.types.filter((t) => nodes.some((n) => n.type === t.id)).map((t) =>
      el('button', {
        class: 'chip chip-on', style: `--chip:${t.color}`, 'aria-pressed': 'true',
        onclick: (e) => {
          const on = g.hiddenTypes.has(t.id);
          on ? g.hiddenTypes.delete(t.id) : g.hiddenTypes.add(t.id);
          e.currentTarget.classList.toggle('chip-on', on);
          e.currentTarget.setAttribute('aria-pressed', String(on));
          g.kick();
        },
      }, t.name)));

  return el('div', { class: 'graph-toolbar' },
    searchInput, typeChips,
    el('div', { class: 'flex-spacer' }),
    el('button', { class: 'icon-btn', 'aria-label': 'Zoom in', onclick: () => zoomBy(g, 1.25) }, icon('zoom-in', 16)),
    el('button', { class: 'icon-btn', 'aria-label': 'Zoom out', onclick: () => zoomBy(g, 0.8) }, icon('zoom-out', 16)),
    el('button', { class: 'icon-btn', 'aria-label': 'Fit to screen', onclick: () => { fit(g); g.kick(); } }, icon('maximize', 16)),
    el('button', {
      class: 'icon-btn', 'aria-label': 'Export as image',
      onclick: () => {
        const a = document.createElement('a');
        a.href = g.canvas.toDataURL('image/png');
        a.download = 'vault-graph.png';
        a.click();
        toast('Graph image downloaded');
      },
    }, icon('image-down', 16)));
}
