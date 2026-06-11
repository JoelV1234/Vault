// Viewport math: canvas sizing, fit-to-screen, zoom, screen<->world mapping.
// world->screen: screen = world * scale + offset (g.ox / g.oy)

export function resize(g) {
  const rect = g.canvas.getBoundingClientRect();
  g.canvas.width = rect.width * devicePixelRatio;
  g.canvas.height = rect.height * devicePixelRatio;
}

export function fit(g) {
  const vis = g.N.filter(g.visible);
  if (!vis.length) return;
  const xs = vis.map((n) => n.x), ys = vis.map((n) => n.y);
  const minX = Math.min(...xs) - 60, maxX = Math.max(...xs) + 60;
  const minY = Math.min(...ys) - 60, maxY = Math.max(...ys) + 60;
  const rect = g.canvas.getBoundingClientRect();
  g.scale = Math.min(2, Math.min(rect.width / (maxX - minX), rect.height / (maxY - minY)));
  g.ox = rect.width / 2 - ((minX + maxX) / 2) * g.scale;
  g.oy = rect.height / 2 - ((minY + maxY) / 2) * g.scale;
}

export function zoomBy(g, f) {
  const rect = g.canvas.getBoundingClientRect();
  zoomAt(g, rect.width / 2, rect.height / 2, f);
  g.kick();
}

export function zoomAt(g, sx, sy, f) {
  const next = Math.max(0.1, Math.min(4, g.scale * f));
  g.ox = sx - ((sx - g.ox) / g.scale) * next;
  g.oy = sy - ((sy - g.oy) / g.scale) * next;
  g.scale = next;
}

export const toWorld = (g, sx, sy) => [(sx - g.ox) / g.scale, (sy - g.oy) / g.scale];

export function nodeAt(g, sx, sy) {
  const [wx, wy] = toWorld(g, sx, sy);
  for (let i = g.N.length - 1; i >= 0; i--) {
    const n = g.N[i];
    if (!g.visible(n)) continue;
    const dx = wx - n.x, dy = wy - n.y;
    if (dx * dx + dy * dy <= (n.r + 4) ** 2) return n;
  }
  return null;
}
