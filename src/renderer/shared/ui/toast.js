// Transient toast notifications (bottom of the screen).
import { el, overlays } from './dom.js';

export function toast(message, kind = 'info') {
  let host = document.querySelector('.toasts');
  if (!host) { host = el('div', { class: 'toasts', 'aria-live': 'polite' }); overlays().append(host); }
  const t = el('div', { class: `toast toast-${kind}` }, message);
  host.append(t);
  requestAnimationFrame(() => t.classList.add('open'));
  setTimeout(() => { t.classList.remove('open'); setTimeout(() => t.remove(), 250); }, 2600);
}
