// Interactive 2D graph of the whole vault: custom canvas force layout with
// zoom/pan, node drag, type filtering, search highlight, and PNG export.
// Orchestrates the simulation, viewport, draw, and interaction modules
// around a shared graph-context object (`g`).
import { el } from '../../shared/ui.js';
import { icon } from '../../shared/icons.js';
import { buildGraphData, step } from './simulation.js';
import { resize, fit } from './viewport.js';
import { draw } from './draw.js';
import { bindInteractions } from './interactions.js';
import { buildToolbar } from './toolbar.js';

export async function renderGraph(content, _route, { setTopbar }) {
  setTopbar('Graph');
  document.getElementById('sidepanel').hidden = true;

  const { nodes, edges } = await window.vault.graph();
  const wrap = el('div', { class: 'graph-wrap' });
  const canvas = el('canvas', { class: 'graph-canvas', 'aria-label': 'Knowledge graph' });

  const { N, E } = buildGraphData(nodes, edges);
  const hiddenTypes = new Set();

  // Graph context shared by all graph modules.
  const g = {
    canvas,
    cx2: canvas.getContext('2d'),
    N, E,
    hiddenTypes,
    scale: 1, ox: 0, oy: 0, // world->screen: screen = world*scale + offset
    alpha: 1,
    searchQ: '',
    hover: null, dragNode: null, panning: null,
    visible: (n) => !hiddenTypes.has(n.type),
    kick: () => { g.alpha = Math.max(g.alpha, 0.25); },
  };

  wrap.append(buildToolbar(g, nodes), canvas);
  content.replaceChildren(wrap);

  if (!nodes.length) {
    wrap.append(el('div', { class: 'empty-state graph-empty' }, icon('waypoints', 26),
      el('p', { class: 'muted' }, 'Create objects and link them with @ to grow your graph.')));
    return () => {};
  }

  let destroyed = false;
  let raf = 0;
  function loop() {
    if (destroyed) return;
    if (g.alpha > 0.01) step(g);
    draw(g);
    raf = requestAnimationFrame(loop);
  }

  bindInteractions(g);

  const ro = new ResizeObserver(() => { resize(g); });
  ro.observe(canvas);
  resize(g);
  // settle a bit before the first fit so it frames the final layout roughly
  for (let i = 0; i < 120; i++) step(g);
  g.alpha = 0.3;
  fit(g);
  loop();

  return () => {
    destroyed = true;
    cancelAnimationFrame(raf);
    ro.disconnect();
  };
}
