// Canvas renderer: curved edges, glowing nodes, labels, hover/search dimming.
export function draw(g) {
  const { canvas, cx2, N, E, visible, hover, searchQ, scale, ox, oy } = g;
  const rect = canvas.getBoundingClientRect();
  cx2.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  cx2.clearRect(0, 0, rect.width, rect.height);
  cx2.save();
  cx2.translate(ox, oy);
  cx2.scale(scale, scale);

  const styles = getComputedStyle(document.documentElement);
  const edgeColor = styles.getPropertyValue('--graph-edge').trim() || 'rgba(140,140,150,0.25)';
  const labelColor = styles.getPropertyValue('--text').trim();

  const neighbors = new Set();
  if (hover) {
    neighbors.add(hover);
    for (const { s, t } of E) {
      if (s === hover) neighbors.add(t);
      if (t === hover) neighbors.add(s);
    }
  }

  // curved edges
  cx2.lineWidth = 1 / scale + 0.4;
  for (const { s, t } of E) {
    if (!visible(s) || !visible(t)) continue;
    const dim = hover && !(neighbors.has(s) && neighbors.has(t));
    cx2.strokeStyle = edgeColor;
    cx2.globalAlpha = dim ? 0.15 : 0.8;
    const mx = (s.x + t.x) / 2 - (t.y - s.y) * 0.12;
    const my = (s.y + t.y) / 2 + (t.x - s.x) * 0.12;
    cx2.beginPath();
    cx2.moveTo(s.x, s.y);
    cx2.quadraticCurveTo(mx, my, t.x, t.y);
    cx2.stroke();
  }

  // nodes
  for (const n of N) {
    if (!visible(n)) continue;
    const matches = searchQ && n.title.toLowerCase().includes(searchQ);
    const dim = (hover && !neighbors.has(n)) || (searchQ && !matches);
    cx2.globalAlpha = dim ? 0.18 : 1;
    cx2.shadowColor = n.color;
    cx2.shadowBlur = (matches || n === hover ? 22 : 10) * scale;
    cx2.fillStyle = n.color;
    cx2.beginPath();
    cx2.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    cx2.fill();
    cx2.shadowBlur = 0;

    if (scale > 0.45 || n === hover || matches) {
      cx2.font = `${11 / Math.max(scale, 0.7)}px Inter, system-ui, sans-serif`;
      cx2.fillStyle = labelColor;
      cx2.textAlign = 'center';
      cx2.fillText(n.title.slice(0, 28), n.x, n.y + n.r + 13 / Math.max(scale, 0.7));
    }
  }
  cx2.globalAlpha = 1;
  cx2.restore();
}
