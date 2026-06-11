// Anchored dropdown menu, dismissed on outside click.
import { el, overlays } from './dom.js';
import { icon } from '../icons.js';

export function dropdown(anchor, items) {
  document.querySelector('.menu')?.remove();
  const rect = anchor.getBoundingClientRect();
  const menu = el('div', { class: 'menu', role: 'menu' });
  for (const item of items) {
    if (item === '-') { menu.append(el('div', { class: 'menu-sep' })); continue; }
    menu.append(el('button', {
      class: `menu-item ${item.danger ? 'danger' : ''}`,
      role: 'menuitem',
      onclick: () => { menu.remove(); item.onClick(); },
    }, item.icon ? icon(item.icon, 16) : '', el('span', {}, item.label)));
  }
  menu.style.top = `${rect.bottom + 6}px`;
  menu.style.left = `${Math.min(rect.left, window.innerWidth - 240)}px`;
  const dismiss = (e) => {
    if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('mousedown', dismiss, true); }
  };
  document.addEventListener('mousedown', dismiss, true);
  overlays().append(menu);
  return menu;
}
