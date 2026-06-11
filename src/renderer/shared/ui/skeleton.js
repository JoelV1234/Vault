// Skeleton loading placeholders.
import { el } from './dom.js';

export function skeleton(lines = 5) {
  const wrap = el('div', { class: 'skeleton-group', 'aria-hidden': 'true' });
  for (let i = 0; i < lines; i++) {
    const w = [92, 60, 74, 40, 84, 66][i % 6];
    wrap.append(el('div', { class: 'skeleton', style: `width:${w}%` }));
  }
  return wrap;
}
