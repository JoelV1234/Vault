// Pointer/wheel interactions: hover, node drag, panning, click-to-open, zoom.
import { navigate } from '../../shared/state.js';
import { toWorld, nodeAt, zoomAt } from './viewport.js';

export function bindInteractions(g) {
  const { canvas } = g;
  let moved = false;

  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    moved = false;
    const n = nodeAt(g, sx, sy);
    if (n) g.dragNode = n;
    else g.panning = { sx, sy, ox: g.ox, oy: g.oy };
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    if (g.dragNode) {
      [g.dragNode.x, g.dragNode.y] = toWorld(g, sx, sy);
      moved = true;
      g.kick();
    } else if (g.panning) {
      g.ox = g.panning.ox + (sx - g.panning.sx);
      g.oy = g.panning.oy + (sy - g.panning.sy);
      moved = true;
    } else {
      const h = nodeAt(g, sx, sy);
      if (h !== g.hover) { g.hover = h; canvas.style.cursor = h ? 'pointer' : 'grab'; }
    }
  });

  canvas.addEventListener('pointerup', () => {
    if (g.dragNode && !moved) navigate({ name: 'object', id: g.dragNode.id });
    g.dragNode = null;
    g.panning = null;
  });

  canvas.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    zoomAt(g, e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1.1 : 0.9);
  }, { passive: false });
}
