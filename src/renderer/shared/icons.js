// Lucide icon wrapper. We build the <svg> ourselves from lucide's icon node
// data so we stay independent of lucide's createElement signature.
import * as lucide from 'lucide';

const SVG_NS = 'http://www.w3.org/2000/svg';

// kebab-case -> PascalCase ("file-text" -> "FileText")
const pascal = (name) => name.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase());

export function icon(name, size = 18, cls = '') {
  const node = lucide[pascal(name)] || lucide.FileText;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  if (cls) svg.setAttribute('class', cls);
  for (const [tag, attrs] of node) {
    const child = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) child.setAttribute(k, v);
    svg.appendChild(child);
  }
  return svg;
}

// Curated choices for custom Object Types.
export const ICON_CHOICES = [
  'file-text', 'sticky-note', 'notebook', 'book-open', 'library', 'graduation-cap',
  'user', 'users', 'contact', 'heart', 'star', 'bookmark',
  'rocket', 'target', 'flag', 'trophy', 'briefcase', 'building',
  'check-square', 'list-todo', 'calendar', 'calendar-days', 'clock', 'alarm-clock',
  'lightbulb', 'brain', 'sparkles', 'zap', 'flame', 'sun',
  'globe', 'link', 'image', 'camera', 'film', 'music',
  'quote', 'message-circle', 'mail', 'map-pin', 'home', 'archive',
  'folder', 'tag', 'paperclip', 'pen-tool', 'palette', 'wrench',
];

export const COLOR_CHOICES = [
  '#818cf8', '#6366f1', '#a78bfa', '#c084fc', '#f472b6', '#fb7185',
  '#f87171', '#fb923c', '#f59e0b', '#facc15', '#a3e635', '#4ade80',
  '#34d399', '#2dd4bf', '#22d3ee', '#60a5fa', '#94a3b8', '#9ca3af',
];
