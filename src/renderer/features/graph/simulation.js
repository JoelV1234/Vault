// Force layout: node/edge setup and one physics step over the graph context.
import { typeOf } from '../../shared/state.js';

/** Build positioned nodes and resolved edges from the raw graph data. */
export function buildGraphData(nodes, edges) {
  const deg = new Map();
  for (const e of edges) {
    deg.set(e.source, (deg.get(e.source) || 0) + 1);
    deg.set(e.target, (deg.get(e.target) || 0) + 1);
  }
  const N = nodes.map((n, i) => ({
    ...n,
    x: Math.cos((i / nodes.length) * Math.PI * 2) * 240 + (Math.random() - 0.5) * 80,
    y: Math.sin((i / nodes.length) * Math.PI * 2) * 240 + (Math.random() - 0.5) * 80,
    vx: 0, vy: 0,
    r: Math.min(16, 6 + Math.sqrt(deg.get(n.id) || 0) * 2.2),
    color: typeOf(n.type)?.color || '#888',
  }));
  const byId = new Map(N.map((n) => [n.id, n]));
  const E = edges
    .map((e) => ({ s: byId.get(e.source), t: byId.get(e.target) }))
    .filter((e) => e.s && e.t);
  return { N, E };
}

export function step(g) {
  const { N, E, visible } = g;
  // pairwise repulsion (fine for a few thousand nodes at this cadence)
  const k = 1800;
  for (let i = 0; i < N.length; i++) {
    const a = N[i];
    if (!visible(a)) continue;
    for (let j = i + 1; j < N.length; j++) {
      const b = N[j];
      if (!visible(b)) continue;
      let dx = a.x - b.x, dy = a.y - b.y;
      let d2 = dx * dx + dy * dy || 1;
      if (d2 > 90000) continue;
      const f = k / d2;
      const d = Math.sqrt(d2);
      dx /= d; dy /= d;
      a.vx += dx * f; a.vy += dy * f;
      b.vx -= dx * f; b.vy -= dy * f;
    }
  }
  // springs
  for (const { s, t } of E) {
    if (!visible(s) || !visible(t)) continue;
    const dx = t.x - s.x, dy = t.y - s.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const f = (d - 120) * 0.004;
    s.vx += (dx / d) * f; s.vy += (dy / d) * f;
    t.vx -= (dx / d) * f; t.vy -= (dy / d) * f;
  }
  // gravity + integrate
  for (const n of N) {
    if (!visible(n) || n === g.dragNode) { n.vx = n.vy = 0; continue; }
    n.vx -= n.x * 0.0015; n.vy -= n.y * 0.0015;
    n.vx *= 0.85; n.vy *= 0.85;
    n.x += n.vx * g.alpha * 8; n.y += n.vy * g.alpha * 8;
  }
  g.alpha = Math.max(0, g.alpha - 0.004);
}
